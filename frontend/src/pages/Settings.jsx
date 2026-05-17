import React, { useEffect, useState, useCallback } from "react";
import {
  Settings as SettingsIcon, User, Palette, Zap, HeartPulse,
  MessageSquareText, Database, Save, Plus, Trash2, GripVertical,
  Download, AlertTriangle, RefreshCcw, Check, X, ChevronDown, ChevronUp,
  AlarmClock,
} from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";
import {
  getMorningAlarmEnabled, getMorningAlarmTime, setMorningAlarm,
} from "../components/NotificationManager";

const AVATAR_COLORS = [
  "#22C55E", "#16A34A", "#3B82F6", "#6366F1", "#8B5CF6",
  "#EC4899", "#EF4444", "#F97316", "#EAB308", "#14B8A6",
  "#06B6D4", "#FFFFFF",
];

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai",
  "Europe/London", "Europe/Berlin", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "America/Sao_Paulo", "Australia/Sydney", "Pacific/Auckland",
];

const DATA_COLLECTIONS = [
  { key: "tasks", label: "Quests / Tasks", icon: "📋" },
  { key: "habits", label: "Habit Logs", icon: "🌿" },
  { key: "pomodoro", label: "Pomodoro Sessions", icon: "🍅" },
  { key: "skin issue_log", label: "Skin Issue / Skin Logs", icon: "🧪" },
  { key: "meditation", label: "Meditation Sessions", icon: "🕯️" },
  { key: "career", label: "Career Entries", icon: "💼" },
  { key: "chat_messages", label: "AI Chat History", icon: "💬" },
  { key: "meds", label: "Medication List", icon: "💊" },
  { key: "meds_taken", label: "Medication Taken Logs", icon: "✅" },
  { key: "distractions", label: "Distraction Logs", icon: "📱" },
  { key: "ideas_log", label: "Daily Ideas", icon: "💡" },
  { key: "jee_progress", label: "JEE Progress", icon: "📘" },
  { key: "daily_goals", label: "Daily Goals", icon: "🎯" },
  { key: "daily_tip", label: "Cached Daily Tips", icon: "✨" },
];

const SectionToggle = ({ title, icon, accent, isOpen, onToggle, children }) => (
  <BlockCard
    title={title}
    icon={icon}
    accent={accent}
    testId={`settings-${title.toLowerCase().replace(/ /g, "-")}`}
    action={
      <button onClick={onToggle} className="pixel-btn" style={{ padding: "6px 10px" }}>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    }
  >
    {isOpen && children}
  </BlockCard>
);

