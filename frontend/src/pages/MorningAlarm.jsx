import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun, AlarmClock, BookOpen, Briefcase, HeartPulse,
  Palette, Star, Sparkles, Save, ArrowRight, Volume2, VolumeX,
  Image, Music, Play, Upload, Clock,
} from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import MarkdownText from "../components/MarkdownText";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";
import { createAlarmPlayer } from "../lib/alarmSound";

const useMemo = React.useMemo;

const LS = {
  wallpaper: "mh_alarm_wallpaper",
  wallpaperData: "mh_alarm_wallpaper_data",
  ringtone: "mh_alarm_ringtone",
  ringtoneData: "mh_alarm_ringtone_data",
  dismissed: "minehealth_alarm_dismissed",
};

const WALLPAPERS = [
  { id: "sunrise", name: "🌅 Sunrise" },
  { id: "aurora", name: "🌌 Aurora" },
  { id: "cave", name: "💎 Crystal Cave" },
  { id: "nether", name: "🔥 Nether" },
  { id: "ocean", name: "🌊 Ocean" },
];

const RINGTONES = [
  { id: "minecraft", name: "⛏️ Minecraft XP" },
  { id: "gentle", name: "🔔 Gentle Bell" },
  { id: "battle", name: "⚔️ Battle Horn" },
  { id: "redstone", name: "💡 Redstone Pulse" },
];

const GOAL_CATS = [
  { key: "study_goal", label: "Study Quest", icon: BookOpen, placeholder: "e.g. Complete 2 JEE Physics chapters...", color: "var(--diamond)", emoji: "📘" },
  { key: "work_goal", label: "Work Mission", icon: Briefcase, placeholder: "e.g. Ship the landing page...", color: "var(--gold)", emoji: "💼" },
  { key: "health_goal", label: "Health Checkpoint", icon: HeartPulse, placeholder: "e.g. No sugar, take meds at 8AM...", color: "var(--grass)", emoji: "💚" },
  { key: "creative_goal", label: "Creative Craft", icon: Palette, placeholder: "e.g. Edit 1 YouTube video...", color: "var(--redstone)", emoji: "🎨" },
  { key: "personal_goal", label: "Personal Level-Up", icon: Star, placeholder: "e.g. Read 20 pages, journal...", color: "#C084FC", emoji: "🌟" },
];

