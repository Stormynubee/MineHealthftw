import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Cpu, HeartPulse, Timer, Briefcase, Sparkles, CheckCircle2, Circle, Plus, Award, Swords, Star, Droplets, History } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import Pomodoro from "../components/Pomodoro";
import JEECountdown from "../components/JEECountdown";
import MarkdownText from "../components/MarkdownText";
import { getWaterReminderActive, setWaterReminderActive } from "../components/NotificationManager";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

export default function Dashboard() {
  const { summary, refresh } = useProfile() || {};
  const [tasks, setTasks] = useState([]);
  const [tip, setTip] = useState("");
  const [achievements, setAchievements] = useState([]);
  const [boss, setBoss] = useState(null);
  const [goals, setGoals] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [waterActive, setWaterActive] = useState(getWaterReminderActive);
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [pastTips, setPastTips] = useState([]);
  const [showPastTips, setShowPastTips] = useState(false);

  // Listen for external water reminder changes
  useEffect(() => {
    const handler = (e) => setWaterActive(e.detail);
    window.addEventListener("water-reminder-change", handler);
    return () => window.removeEventListener("water-reminder-change", handler);
  }, []);

  const toggleWater = () => {
    const next = !waterActive;
    setWaterReminderActive(next);
    setWaterActive(next);
    if (next) {
      toast.success("💧 Water reminders ON — every hour, Blocky will nudge you!");
    } else {
      toast.info("Water reminders stopped.");
    }
  };

  const loadTasks = async () => {
    const r = await api.get("/tasks");
    setTasks(r.data.filter((t) => !t.completed).slice(0, 6));
  };
  const loadTip = async () => {
    try {
      const r = await api.get("/ai/tip");
      setTip(r.data.tip);
    } catch {
      setTip("No tip right now. Keep mining XP!");
    }
  };

  const generateNewTip = async () => {
    setIsTipLoading(true);
    setTip("Blocky is brewing a fresh tip...");
    try {
      const r = await api.get("/ai/tip?force=true");
      setTip(r.data.tip);
      toast.success("New tip unlocked!");
      if (showPastTips) loadPastTips();
    } catch {
      setTip("Failed to generate tip.");
      toast.error("Failed to generate tip.");
    }
    setIsTipLoading(false);
  };
  const loadPastTips = async () => {
    try {
      const r = await api.get("/ai/tips/history?limit=30");
      setPastTips(Array.isArray(r.data) ? r.data : []);
    } catch {
      setPastTips([]);
    }
  };
  const togglePastTips = () => {
    const next = !showPastTips;
    setShowPastTips(next);
    if (next && pastTips.length === 0) loadPastTips();
  };
  const loadAch = async () => {
    try {
      const r = await api.get("/achievements");
      setAchievements(r.data);
    } catch {}
  };
  const loadBoss = async () => {
    try {
      const r = await api.get("/tasks/boss");
      setBoss(r.data);
    } catch {}
  };
  const loadGoals = async () => {
    try {
      const r = await api.get("/goals/today");
      if (r.data && Object.keys(r.data).some(k => k.endsWith('_goal') && r.data[k])) {
        setGoals(r.data);
      }
    } catch {}
  };

  useEffect(() => { loadTasks(); loadTip(); loadAch(); loadBoss(); loadGoals(); }, []);

  const setAsBoss = async (id) => {
    await api.patch(`/tasks/${id}/boss`);
    await loadTasks(); await loadBoss();
    toast.success("Boss Fight set! 2× XP on complete.");
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await api.post("/tasks", { title: newTask, category: "study", xp: 25 });
    setNewTask("");
    await loadTasks();
    refresh && refresh();
    toast.success("Quest added");
  };

  const toggle = async (id, xp) => {
    const r = await api.patch(`/tasks/${id}/toggle`);
    showXP(r.data.xp_awarded);
    await loadTasks();
    await loadBoss();
    refresh && refresh();
  };

  const jeeTotal = summary?.jee_total || 0;
  const jeeDone = summary?.jee_done || 0;
  const jeePct = jeeTotal ? Math.round((jeeDone / jeeTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <BlockCard title="Daily Tip from Blocky" icon={<Sparkles size={12} color="#000"/>} accent="var(--gold)" testId="tip-card" className="md:col-span-2">
          <div className="npc-box" data-testid="daily-tip">
            <span style={{color: "var(--grass)"}}>[Blocky]</span> <MarkdownText>{tip || "Loading today's quest tip..."}</MarkdownText>
          </div>
          <div className="mt-3 flex justify-between items-center">
            <button
              onClick={togglePastTips}
              className="font-vt text-sm flex items-center gap-1"
              style={{color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", padding: 0}}
            >
              <History size={14}/> {showPastTips ? "HIDE PAST TIPS" : "📜 PAST TIPS"}
            </button>
            <PixelButton variant="primary" onClick={generateNewTip} disabled={isTipLoading} style={{fontSize: "12px", padding: "6px 12px"}}>
              {isTipLoading ? "GENERATING..." : "🔄 GENERATE NEW TIP"}
            </PixelButton>
          </div>
          {showPastTips && (
            <div className="mt-3" style={{borderTop: "1px dashed var(--bg-3)", paddingTop: 12}}>
              <div className="font-pixel text-[10px] uppercase mb-2" style={{color: "var(--gold)"}}>Tip History</div>
              {pastTips.length === 0 ? (
                <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>No past tips yet. Generate your first one!</div>
              ) : (
                <div style={{maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8}}>
                  {pastTips.map((t, i) => (
                    <div key={t.id || i} style={{background: "var(--bg-1)", border: "2px solid #000", padding: "8px 10px"}}>
                      <div className="font-vt text-sm" style={{color: "var(--ink)"}}>{t.tip}</div>
                      <div className="font-pixel text-[9px] mt-1" style={{color: "var(--ink-dim)"}}>
                        {t.date} · {t.created_at ? new Date(t.created_at).toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"}) : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </BlockCard>

        {goals && (
          <BlockCard title="Today's Mission" icon={<Target size={12} color="#000"/>} accent="var(--diamond)" className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.study_goal && <div><div className="font-pixel text-[10px] text-[var(--diamond)] mb-1">STUDY</div><div className="font-vt text-lg">{goals.study_goal}</div></div>}
              {goals.work_goal && <div><div className="font-pixel text-[10px] text-[var(--gold)] mb-1">WORK</div><div className="font-vt text-lg">{goals.work_goal}</div></div>}
              {goals.health_goal && <div><div className="font-pixel text-[10px] text-[var(--grass)] mb-1">HEALTH</div><div className="font-vt text-lg">{goals.health_goal}</div></div>}
              {goals.creative_goal && <div><div className="font-pixel text-[10px] text-[var(--redstone)] mb-1">CREATIVE</div><div className="font-vt text-lg">{goals.creative_goal}</div></div>}
            </div>
            <div className="mt-3 pt-2" style={{borderTop: "1px dashed var(--bg-3)", textAlign: "right"}}>
              <Link to="/app/morning" className="font-vt text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]">Edit Goals →</Link>
            </div>
          </BlockCard>
        )}

        <BlockCard title="Quick Study Quests" icon={<BookOpen size={12} color="#000"/>} accent="var(--grass)" testId="quick-quests" className="md:col-span-2"
          action={<Link to="/app/study"><PixelButton variant="default" data-testid="goto-study">Full Board</PixelButton></Link>}>
          <div className="flex gap-2 mb-3">
            <input className="pixel-input" placeholder="Add new quest..." value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} data-testid="dash-new-task"/>
            <PixelButton variant="primary" onClick={addTask} data-testid="dash-add-task"><Plus size={14}/>Add</PixelButton>
          </div>
          {tasks.length === 0 && <p className="font-vt text-lg" style={{color: "var(--ink-muted)"}}>No pending quests. You absolute machine.</p>}
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-2" style={{background: t.is_boss ? "rgba(239,68,68,0.08)" : "var(--bg-1)", border: t.is_boss ? "2px solid var(--redstone)" : "2px solid #000"}}>
                <button className="pixel-checkbox" onClick={() => toggle(t.id, t.xp)} data-testid={`dash-toggle-${t.id}`}/>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {t.is_boss && <Swords size={14} color="var(--redstone)"/>}
                    <span>{t.title}</span>
                  </div>
                  <div className="text-xs" style={{color: "var(--ink-muted)"}}>{t.category.toUpperCase()} · +{t.is_boss ? t.xp * 2 : t.xp} XP{t.is_boss ? " (BOSS)" : ""}</div>
                </div>
                <button onClick={() => setAsBoss(t.id)} title={t.is_boss ? "Unset boss" : "Mark as today's Boss Fight (2x XP)"} data-testid={`boss-${t.id}`}>
                  <Star size={16} color={t.is_boss ? "var(--redstone)" : "var(--ink-muted)"} fill={t.is_boss ? "var(--redstone)" : "none"}/>
                </button>
              </li>
            ))}
          </ul>
        </BlockCard>

        <BlockCard title="Pomodoro Portal" icon={<Timer size={12} color="#000"/>} accent="var(--diamond)" className="md:col-span-2" testId="dash-pomodoro">
          <Pomodoro />
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        {/* ── Water Reminder Card ── */}
        <BlockCard title="Hydration Tracker" icon={<Droplets size={12} color="#000"/>} accent="var(--diamond)" testId="water-reminder-card">
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "8px 0",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 0, border: "2px solid #000",
              background: waterActive ? "var(--diamond)" : "var(--bg-3)",
              boxShadow: waterActive ? "0 0 16px rgba(59,130,246,0.4), 4px 4px 0 #000" : "4px 4px 0 #000",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.3s ease",
              animation: waterActive ? "waterPulse 2s ease-in-out infinite" : "none",
            }}>
              <Droplets size={28} color={waterActive ? "#fff" : "var(--ink-dim)"} />
            </div>
            <div className="font-vt text-center" style={{ fontSize: 16, color: waterActive ? "var(--diamond)" : "var(--ink-muted)" }}>
              {waterActive ? "⚡ Active — nudging every hour" : "Off — tap to start"}
            </div>
            <button
              onClick={toggleWater}
              className={`pixel-btn ${waterActive ? "pixel-btn-danger" : "pixel-btn-diamond"}`}
              style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
              data-testid="water-toggle"
            >
              {waterActive ? "⏹ STOP REMINDERS" : "💧 START WATER REMINDERS"}
            </button>
            {waterActive && (
              <div className="font-vt" style={{ fontSize: 13, color: "var(--ink-dim)", textAlign: "center" }}>
                Browser notifications + in-app toasts<br/>with unique Minecraft messages each hour
              </div>
            )}
          </div>
        </BlockCard>

        <BlockCard title="JEE Countdown" icon={<Swords size={12} color="#000"/>} accent="var(--redstone)" testId="jee-countdown-card">
          <JEECountdown />
        </BlockCard>

        {boss && (
          <BlockCard title="Boss Fight" icon={<Swords size={12} color="#000"/>} accent="var(--redstone)" testId="boss-card">
            <div className="font-vt text-lg mb-1" style={{color: "var(--redstone)"}}>⚔️ Defeat this today</div>
            <div className="font-vt text-xl">{boss.title}</div>
            <div className="font-pixel text-[10px] mt-2" style={{color: "var(--gold)"}}>REWARD: {boss.xp * 2} XP</div>
          </BlockCard>
        )}

        <BlockCard title="Today's Score" testId="today-score">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Focus Min" value={summary?.pomodoro_mins_today ?? 0} color="var(--diamond)"/>
            <Stat label="Meditate Min" value={summary?.meditation_mins_today ?? 0} color="var(--gold)"/>
            <Stat label="Quests" value={`${summary?.tasks?.done_today ?? 0}/${(summary?.tasks?.done_today ?? 0) + (summary?.tasks?.pending ?? 0)}`} color="var(--grass)"/>
            <Stat label="Habits" value={`${summary?.habits_done_today ?? 0}/${summary?.habits_total ?? 0}`} color="var(--grass)"/>
            <Stat label="Meds" value={`${summary?.meds_taken_today ?? 0}/${summary?.meds_total ?? 0}`} color="var(--redstone)"/>
            <Stat label="JEE Topics" value={`${jeeDone}/${jeeTotal}`} color="var(--gold)"/>
          </div>
          <div className="mt-3">
            <div className="flex justify-between font-vt text-base mb-1">
              <span style={{color: "var(--ink-muted)"}}>JEE SYLLABUS</span>
              <span style={{color: "var(--gold)"}}>{jeePct}%</span>
            </div>
            <div className="xp-bar-shell"><div className="xp-bar-fill" style={{width: `${jeePct}%`, background: "var(--gold)"}}/></div>
          </div>
        </BlockCard>

        <BlockCard title="Quick Jumps" testId="quick-jumps">
          <div className="grid grid-cols-2 gap-2">
            <JumpTile to="/app/health" icon={<HeartPulse size={14}/>} label="Health" accent="var(--redstone)"/>
            <JumpTile to="/app/meditate" icon={<Timer size={14}/>} label="Meditate" accent="var(--gold)"/>
            <JumpTile to="/app/career" icon={<Briefcase size={14}/>} label="Career" accent="var(--diamond)"/>
            <JumpTile to="/app/code" icon={<Cpu size={14}/>} label="Code & Bots" accent="var(--grass)"/>
          </div>
        </BlockCard>

        <BlockCard title="Recent Unlocks" icon={<Award size={12} color="#000"/>} accent="var(--gold)" testId="recent-achievements"
          action={<Link to="/app/achievements"><PixelButton>View All</PixelButton></Link>}>
          {achievements.filter((a) => a.unlocked).slice(0, 3).length === 0 ? (
            <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>
              Complete your first quest to unlock achievements!
            </div>
          ) : (
            <div className="space-y-2">
              {achievements.filter((a) => a.unlocked).slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1">
                    <div className="font-pixel text-[10px]">{a.name}</div>
                    <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>{a.desc}</div>
                  </div>
                </div>
              ))}
              <div className="font-vt text-base" style={{color: "var(--gold)"}}>
                {achievements.filter((a) => a.unlocked).length} / {achievements.length} unlocked
              </div>
            </div>
          )}
        </BlockCard>
      </div>
    </div>
  );
}

const Stat = ({ label, value, color }) => (
  <div style={{background: "var(--bg-1)", border: "2px solid #000", padding: 10}}>
    <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>{label}</div>
    <div className="font-vt text-2xl" style={{color}}>{value}</div>
  </div>
);
const JumpTile = ({ to, icon, label, accent }) => (
  <Link to={to} data-testid={`jump-${label.toLowerCase().replace(/ /g, "-")}`}
    className="flex flex-col items-start gap-2 p-3" style={{background: "var(--bg-1)", border: "2px solid #000", boxShadow: "3px 3px 0 #000"}}>
    <div style={{background: accent, border: "2px solid #000", padding: 6}}>{icon}</div>
    <span className="font-pixel text-[10px] uppercase">{label}</span>
  </Link>
);