export default function Settings() {
  const { profile, refresh } = useProfile() || {};

  // Profile fields
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [avatarColor, setAvatarColor] = useState("#22C55E");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  // Settings fields
  const [mealTimes, setMealTimes] = useState(["08:00", "13:00", "19:00"]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [medReminderEnabled, setMedReminderEnabled] = useState(true);
  const [buddyPersona, setBuddyPersona] = useState("");
  const [xpPerLevel, setXpPerLevel] = useState(500);
  const [customHabits, setCustomHabits] = useState(null);

  // UI state
  const [openSections, setOpenSections] = useState({
    profile: true, preferences: false, alarm: false, habits: false,
    health: false, buddy: false, data: false,
  });
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [nuclearConfirm, setNuclearConfirm] = useState(false);

  const toggleSection = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // Load profile + settings on mount
  const loadData = useCallback(async () => {
    try {
      const [profileRes, settingsRes] = await Promise.all([
        api.get("/profile"),
        api.get("/settings"),
      ]);
      const p = profileRes.data;
      setName(p.name || "");
      setBio(p.bio || "");
      setEmail(p.email || "");
      setLinkedinUrl(p.linkedin_url || "");
      setGithubUrl(p.github_url || "");
      setAvatarColor(p.avatar_color || "#22C55E");
      setTimezone(p.timezone || "Asia/Kolkata");

      const s = settingsRes.data;
      setMealTimes(s.meal_times || ["08:00", "13:00", "19:00"]);
      setNotificationsEnabled(s.notifications_enabled !== false);
      setMedReminderEnabled(s.med_reminder_enabled !== false);
      setBuddyPersona(s.buddy_persona || "");
      setXpPerLevel(s.xp_per_level || 500);
      setCustomHabits(s.custom_habits || null);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Save profile
  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/profile", {
        name: name.trim() || "Player One",
        bio, email, linkedin_url: linkedinUrl,
        github_url: githubUrl, avatar_color: avatarColor, timezone,
      });
      toast.success("Profile saved!");
      refresh && refresh();
    } catch (e) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        meal_times: mealTimes.filter(t => t),
        notifications_enabled: notificationsEnabled,
        med_reminder_enabled: medReminderEnabled,
        buddy_persona: buddyPersona,
        xp_per_level: xpPerLevel,
      };
      if (customHabits !== null) {
        payload.custom_habits = customHabits;
      }
      await api.patch("/settings", payload);
      toast.success("Settings saved!");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Custom habits management
  const habitsList = customHabits || [
    { key: "yoga_nidra", label: "Yoga Nidra", xp: 30 },
    { key: "no_junk", label: "No Junk Food", xp: 20 },
    { key: "daily_steps", label: "10k Steps", xp: 25 },
    { key: "wim_hof", label: "Wim Hof Breathing", xp: 30 },
    { key: "huberman_sunlight", label: "Huberman: Morning Sunlight", xp: 20 },
    { key: "no_sugar", label: "No Sugar", xp: 25 },
    { key: "no_oil", label: "No Oil", xp: 25 },
    { key: "meditation", label: "Meditation", xp: 30 },
    { key: "cold_shower", label: "Cold Shower", xp: 20 },
    { key: "reading", label: "Read 20 min", xp: 20 },
  ];

  const addHabit = () => {
    const newList = [...habitsList, { key: `custom_${Date.now()}`, label: "", xp: 20 }];
    setCustomHabits(newList);
  };

  const removeHabit = (idx) => {
    const newList = habitsList.filter((_, i) => i !== idx);
    setCustomHabits(newList);
  };

  const updateHabit = (idx, field, value) => {
    const newList = [...habitsList];
    newList[idx] = { ...newList[idx], [field]: value };
    if (field === "label") {
      newList[idx].key = value.toLowerCase().replace(/[^a-z0-9]+/g, "_") || `custom_${idx}`;
    }
    setCustomHabits(newList);
  };

  const moveHabit = (idx, dir) => {
    const newList = [...habitsList];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    [newList[idx], newList[swapIdx]] = [newList[swapIdx], newList[idx]];
    setCustomHabits(newList);
  };

  // Data management
  const resetCollection = async (collection) => {
    try {
      const r = await api.post("/data/reset", { collection });
      toast.success(`Cleared ${r.data.deleted} entries from ${collection}`);
      setResetConfirm(null);
      refresh && refresh();
    } catch {
      toast.error("Reset failed");
    }
  };

  const resetAll = async () => {
    try {
      const r = await api.post("/data/reset-all");
      toast.success(`All data wiped. ${r.data.total_deleted} entries removed.`);
      setNuclearConfirm(false);
      await loadData();
      refresh && refresh();
    } catch {
      toast.error("Full reset failed");
    }
  };

  const exportData = async () => {
    try {
      const r = await api.get("/data/export");
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeblocks-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported!");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{
            width: 40, height: 40, background: avatarColor,
            border: "2px solid #000", boxShadow: "4px 4px 0 #000",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SettingsIcon size={20} color="#000" />
          </div>
          <div>
            <h1 className="font-pixel text-xl">SETTINGS</h1>
            <p className="font-vt text-lg" style={{ color: "var(--ink-muted)" }}>
              Customize your Life Blocks experience
            </p>
          </div>
        </div>
      </div>

      {/* ───── SECTION 1: PROFILE ───── */}
      <SectionToggle
        title="Player Profile"
        icon={<User size={12} color="#000" />}
        accent="var(--grass)"
        isOpen={openSections.profile}
        onToggle={() => toggleSection("profile")}
      >
        <div className="space-y-4">
          {/* Avatar color picker */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-2">Avatar Color</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button key={c} onClick={() => setAvatarColor(c)}
                  style={{
                    width: 36, height: 36, background: c,
                    border: avatarColor === c ? "3px solid #fff" : "2px solid #000",
                    boxShadow: avatarColor === c ? "0 0 0 2px #000, 3px 3px 0 #000" : "2px 2px 0 #000",
                    cursor: "pointer",
                  }}
                  data-testid={`avatar-color-${c}`}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-pixel text-[10px] uppercase block mb-1">Player Name</label>
              <input className="pixel-input" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your name" data-testid="settings-name" />
            </div>
            <div>
              <label className="font-pixel text-[10px] uppercase block mb-1">Email</label>
              <input className="pixel-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" data-testid="settings-email" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-1">Bio</label>
            <textarea className="pixel-textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="JEE aspirant, coder, Minecraft enthusiast — who are you?"
              data-testid="settings-bio" />
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-pixel text-[10px] uppercase block mb-1">LinkedIn URL</label>
              <input className="pixel-input" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/you" data-testid="settings-linkedin" />
            </div>
            <div>
              <label className="font-pixel text-[10px] uppercase block mb-1">GitHub URL</label>
              <input className="pixel-input" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/you" data-testid="settings-github" />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-1">Timezone</label>
            <select className="pixel-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}
              data-testid="settings-timezone">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>

          <PixelButton variant="primary" onClick={saveProfile} disabled={saving} data-testid="save-profile">
            <Save size={14} />{saving ? "Saving..." : "Save Profile"}
          </PixelButton>
        </div>
      </SectionToggle>

      {/* ───── SECTION 2: APP PREFERENCES ───── */}
      <SectionToggle
        title="App Preferences"
        icon={<Palette size={12} color="#000" />}
        accent="var(--diamond)"
        isOpen={openSections.preferences}
        onToggle={() => toggleSection("preferences")}
      >
        <div className="space-y-4">
          {/* Meal times */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-2">Meal Times</label>
            <div className="flex gap-2 flex-wrap">
              {mealTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="time" className="pixel-input" style={{ width: 140 }}
                    value={t} onChange={(e) => {
                      const m = [...mealTimes]; m[i] = e.target.value; setMealTimes(m);
                    }} data-testid={`meal-time-${i}`} />
                  {mealTimes.length > 1 && (
                    <button onClick={() => setMealTimes(mealTimes.filter((_, j) => j !== i))}
                      className="pixel-btn" style={{ padding: 6 }}><Trash2 size={12} /></button>
                  )}
                </div>
              ))}
              <PixelButton onClick={() => setMealTimes([...mealTimes, "12:00"])}>
                <Plus size={12} />Add
              </PixelButton>
            </div>
          </div>

          {/* XP per level */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-1">Base XP Per Level</label>
            <div className="flex items-center gap-3">
              <input type="number" className="pixel-input" style={{ width: 120 }}
                value={xpPerLevel} min={100} max={2000} step={50}
                onChange={(e) => setXpPerLevel(Number(e.target.value))}
                data-testid="settings-xp-per-level" />
              <span className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>
                (higher = slower leveling)
              </span>
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <ToggleRow label="Browser Notifications" checked={notificationsEnabled}
              onChange={setNotificationsEnabled} testId="settings-notifications" />
            <ToggleRow label="Medicine Reminders" checked={medReminderEnabled}
              onChange={setMedReminderEnabled} testId="settings-med-reminders" />
          </div>

          <PixelButton variant="diamond" onClick={saveSettings} disabled={saving} data-testid="save-settings">
            <Save size={14} />{saving ? "Saving..." : "Save Preferences"}
          </PixelButton>
        </div>
      </SectionToggle>

      {/* ───── SECTION 2B: MORNING ALARM ───── */}
      <SectionToggle
        title="Morning Alarm"
        icon={<AlarmClock size={12} color="#000" />}
        accent="var(--gold)"
        isOpen={openSections.alarm}
        onToggle={() => toggleSection("alarm")}
      >
        <MorningAlarmSettings />
      </SectionToggle>

      {/* ───── SECTION 3: CUSTOM HABITS ───── */}
      <SectionToggle
        title="Custom Habits"
        icon={<Zap size={12} color="#000" />}
        accent="var(--gold)"
        isOpen={openSections.habits}
        onToggle={() => toggleSection("habits")}
      >
        <div className="space-y-3">
          <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>
            Edit, reorder, or add your own daily habits. Changes apply to tomorrow's tracker.
          </p>
          {habitsList.map((h, i) => (
            <div key={h.key + i} className="flex items-center gap-2 p-2"
              style={{ background: "var(--bg-1)", border: "2px solid #000" }}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveHabit(i, -1)} disabled={i === 0}
                  className="opacity-50 hover:opacity-100" style={{ cursor: i === 0 ? "not-allowed" : "pointer" }}>
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => moveHabit(i, 1)} disabled={i === habitsList.length - 1}
                  className="opacity-50 hover:opacity-100" style={{ cursor: i === habitsList.length - 1 ? "not-allowed" : "pointer" }}>
                  <ChevronDown size={12} />
                </button>
              </div>
              <GripVertical size={14} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              <input className="pixel-input" value={h.label}
                onChange={(e) => updateHabit(i, "label", e.target.value)}
                placeholder="Habit name" style={{ flex: 1 }}
                data-testid={`habit-label-${i}`} />
              <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                <span className="font-pixel text-[9px]" style={{ color: "var(--gold)" }}>XP</span>
                <input type="number" className="pixel-input" value={h.xp} min={1} max={100}
                  onChange={(e) => updateHabit(i, "xp", Number(e.target.value))}
                  style={{ width: 60 }} data-testid={`habit-xp-${i}`} />
              </div>
              <button onClick={() => removeHabit(i)} className="pixel-btn" style={{ padding: 6 }}
                data-testid={`habit-remove-${i}`}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <PixelButton onClick={addHabit}>
              <Plus size={14} />Add Habit
            </PixelButton>
            <PixelButton variant="gold" onClick={saveSettings} disabled={saving}>
              <Save size={14} />{saving ? "Saving..." : "Save Habits"}
            </PixelButton>
            {customHabits !== null && (
              <PixelButton onClick={() => { setCustomHabits(null); toast("Reset to default habits"); }}>
                <RefreshCcw size={14} />Reset to Defaults
              </PixelButton>
            )}
          </div>
        </div>
      </SectionToggle>

      {/* ───── SECTION 4: HEALTH SETTINGS ───── */}
      <SectionToggle
        title="Health Zone"
        icon={<HeartPulse size={12} color="#000" />}
        accent="var(--redstone)"
        isOpen={openSections.health}
        onToggle={() => toggleSection("health")}
      >
        <div className="space-y-3">
          <div className="npc-box">
            <span style={{ color: "var(--redstone)" }}>[Health Settings]</span> Your medication reminders and
            skin issue tracker are fully functional — add meds from the{" "}
            <span style={{ color: "var(--grass)" }}>Health Zone</span> page. Toggle med
            reminders above in <span style={{ color: "var(--diamond)" }}>App Preferences</span>.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3" style={{ background: "var(--bg-1)", border: "2px solid #000" }}>
              <div className="font-pixel text-[10px] uppercase mb-1" style={{ color: "var(--ink-muted)" }}>Meal Reminders</div>
              <div className="font-vt text-lg">
                {mealTimes.map((t, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    <span style={{ color: "var(--gold)" }}>{t}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="p-3" style={{ background: "var(--bg-1)", border: "2px solid #000" }}>
              <div className="font-pixel text-[10px] uppercase mb-1" style={{ color: "var(--ink-muted)" }}>Med Reminders</div>
              <div className="font-vt text-lg" style={{ color: medReminderEnabled ? "var(--grass)" : "var(--redstone)" }}>
                {medReminderEnabled ? "ENABLED" : "DISABLED"}
              </div>
            </div>
          </div>
        </div>
      </SectionToggle>

      {/* ───── SECTION 5: AI BUDDY ───── */}
      <SectionToggle
        title="AI Buddy Persona"
        icon={<MessageSquareText size={12} color="#000" />}
        accent="var(--grass)"
        isOpen={openSections.buddy}
        onToggle={() => toggleSection("buddy")}
      >
        <div className="space-y-3">
          <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>
            Add extra context for Blocky. This gets appended to the AI's system prompt.
            Example: "I'm vegetarian", "I study at XYZ school", "Focus on mental health tips".
          </p>
          <textarea className="pixel-textarea" rows={4} value={buddyPersona}
            onChange={(e) => setBuddyPersona(e.target.value)}
            placeholder="Tell Blocky more about you..."
            data-testid="settings-buddy-persona" />
          <PixelButton variant="primary" onClick={saveSettings} disabled={saving} data-testid="save-buddy">
            <Save size={14} />{saving ? "Saving..." : "Save Buddy Persona"}
          </PixelButton>
        </div>
      </SectionToggle>

      {/* ───── SECTION 6: DATA MANAGEMENT ───── */}
      <SectionToggle
        title="Data Management"
        icon={<Database size={12} color="#000" />}
        accent="var(--redstone)"
        isOpen={openSections.data}
        onToggle={() => toggleSection("data")}
      >
        <div className="space-y-4">
          {/* Export */}
          <div className="flex gap-2">
            <PixelButton variant="diamond" onClick={exportData} data-testid="export-data">
              <Download size={14} />Export All Data (JSON)
            </PixelButton>
          </div>

          {/* Per-collection reset */}
          <div>
            <label className="font-pixel text-[10px] uppercase block mb-2">Clear Specific Data</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DATA_COLLECTIONS.map((c) => (
                <div key={c.key} className="flex items-center justify-between p-2"
                  style={{ background: "var(--bg-1)", border: "2px solid #000" }}>
                  <div className="flex items-center gap-2">
                    <span>{c.icon}</span>
                    <span className="font-vt text-base">{c.label}</span>
                  </div>
                  {resetConfirm === c.key ? (
                    <div className="flex gap-1">
                      <button onClick={() => resetCollection(c.key)}
                        className="pixel-btn pixel-btn-danger" style={{ padding: "4px 8px", fontSize: 10 }}>
                        <Check size={10} />Yes
                      </button>
                      <button onClick={() => setResetConfirm(null)}
                        className="pixel-btn" style={{ padding: "4px 8px", fontSize: 10 }}>
                        <X size={10} />No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setResetConfirm(c.key)}
                      className="pixel-btn pixel-btn-danger" style={{ padding: "4px 8px", fontSize: 10 }}
                      data-testid={`reset-${c.key}`}>
                      <Trash2 size={10} />Clear
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Nuclear reset */}
          <div className="p-4" style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "2px solid var(--redstone)",
            boxShadow: "4px 4px 0 #000",
          }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} color="var(--redstone)" />
              <span className="font-pixel text-sm" style={{ color: "var(--redstone)" }}>DANGER ZONE</span>
            </div>
            <p className="font-vt text-base mb-3" style={{ color: "var(--ink-muted)" }}>
              This permanently deletes ALL your data — profile, tasks, habits, XP, streak, everything.
              You'll start fresh at Level 1 with 0 XP.
            </p>
            {nuclearConfirm ? (
              <div className="flex gap-2 items-center">
                <span className="font-pixel text-[10px]" style={{ color: "var(--redstone)" }}>
                  ARE YOU ABSOLUTELY SURE?
                </span>
                <PixelButton variant="danger" onClick={resetAll} data-testid="confirm-reset-all">
                  <Trash2 size={14} />Yes, Wipe Everything
                </PixelButton>
                <PixelButton onClick={() => setNuclearConfirm(false)}>Cancel</PixelButton>
              </div>
            ) : (
              <PixelButton variant="danger" onClick={() => setNuclearConfirm(true)} data-testid="reset-all">
                <AlertTriangle size={14} />Reset All Data
              </PixelButton>
            )}
          </div>
        </div>
      </SectionToggle>
    </div>
  );
}

const ToggleRow = ({ label, checked, onChange, testId }) => (
  <button onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full p-3"
    style={{ background: "var(--bg-1)", border: "2px solid #000", cursor: "pointer" }}
    data-testid={testId}>
    <span className="font-vt text-lg">{label}</span>
    <div style={{
      width: 44, height: 24, background: checked ? "var(--grass)" : "var(--bg-3)",
      border: "2px solid #000", position: "relative", transition: "background 0.2s",
    }}>
      <div style={{
        width: 16, height: 16, background: checked ? "#fff" : "var(--ink-dim)",
        border: "2px solid #000", position: "absolute", top: 2,
        left: checked ? 22 : 2, transition: "left 0.2s",
      }} />
    </div>
  </button>
);

/** Self-contained morning alarm settings sub-component */
function MorningAlarmSettings() {
  const [enabled, setEnabled] = useState(() => getMorningAlarmEnabled());
  const [time, setTime] = useState(() => getMorningAlarmTime());
  const [saved, setSaved] = useState(false);

  const saveAlarm = () => {
    setMorningAlarm(enabled, time);
    setSaved(true);
    toast.success(enabled ? `⏰ Morning alarm set for ${time} IST` : "Morning alarm disabled");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="npc-box">
        <span style={{ color: "var(--gold)" }}>[Morning Alarm]</span>{" "}
        Blocky will wake you up every morning with a notification, sound, and vibration.
        You'll set daily goals across study, work, health, and creative categories.
        <span style={{ color: "var(--grass)" }}> +25 XP</span> for setting goals each day!
      </div>

      {/* Enable toggle */}
      <ToggleRow label="Morning Alarm Enabled" checked={enabled}
        onChange={setEnabled} testId="settings-alarm-enabled" />

      {/* Time picker */}
      <div>
        <label className="font-pixel text-[10px] uppercase block mb-1">Alarm Time (IST)</label>
        <div className="flex items-center gap-3">
          <input type="time" className="pixel-input" style={{ width: 160 }}
            value={time} onChange={(e) => setTime(e.target.value)}
            data-testid="settings-alarm-time" />
          <span className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>
            India Standard Time
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="p-3" style={{ background: "var(--bg-1)", border: "2px solid #000" }}>
        <div className="font-pixel text-[9px] uppercase mb-1" style={{ color: "var(--ink-muted)" }}>Preview</div>
        <div className="font-vt text-lg">
          {enabled ? (
            <span>
              <span style={{ color: "var(--gold)" }}>⏰ {time}</span>
              {" "}— Blocky will wake you up daily at this time
            </span>
          ) : (
            <span style={{ color: "var(--ink-dim)" }}>Morning alarm is disabled</span>
          )}
        </div>
      </div>

      <PixelButton variant="gold" onClick={saveAlarm} data-testid="save-alarm">
        <Save size={14} />{saved ? "Saved! ✓" : "Save Alarm Settings"}
      </PixelButton>
    </div>
  );
}
