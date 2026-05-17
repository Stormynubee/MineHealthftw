/* Life Blocks Service Worker — network-first with offline fallback + water reminders. */
const CACHE = 'lifeblocks-v2';
const APP_SHELL = [
  '/',
  '/app',
  '/profile',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

/* ── 35 creative Minecraft-themed water reminders ── */
const WATER_MESSAGES = [
  { title: "💧 Blocky: Hydration Check!", body: "Your health bar is dropping! Drink a water bucket NOW, legend." },
  { title: "🪣 Blocky: Water Bucket Time!", body: "Even Steve drinks water between mining sessions. Go grab a glass!" },
  { title: "⛏️ Blocky: Mine Some H₂O!", body: "You can't craft greatness on an empty water bar. Drink up!" },
  { title: "🌊 Blocky: Hydrate or Despawn!", body: "Dehydration = Wither effect IRL. One glass of water, right now." },
  { title: "💎 Blocky: Diamond-Tier Hydration!", body: "Water is the real diamond. Your brain needs it to stay sharp for JEE!" },
  { title: "🧊 Blocky: Ice Block Reminder!", body: "Cool down your system — drink a full glass of water. No excuses!" },
  { title: "🏥 Blocky: Health Regen!", body: "Water = instant health potion. Your health condition skin needs hydration too!" },
  { title: "⚡ Blocky: Power-Up Required!", body: "Running low on energy? Water boosts focus by 14%. Science says drink!" },
  { title: "🎯 Blocky: Focus Potion!", body: "A hydrated brain solves equations faster. Drink water, ace that chapter!" },
  { title: "🐟 Blocky: Fish Needs Water!", body: "And so does your brain — 75% of it is water. Refill your tank!" },
  { title: "🌿 Blocky: Grass Block Says...", body: "Even grass needs water to grow. Your body needs it 10x more!" },
  { title: "🔥 Blocky: Fire Resistance!", body: "Drink water to resist the fire of procrastination. Stay sharp!" },
  { title: "🍉 Blocky: Melon Slice Break!", body: "Grab water (or a melon) — your hourly hydration quest is active!" },
  { title: "⭐ Blocky: XP Bonus!", body: "+10 real-life XP for drinking water right now. Don't skip this buff!" },
  { title: "🧪 Blocky: Potion Brewing!", body: "The #1 potion ingredient is water. Brew yourself some hydration!" },
  { title: "🌙 Blocky: Night Vision Potion!", body: "Tired eyes? Water helps. Drink up and keep those eyes sharp!" },
  { title: "🛡️ Blocky: Shield Up!", body: "Water strengthens your immune shield. One glass = +5 defense!" },
  { title: "🎮 Blocky: Respawn Point!", body: "Every glass of water is a respawn point for your energy. Drink!" },
  { title: "🗡️ Blocky: Sharpness V!", body: "Water + your brain = Sharpness V enchantment. Time to hydrate!" },
  { title: "🏔️ Blocky: Mountain Climb!", body: "Climbing your goals needs fuel. Water is the cheapest energy source!" },
  { title: "🌈 Blocky: Rainbow After Rain!", body: "Rain = water = life. Drink some and feel the rainbow energy!" },
  { title: "🔮 Blocky: Enchantment Table!", body: "Enchant your day with water. Your body literally runs on it!" },
  { title: "📚 Blocky: Bookshelf Wisdom!", body: "Every great scholar drinks water while studying. Join the club!" },
  { title: "🌻 Blocky: Sunflower Reminder!", body: "Sunflowers chase the sun, you should chase water. Drink now!" },
  { title: "🐝 Blocky: Bee Productive!", body: "Bees need nectar, you need water. Buzz over to the kitchen!" },
  { title: "🎵 Blocky: Note Block Alert!", body: "♪ Drink-drink-drink your wa-ter, gently down your throat! ♪" },
  { title: "🏆 Blocky: Achievement Unlocked?", body: "Only if you drink water NOW. Go. Glass. Water. Drink. NOW!" },
  { title: "🧠 Blocky: Brain Buffer!", body: "Your brain is buffering... Loading water... Please hydrate to continue!" },
  { title: "☀️ Blocky: Huberman Says!", body: "Andrew Huberman drinks water first thing. You should too, every hour!" },
  { title: "🐉 Blocky: Ender Dragon Mode!", body: "You need max HP to fight your goals. Drink water = full hearts!" },
  { title: "🎪 Blocky: Circus of Life!", body: "Don't be a clown — drink your water. Your kidneys will thank you!" },
  { title: "🧊 Blocky: Frosted Ice!", body: "Your body temp needs regulation. Water is your built-in AC!" },
  { title: "🍃 Blocky: Bamboo Growth!", body: "Bamboo grows 91cm/day with water. Imagine what YOU can do hydrated!" },
  { title: "🎲 Blocky: Loot Drop!", body: "Random loot: 1x Glass of Water. Consume immediately for +HP!" },
  { title: "🌟 Blocky: Nether Star!", body: "As rare and precious as a Nether Star — your hourly water reminder!" },
];

let waterTimerId = null;

/* ── Morning Alarm State ── */
let morningAlarmTime = "06:00";
let morningAlarmEnabled = false;
let morningCheckerId = null;
let lastAlarmDate = null;

/* ── 7 rotating morning alarm messages ── */
const MORNING_MESSAGES = [
  { title: "⛏️ Blocky: WAKE UP, LEGEND!", body: "New day = new XP. Tap to set your goals and crush today!" },
  { title: "🌅 Blocky: Rise & Mine!", body: "The sun is up, the mobs have despawned. Time to build your empire!" },
  { title: "⚔️ Blocky: Battle Stations!", body: "Your morning quests await! Set goals and earn +25 XP!" },
  { title: "☀️ Blocky: Sunrise Alert!", body: "Daylight means XP time. Open up and plan your speedrun!" },
  { title: "🏆 Blocky: New Day Unlocked!", body: "Achievement pending: Set today's goals. Don't let the day auto-save empty!" },
  { title: "🔥 Blocky: Streak Keeper!", body: "Keep your streak alive! Set goals, complete quests, level up!" },
  { title: "💎 Blocky: Diamond Morning!", body: "Every morning is a diamond ore waiting to be mined. Start digging!" },
];

function getMorningMessage() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return MORNING_MESSAGES[dayOfYear % MORNING_MESSAGES.length];
}

