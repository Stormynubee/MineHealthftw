import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

// ── Water Reminder — talks to Service Worker for REAL phone notifications ──
const WATER_REMINDER_KEY = "minehealth_water_reminder";

// ── Morning Alarm — stored in localStorage, sent to SW ──
const ALARM_ENABLED_KEY = "minehealth_alarm_enabled";
const ALARM_TIME_KEY = "minehealth_alarm_time";

export function getWaterReminderActive() {
  return localStorage.getItem(WATER_REMINDER_KEY) === "true";
}

export function setWaterReminderActive(val) {
  localStorage.setItem(WATER_REMINDER_KEY, val ? "true" : "false");
  // Tell the Service Worker to start/stop
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: val ? "START_WATER_REMINDER" : "STOP_WATER_REMINDER",
    });
  }
  // Dispatch event for UI sync
  window.dispatchEvent(new CustomEvent("water-reminder-change", { detail: val }));
}

export function getMorningAlarmEnabled() {
  return localStorage.getItem(ALARM_ENABLED_KEY) === "true";
}

export function getMorningAlarmTime() {
  return localStorage.getItem(ALARM_TIME_KEY) || "06:00";
}

export function setMorningAlarm(enabled, time) {
  localStorage.setItem(ALARM_ENABLED_KEY, enabled ? "true" : "false");
  if (time) localStorage.setItem(ALARM_TIME_KEY, time);
  const alarmTime = time || getMorningAlarmTime();
  // Tell the Service Worker
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SET_MORNING_ALARM",
      time: alarmTime,
      enabled: enabled,
    });
  }
  // Dispatch event for UI sync
  window.dispatchEvent(new CustomEvent("morning-alarm-change", { detail: { enabled, time: alarmTime } }));
}

// Requests permission on mount, then polls every 60s to fire
// browser notifications for meds whose scheduled time has arrived
// today and haven't been marked taken yet.
export default function NotificationManager() {
  const firedRef = useRef(new Set()); // ids fired today
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // ── Request notification permission ──
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        setPermission(p);
        if (p === "granted") toast.success("Notifications enabled. Blocky will nudge you.");
      });
    }
  }, []);

  // ── On mount: resume water reminder + morning alarm if they were active ──
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const resumeAll = async () => {
      // Wait for SW to be ready
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) return;

      // Resume water reminders
      if (getWaterReminderActive()) {
        reg.active.postMessage({ type: "START_WATER_REMINDER" });
      }

      // Resume morning alarm
      if (getMorningAlarmEnabled()) {
        reg.active.postMessage({
          type: "SET_MORNING_ALARM",
          time: getMorningAlarmTime(),
          enabled: true,
        });
      }
    };

    resumeAll();

    // Listen for SW messages
    const handler = (e) => {
      if (e.data?.type === "WATER_REMINDER_STARTED") {
        toast.success("💧 Water reminders active — notifications will appear even when app is closed!");
      }
      if (e.data?.type === "WATER_REMINDER_STOPPED") {
        toast.info("Water reminders stopped.");
      }
      if (e.data?.type === "MORNING_ALARM_SET") {
        if (e.data.enabled) {
          toast.success(`⏰ Morning alarm set for ${e.data.time} IST`);
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  // ── Med + Food reminder (existing logic) ──
  useEffect(() => {
    if (permission !== "granted") return;
    const resetKey = new Date().toDateString();
    const tick = async () => {
      try {
        const r = await api.get("/meds");
        const now = new Date();
        const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        r.data.forEach((m) => {
          const key = `${resetKey}-${m.id}`;
          if (m.taken_today) return;
          if (m.time === cur && !firedRef.current.has(key)) {
            firedRef.current.add(key);
            // Use SW notification for phone notification bar
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification("⛏️ Blocky: Medicine Time", {
                  body: `Take ${m.name}${m.notes ? ` — ${m.notes}` : ""}.`,
                  icon: "/icon-192.png",
                  badge: "/favicon-32.png",
                  tag: `med-${m.id}`,
                  vibrate: [200, 100, 200, 100, 200],
                  requireInteraction: true,
                });
              });
            }
            toast.info(`Med reminder: ${m.name}`);
          }
        });

        // Food buddy nudges - 8am, 1pm, 7pm
        const foodTimes = [
          { t: "08:00", meal: "breakfast" },
          { t: "13:00", meal: "lunch" },
          { t: "19:00", meal: "dinner" },
        ];
        foodTimes.forEach((f) => {
          const k = `${resetKey}-food-${f.t}`;
          if (cur === f.t && !firedRef.current.has(k)) {
            firedRef.current.add(k);
            if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification("🍽️ Blocky: Food Time", {
                  body: `Time for ${f.meal}! No oil, no sugar. Stick to the rules, legend.`,
                  icon: "/icon-192.png",
                  badge: "/favicon-32.png",
                  tag: `food-${f.t}`,
                  vibrate: [200, 100, 200],
                });
              });
            }
          }
        });
      } catch (e) {
        // silent
      }
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [permission]);

  return null;
}