export default function MorningAlarm() {
  const navigate = useNavigate();
  const { profile, refresh } = useProfile() || {};
  const [phase, setPhase] = useState("setup");
  const [brief, setBrief] = useState("");
  const [loadingBrief, setLoadingBrief] = useState(true);
  const [goals, setGoals] = useState({ study_goal: "", work_goal: "", health_goal: "", creative_goal: "", personal_goal: "" });
  const [existingGoals, setExistingGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const alarmRef = useRef(null);
  const vibrateRef = useRef(null);
  const previewRef = useRef(null);

  // Config state
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem(LS.wallpaper) || "sunrise");
  const [wallpaperPreview, setWallpaperPreview] = useState(() => localStorage.getItem(LS.wallpaperData) || "");
  const [ringtone, setRingtone] = useState(() => localStorage.getItem(LS.ringtone) || "minecraft");
  const [ringtoneData, setRingtoneData] = useState(() => localStorage.getItem(LS.ringtoneData) || "");

  const [alarmTime, setAlarmTime] = useState("06:00");
  const [alarmEnabled, setAlarmEnabled] = useState(true);

  const stars = useMemo(() => [...Array(20)].map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 50}%`,
    animationDelay: `${Math.random() * 3}s`,
    width: Math.random() > 0.5 ? 3 : 2,
    height: Math.random() > 0.5 ? 3 : 2,
  })), []);

  const playerName = profile?.name || "Legend";

  // Load alarm settings
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/settings");
        if (r.data.alarm_time) setAlarmTime(r.data.alarm_time);
        if (r.data.alarm_enabled !== undefined) setAlarmEnabled(r.data.alarm_enabled);
      } catch {}
    })();
  }, []);

  // Load goals on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/goals/today", { timeout: 8000 });
        if (r.data && (r.data.study_goal || r.data.work_goal || r.data.health_goal)) {
          setGoals({
            study_goal: r.data.study_goal || "", work_goal: r.data.work_goal || "",
            health_goal: r.data.health_goal || "", creative_goal: r.data.creative_goal || "",
            personal_goal: r.data.personal_goal || "",
          });
          setExistingGoals(true);
        }
      } catch {}
    })();
  }, []);

  // Load morning brief
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/ai/morning-brief", { timeout: 15000 });
        setBrief(r.data.brief);
      } catch {
        setBrief("🌅 GOOD MORNING\nRise and grind, legend! A new day of XP awaits.\n\n🧠 TODAY'S TECHNIQUE\nTry the 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s. Activates parasympathetic nervous system.\n\n💪 HEALTH REMINDER\nNo sugar, no oil today. Take meds with breakfast.\n\n⚔️ BATTLE CRY\nYou're speedrunning life. Let's go! ⛏️");
      } finally { setLoadingBrief(false); }
    })();
  }, []);

  // Alarm sound + vibration
  useEffect(() => {
    if (phase !== "alarm") return;
    const rt = localStorage.getItem(LS.ringtone) || "minecraft";
    const rd = localStorage.getItem(LS.ringtoneData) || null;
    alarmRef.current = createAlarmPlayer(rt, rd);
    if (!muted) alarmRef.current.start();
    if ("vibrate" in navigator) {
      const p = [500, 200, 500, 200, 500, 300, 800];
      navigator.vibrate(p);
      vibrateRef.current = setInterval(() => { if ("vibrate" in navigator) navigator.vibrate(p); }, 3500);
    }
    return () => {
      alarmRef.current?.stop();
      if (vibrateRef.current) { clearInterval(vibrateRef.current); if ("vibrate" in navigator) navigator.vibrate(0); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "alarm" || !alarmRef.current) return;
    if (muted) alarmRef.current.stop(); else alarmRef.current.start();
  }, [muted, phase]);

  // Disable CSS render traps on parents when alarm is active
  useEffect(() => {
    if (phase === "alarm") {
      document.body.classList.add("alarm-active");
      return () => document.body.classList.remove("alarm-active");
    }
  }, [phase]);

  const dismissAlarm = () => {
    alarmRef.current?.stop();
    if (vibrateRef.current) { clearInterval(vibrateRef.current); if ("vibrate" in navigator) navigator.vibrate(0); }
    localStorage.setItem(LS.dismissed, new Date().toDateString());
    setPhase("brief");
  };

  const saveGoals = async () => {
    const filled = Object.values(goals).filter(v => v.trim()).length;
    if (filled === 0) { toast.error("Set at least one goal!"); return; }
    setSaving(true);
    try {
      const r = await api.post("/goals", goals);
      if (r.data.xp_awarded) showXP(r.data.xp_awarded);
      toast.success(existingGoals ? "Goals updated! ⚔️" : "Goals set! +25 XP 🎯");
      refresh?.();
      navigate("/app/career");
    } catch { toast.error("Failed to save. Try again!"); }
    finally { setSaving(false); }
  };

  const saveConfig = async () => {
    localStorage.setItem(LS.wallpaper, wallpaper);
    if (wallpaper === "custom" && wallpaperPreview) localStorage.setItem(LS.wallpaperData, wallpaperPreview);
    localStorage.setItem(LS.ringtone, ringtone);
    if (ringtone === "custom" && ringtoneData) localStorage.setItem(LS.ringtoneData, ringtoneData);
    try {
      await api.patch("/settings", { alarm_time: alarmTime, alarm_enabled: alarmEnabled });
      toast.success("Alarm settings saved! ⏰");
    } catch {
      toast.error("Saved local config, but failed to sync time to server.");
    }
  };

  const handleWallpaperUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error("Image must be under 3MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setWallpaperPreview(reader.result); setWallpaper("custom"); };
    reader.readAsDataURL(file);
  };

  const handleRingtoneUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Audio must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { setRingtoneData(reader.result); setRingtone("custom"); };
    reader.readAsDataURL(file);
  };

  const previewRingtone = () => {
    if (previewRef.current) { previewRef.current.stop(); previewRef.current = null; return; }
    const rd = ringtone === "custom" ? ringtoneData : null;
    previewRef.current = createAlarmPlayer(ringtone, rd);
    previewRef.current.start();
    setTimeout(() => { previewRef.current?.stop(); previewRef.current = null; }, 4000);
  };

  const now = new Date();
  const istOpts = { timeZone: "Asia/Kolkata" };
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, ...istOpts });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", ...istOpts });

  const alarmBgClass = `alarm-bg-${wallpaper === "custom" ? "sunrise" : wallpaper}`;
  const customBgStyle = wallpaper === "custom" && wallpaperPreview ? { backgroundImage: `url(${wallpaperPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {};

  // ═══ PHASE: ALARM ═══
  if (phase === "alarm") {
    return (
      <div className="alarm-screen">
        <div className={`alarm-bg ${alarmBgClass}`} style={wallpaper === "custom" ? customBgStyle : {}} />
        <div className="alarm-stars">
          {stars.map((star) => (
            <div key={star.id} className="alarm-star" style={{
              left: star.left, top: star.top,
              animationDelay: star.animationDelay, width: star.width, height: star.height,
            }} />
          ))}
        </div>
        <div className="alarm-terrain" />
        <div className="alarm-content">
          <div className="alarm-icon-ring"><AlarmClock size={48} color="#FDE68A" /></div>
          <div className="alarm-time font-pixel">{timeStr}</div>
          <div className="alarm-date font-vt">{dateStr}</div>
          <div className="alarm-greeting font-vt">Good Morning, <span style={{ color: "var(--grass)" }}>{playerName}</span>!</div>
          <div className="alarm-sub font-vt">A new day of XP awaits. Time to level up.</div>
          <div className="alarm-actions">
            <button className="alarm-dismiss-btn font-pixel" onClick={dismissAlarm}><Sun size={20} /> I'M AWAKE — LET'S GO</button>
            <button className="alarm-mute-btn" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PHASE: BRIEF ═══
  if (phase === "brief") {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3 mb-2">
          <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, #f59e0b, #ea580c)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={22} color="#000" />
          </div>
          <div>
            <h1 className="font-pixel text-lg" style={{ color: "var(--gold)" }}>MORNING BRIEF</h1>
            <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>Today's technique + Health reminder</p>
          </div>
        </div>
        <BlockCard title="Blocky's Morning Brief" icon={<Sun size={12} color="#000" />} accent="var(--gold)">
          {loadingBrief ? (
            <div className="npc-box"><span style={{ color: "var(--gold)" }}>[Blocky]</span> Mining your morning brief... ▮▯▮</div>
          ) : (
            <div className="npc-box" style={{ whiteSpace: "pre-wrap" }}><MarkdownText>{brief}</MarkdownText></div>
          )}
        </BlockCard>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 p-3" style={{ background: "var(--bg-2)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", minWidth: 100 }}>
            <div className="font-pixel text-[9px] uppercase" style={{ color: "var(--ink-muted)" }}>Level</div>
            <div className="font-vt text-2xl" style={{ color: "var(--gold)" }}>LV {profile?.level ?? 1}</div>
          </div>
          <div className="flex-1 p-3" style={{ background: "var(--bg-2)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", minWidth: 100 }}>
            <div className="font-pixel text-[9px] uppercase" style={{ color: "var(--ink-muted)" }}>Streak</div>
            <div className="font-vt text-2xl" style={{ color: "var(--grass)" }}>{profile?.streak ?? 0}d</div>
          </div>
          <div className="flex-1 p-3" style={{ background: "var(--bg-2)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", minWidth: 100 }}>
            <div className="font-pixel text-[9px] uppercase" style={{ color: "var(--ink-muted)" }}>XP</div>
            <div className="font-vt text-2xl" style={{ color: "var(--diamond)" }}>{profile?.total_xp ?? 0}</div>
          </div>
        </div>
        <button className="pixel-btn pixel-btn-primary" onClick={() => setPhase("goals")} style={{ width: "100%", justifyContent: "center", padding: "16px 24px", fontSize: 14 }}>
          <ArrowRight size={18} /> SET TODAY'S GOALS
        </button>
      </div>
    );
  }

  // ═══ PHASE: GOALS ═══
  if (phase === "goals") {
    return (
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, var(--grass), var(--diamond))", border: "2px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlarmClock size={22} color="#000" />
            </div>
            <div>
              <h1 className="font-pixel text-lg">DAILY GOALS</h1>
              <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>{existingGoals ? "Edit today's goals" : "Set goals — earn +25 XP"}</p>
            </div>
          </div>
          <div className="font-vt text-base" style={{ color: "var(--gold)" }}>{dateStr}</div>
        </div>
        {GOAL_CATS.map(({ key, label, icon: Icon, placeholder, color, emoji }) => (
          <BlockCard key={key} title={`${emoji} ${label}`} icon={<Icon size={12} color="#000" />} accent={color}>
            <textarea className="pixel-textarea" rows={2} value={goals[key]}
              onChange={(e) => setGoals(g => ({ ...g, [key]: e.target.value }))} placeholder={placeholder} style={{ resize: "vertical" }} />
          </BlockCard>
        ))}
        <div className="flex gap-3 flex-wrap">
          <PixelButton variant="primary" onClick={saveGoals} disabled={saving} style={{ flex: 1, justifyContent: "center", padding: "14px 20px" }}>
            <Save size={16} />{saving ? "Saving..." : existingGoals ? "UPDATE GOALS" : "SET GOALS & GO TO CAREER (+25 XP)"}
          </PixelButton>
          <PixelButton onClick={() => navigate("/app/career")} style={{ justifyContent: "center" }}>Skip → Career</PixelButton>
        </div>
      </div>
    );
  }

  // ═══ DEFAULT: SETUP / CONFIG VIEW ═══
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, var(--gold), #ea580c)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlarmClock size={22} color="#000" />
        </div>
        <div>
          <h1 className="font-pixel text-lg" style={{ color: "var(--gold)" }}>MORNING STATION</h1>
          <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>Customize your alarm & set daily goals</p>
        </div>
      </div>

      {/* Quick Time */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 p-4" style={{ background: "var(--bg-2)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", minWidth: 200 }}>
          <div className="font-pixel text-[9px] uppercase mb-1" style={{ color: "var(--ink-muted)" }}><Clock size={12} style={{ display: "inline", marginRight: 4 }} />Current Time</div>
          <div className="font-vt text-3xl" style={{ color: "var(--gold)" }}>{timeStr}</div>
          <div className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>{dateStr}</div>
        </div>
        
        <div className="flex-1 p-4" style={{ background: "var(--bg-1)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", minWidth: 200 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-pixel text-[9px] uppercase" style={{ color: "var(--ink-muted)" }}><AlarmClock size={12} style={{ display: "inline", marginRight: 4 }} />Alarm Time</div>
            <button className={`pixel-checkbox ${alarmEnabled ? 'checked' : ''}`} onClick={() => setAlarmEnabled(!alarmEnabled)} />
          </div>
          <input type="time" className="pixel-input text-2xl font-vt" style={{ width: "100%", height: 48 }} value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} disabled={!alarmEnabled} />
        </div>

        <div className="flex flex-col gap-2" style={{ minWidth: 180 }}>
          <PixelButton variant="gold" onClick={() => setPhase("alarm")} style={{ justifyContent: "center", padding: "14px 20px" }}>
            <AlarmClock size={16} /> TEST ALARM
          </PixelButton>
          <PixelButton variant="primary" onClick={() => setPhase("goals")} style={{ justifyContent: "center", padding: "14px 20px" }}>
            <ArrowRight size={16} /> SET GOALS
          </PixelButton>
        </div>
      </div>

      {/* Wallpaper Selection */}
      <BlockCard title="🖼️ Alarm Wallpaper" icon={<Image size={12} color="#000" />} accent="var(--diamond)">
        <p className="font-vt text-base mb-3" style={{ color: "var(--ink-muted)" }}>Choose a background for your alarm screen</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {WALLPAPERS.map(w => (
            <button key={w.id} onClick={() => setWallpaper(w.id)}
              className="font-vt text-base" style={{
                padding: "10px 16px", background: wallpaper === w.id ? "var(--diamond)" : "var(--bg-1)",
                border: wallpaper === w.id ? "2px solid #fff" : "2px solid #000",
                boxShadow: wallpaper === w.id ? "0 0 0 2px #000, 3px 3px 0 #000" : "2px 2px 0 #000",
                color: wallpaper === w.id ? "#fff" : "var(--ink-muted)", cursor: "pointer",
              }}>{w.name}</button>
          ))}
          <button onClick={() => setWallpaper("custom")}
            className="font-vt text-base" style={{
              padding: "10px 16px", background: wallpaper === "custom" ? "var(--diamond)" : "var(--bg-1)",
              border: wallpaper === "custom" ? "2px solid #fff" : "2px solid #000",
              boxShadow: wallpaper === "custom" ? "0 0 0 2px #000, 3px 3px 0 #000" : "2px 2px 0 #000",
              color: wallpaper === "custom" ? "#fff" : "var(--ink-muted)", cursor: "pointer",
            }}>📁 Custom</button>
        </div>
        {wallpaper === "custom" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="pixel-btn" style={{ cursor: "pointer" }}>
              <Upload size={14} /> Upload Image
              <input type="file" accept="image/*" onChange={handleWallpaperUpload} style={{ display: "none" }} />
            </label>
            {wallpaperPreview && (
              <div style={{ width: 120, height: 68, border: "2px solid #000", boxShadow: "2px 2px 0 #000", backgroundImage: `url(${wallpaperPreview})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
          </div>
        )}
        {wallpaper !== "custom" && (
          <div className={`alarm-wallpaper-preview alarm-bg-${wallpaper}`} style={{ width: "100%", height: 80, border: "2px solid #000", boxShadow: "2px 2px 0 #000" }} />
        )}
      </BlockCard>

      {/* Ringtone Selection */}
      <BlockCard title="🔔 Alarm Ringtone" icon={<Music size={12} color="#000" />} accent="var(--gold)">
        <p className="font-vt text-base mb-3" style={{ color: "var(--ink-muted)" }}>Pick a sound for your alarm</p>
        <div className="flex gap-2 flex-wrap mb-3">
          {RINGTONES.map(r => (
            <button key={r.id} onClick={() => setRingtone(r.id)}
              className="font-vt text-base" style={{
                padding: "10px 16px", background: ringtone === r.id ? "var(--gold)" : "var(--bg-1)",
                border: ringtone === r.id ? "2px solid #fff" : "2px solid #000",
                boxShadow: ringtone === r.id ? "0 0 0 2px #000, 3px 3px 0 #000" : "2px 2px 0 #000",
                color: ringtone === r.id ? "#000" : "var(--ink-muted)", cursor: "pointer",
              }}>{r.name}</button>
          ))}
          <button onClick={() => setRingtone("custom")}
            className="font-vt text-base" style={{
              padding: "10px 16px", background: ringtone === "custom" ? "var(--gold)" : "var(--bg-1)",
              border: ringtone === "custom" ? "2px solid #fff" : "2px solid #000",
              boxShadow: ringtone === "custom" ? "0 0 0 2px #000, 3px 3px 0 #000" : "2px 2px 0 #000",
              color: ringtone === "custom" ? "#000" : "var(--ink-muted)", cursor: "pointer",
            }}>📁 Custom</button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <PixelButton onClick={previewRingtone}><Play size={14} /> Preview</PixelButton>
          {ringtone === "custom" && (
            <label className="pixel-btn" style={{ cursor: "pointer" }}>
              <Upload size={14} /> Upload Audio
              <input type="file" accept="audio/*" onChange={handleRingtoneUpload} style={{ display: "none" }} />
            </label>
          )}
          {ringtone === "custom" && ringtoneData && <span className="font-vt text-base" style={{ color: "var(--grass)" }}>✓ Custom audio loaded</span>}
        </div>
      </BlockCard>

      {/* Save Config */}
      <PixelButton variant="diamond" onClick={saveConfig} style={{ justifyContent: "center", padding: "14px 24px" }}>
        <Save size={16} /> SAVE ALARM SETTINGS
      </PixelButton>

      {/* Quick Goals */}
      <BlockCard title="🎯 Today's Goals" icon={<BookOpen size={12} color="#000" />} accent="var(--grass)">
        {GOAL_CATS.map(({ key, label, emoji, placeholder }) => (
          <div key={key} className="mb-2">
            <div className="font-vt text-base mb-1" style={{ color: "var(--ink-muted)" }}>{emoji} {label}</div>
            <textarea className="pixel-textarea" rows={1} value={goals[key]}
              onChange={(e) => setGoals(g => ({ ...g, [key]: e.target.value }))} placeholder={placeholder} style={{ resize: "vertical" }} />
          </div>
        ))}
        <div className="flex gap-3 flex-wrap mt-3">
          <PixelButton variant="primary" onClick={saveGoals} disabled={saving}>
            <Save size={14} />{saving ? "Saving..." : existingGoals ? "UPDATE GOALS" : "SET GOALS (+25 XP)"}
          </PixelButton>
        </div>
      </BlockCard>
    </div>
  );
}