/* ── Fire the morning alarm notification ── */
function fireMorningAlarm() {
  const msg = getMorningMessage();
  self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'morning-alarm',
    renotify: true,
    vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500, 200, 800],
    requireInteraction: true,
    actions: [
      { action: 'wake-up', title: "☀️ I'm Up!" },
      { action: 'snooze-alarm', title: '⏰ Snooze 10m' },
    ],
    data: { type: 'morning-alarm', timestamp: Date.now() },
  });
}

/* ── System Clock Checker for Alarms & Meds ── */
let lastMedDate = null;
let medSentFlags = { "08:00": false, "13:00": false, "19:00": false };

async function fireMedNotification(timeStr) {
  let medsList = "Your prescribed health condition medication";
  try {
    // Try to fetch current meds from backend if online
    const res = await fetch("/api/meds");
    if (res.ok) {
      const data = await res.json();
      const activeMeds = data.filter(m => !m.completed).map(m => m.name);
      if (activeMeds.length > 0) medsList = activeMeds.join(", ");
    }
  } catch (e) {}

  const meal = timeStr === "08:00" ? "Breakfast" : timeStr === "13:00" ? "Lunch" : "Dinner";
  self.registration.showNotification(`💊 Health Condition Meds Time! (${meal})`, {
    body: `Take with food: ${medsList}. Log it in the app to earn XP!`,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'med-reminder',
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    actions: [
      { action: 'med-taken', title: '✅ Taken!' },
      { action: 'snooze-med', title: '⏰ Snooze 15m' },
    ],
    data: { type: 'med-reminder', timestamp: Date.now() },
  });
}

function startSystemCheck() {
  stopSystemCheck();
  morningCheckerId = setInterval(() => {
    try {
      const now = new Date();
      // Convert to IST string
      const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const ist = new Date(istStr);
      const curTime = `${String(ist.getHours()).padStart(2, "0")}:${String(ist.getMinutes()).padStart(2, "0")}`;
      const curDate = ist.toDateString();

      // 1. Morning Alarm
      if (morningAlarmEnabled && curTime === morningAlarmTime && lastAlarmDate !== curDate) {
        lastAlarmDate = curDate;
        fireMorningAlarm();
      }

      // Reset med flags on new day
      if (lastMedDate !== curDate) {
        lastMedDate = curDate;
        medSentFlags = { "08:00": false, "13:00": false, "19:00": false };
      }

      // 2. Med Reminders
      if (["08:00", "13:00", "19:00"].includes(curTime) && !medSentFlags[curTime]) {
        medSentFlags[curTime] = true;
        fireMedNotification(curTime);
      }

    } catch (e) {
      // Silently handle timezone errors
    }
  }, 30000); // Every 30 seconds
}

function stopSystemCheck() {
  if (morningCheckerId) {
    clearInterval(morningCheckerId);
    morningCheckerId = null;
  }
}

/* ── Pick a unique message based on current time ── */
function getWaterMessage() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const idx = (now.getHours() + dayOfYear) % WATER_MESSAGES.length;
  return WATER_MESSAGES[idx];
}

/* ── Fire a system-level notification (shows in phone notification bar) ── */
function fireWaterNotification() {
  const msg = getWaterMessage();
  self.registration.showNotification(msg.title, {
    body: msg.body,
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: 'water-reminder',       // replaces previous water notif (no spam)
    renotify: true,              // vibrate even if tag matches
    vibrate: [200, 100, 200],    // vibration pattern
    requireInteraction: false,   // auto-dismiss after a while
    actions: [
      { action: 'drank', title: '✅ Drank!' },
      { action: 'snooze', title: '⏰ Later' },
    ],
    data: { type: 'water-reminder', timestamp: Date.now() },
  });
}

/* ── Start the hourly reminder loop inside the SW ── */
function startWaterReminders() {
  stopWaterReminders();
  // Fire one immediately
  fireWaterNotification();
  // Then every 60 minutes
  waterTimerId = setInterval(fireWaterNotification, 60 * 60 * 1000);
}

function stopWaterReminders() {
  if (waterTimerId) {
    clearInterval(waterTimerId);
    waterTimerId = null;
  }
}

/* ── Install ── */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => null)));
  self.skipWaiting();
});

/* ── Activate ── */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
  // Start system checker automatically
  startSystemCheck();
});

/* ── Fetch (network-first, offline fallback) ── */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never cache API calls — always live
  if (url.pathname.startsWith('/api')) return;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/app')))
  );
});

/* ── Message handler: receive commands from the main app ── */
self.addEventListener('message', (e) => {
  if (!e.data) return;

  if (e.data.type === 'START_WATER_REMINDER') {
    startWaterReminders();
    // Broadcast confirmation back to all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'WATER_REMINDER_STARTED' }));
    });
  }

  if (e.data.type === 'STOP_WATER_REMINDER') {
    stopWaterReminders();
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({ type: 'WATER_REMINDER_STOPPED' }));
    });
  }

  if (e.data.type === 'GET_WATER_STATUS') {
    const active = waterTimerId !== null;
    e.source.postMessage({ type: 'WATER_STATUS', active });
  }

  // ── Morning Alarm commands ──
  if (e.data.type === 'SET_MORNING_ALARM') {
    morningAlarmTime = e.data.time || "06:00";
    morningAlarmEnabled = e.data.enabled !== false;
    startSystemCheck(); // Ensure system check is running
    self.clients.matchAll().then((clients) => {
      clients.forEach((c) => c.postMessage({
        type: 'MORNING_ALARM_SET',
        time: morningAlarmTime,
        enabled: morningAlarmEnabled,
      }));
    });
  }

  if (e.data.type === 'GET_MORNING_ALARM_STATUS') {
    e.source.postMessage({
      type: 'MORNING_ALARM_STATUS',
      time: morningAlarmTime,
      enabled: morningAlarmEnabled,
    });
  }
});

/* ── Notification click handler ── */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const notifType = e.notification.data?.type;

  // ── Morning alarm actions ──
  if (notifType === 'morning-alarm') {
    if (e.action === 'snooze-alarm') {
      // Snooze: fire again in 10 minutes
      setTimeout(fireMorningAlarm, 10 * 60 * 1000);
      return;
    }
    // "I'm Up" or tap → open the morning alarm page
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate('/app/morning');
            return client.focus();
          }
        }
        return self.clients.openWindow('/app/morning');
      })
    );
    return;
  }

  // ── Med reminder actions ──
  if (notifType === 'med-reminder') {
    if (e.action === 'snooze-med') {
      setTimeout(() => fireMedNotification("Snoozed"), 15 * 60 * 1000);
      return;
    }
    // "Taken" or click -> open health app
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate('/app/health');
            return client.focus();
          }
        }
        return self.clients.openWindow('/app/health');
      })
    );
    return;
  }

  // ── Water reminder actions ──
  if (e.action === 'snooze') {
    // Snooze: fire again in 15 minutes
    setTimeout(fireWaterNotification, 15 * 60 * 1000);
    return;
  }

  // Default or 'drank' action: open/focus the app
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a window is already open, focus it
      for (const client of clients) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow('/app');
    })
  );
});
