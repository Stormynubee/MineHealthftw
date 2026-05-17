import React, { useEffect, useState } from "react";
import { HeartPulse, Pill, Plus, Trash2, Leaf, Droplets, CheckCircle2, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import MarkdownText from "../components/MarkdownText";
import { toast } from "sonner";

export default function Health() {
  const [habits, setHabits] = useState(null);
  const [habitStats, setHabitStats] = useState(null);
  const [meds, setMeds] = useState([]);
  const [skin issueLogs, setSkin IssueLogs] = useState([]);
  const [newMed, setNewMed] = useState({ name: "", time: "08:00", notes: "" });
  const [skin issue, setSkin Issue] = useState({ severity: 3, no_sugar: true, no_oil: true, meditation: false, note: "" });
  const { refresh } = useProfile() || {};

  const load = async () => {
    const [h, hs, m, a] = await Promise.all([
      api.get("/habits/today"),
      api.get("/habits/stats", { params: { days: 7 } }),
      api.get("/meds"),
      api.get("/skin issue-log"),
    ]);
    setHabits(h.data); setHabitStats(hs.data); setMeds(m.data); setSkin IssueLogs(a.data);
  };
  useEffect(() => { load(); }, []);

  const toggleHabit = async (habit, xp) => {
    const r = await api.post("/habits/toggle", { habit });
    showXP(r.data.done ? xp : -xp);
    await load(); refresh && refresh();
  };

  const addMed = async () => {
    if (!newMed.name.trim()) return;
    await api.post("/meds", newMed);
    setNewMed({ name: "", time: "08:00", notes: "" });
    await load();
    toast.success("Med reminder added");
  };

  const takeMed = async (id) => {
    const r = await api.patch(`/meds/${id}/taken`);
    showXP(r.data.taken_today ? 15 : -15);
    await load(); refresh && refresh();
  };

  const deleteMed = async (id) => { await api.delete(`/meds/${id}`); load(); };

  const submitSkin Issue = async () => {
    await api.post("/skin issue-log", skin issue);
    const pts = (skin issue.no_sugar + skin issue.no_oil + skin issue.meditation) * 10;
    showXP(pts);
    toast.success("Skin Issue log saved");
    await load(); refresh && refresh();
  };

  const [skinInsight, setSkinInsight] = useState("");
  const [skinLoading, setSkinLoading] = useState(false);
  const analyzeSkin = async () => {
    setSkinLoading(true);
    try {
      const r = await api.post("/ai/skin-analysis");
      setSkinInsight(r.data.insight);
    } catch {
      toast.error("Analysis failed. Try again.");
    } finally {
      setSkinLoading(false);
    }
  };

  const health conditionRules = [
    { key: "no_sugar", label: "No Sugar" },
    { key: "no_oil", label: "No Oil" },
    { key: "no_junk", label: "No Junk Food" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="Daily Habits" icon={<Leaf size={12} color="#000"/>} accent="var(--grass)" testId="habits-card">
          {habits && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {habits.habits.map((h) => (
                <button key={h.key} onClick={() => toggleHabit(h.key, h.xp)}
                  className="flex items-center gap-3 p-3 text-left"
                  style={{background: h.done ? "var(--bg-3)" : "var(--bg-1)", border: "2px solid #000", boxShadow: "3px 3px 0 #000"}}
                  data-testid={`habit-${h.key}`}>
                  <div className={`pixel-checkbox ${h.done ? "checked" : ""}`}/>
                  <div className="flex-1">
                    <div className={h.done ? "line-through opacity-70" : ""}>{h.label}</div>
                    <div className="text-xs" style={{color: "var(--gold)"}}>+{h.xp} XP</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </BlockCard>

        <BlockCard title="Health Condition Meds Reminder" icon={<Pill size={12} color="#000"/>} accent="var(--redstone)" testId="meds-card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="pixel-input" placeholder="Med name" value={newMed.name} onChange={(e) => setNewMed({...newMed, name: e.target.value})} data-testid="med-name"/>
            <input type="time" className="pixel-input" value={newMed.time} onChange={(e) => setNewMed({...newMed, time: e.target.value})} data-testid="med-time"/>
            <input className="pixel-input" placeholder="Notes" value={newMed.notes} onChange={(e) => setNewMed({...newMed, notes: e.target.value})} data-testid="med-notes"/>
            <PixelButton variant="danger" onClick={addMed} data-testid="add-med"><Plus size={14}/>Add</PixelButton>
          </div>
          <ul className="mt-3 space-y-2">
            {meds.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>No meds yet. Add the health condition regimen.</div>}
            {meds.map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                <button className={`pixel-checkbox ${m.taken_today ? "checked" : ""}`} onClick={() => takeMed(m.id)} data-testid={`take-med-${m.id}`}/>
                <div className="flex-1">
                  <div>{m.name}</div>
                  <div className="text-xs" style={{color: "var(--ink-muted)"}}>⏰ {m.time}{m.notes ? ` · ${m.notes}` : ""}</div>
                </div>
                <span className="font-pixel text-[10px]" style={{color: m.taken_today ? "var(--grass)" : "var(--redstone)"}}>
                  {m.taken_today ? "TAKEN" : "PENDING"}
                </span>
                <button onClick={() => deleteMed(m.id)} data-testid={`del-med-${m.id}`} className="opacity-60"><Trash2 size={14}/></button>
              </li>
            ))}
          </ul>
        </BlockCard>

        <BlockCard title="Skin Issue & Skin Check" icon={<Droplets size={12} color="#000"/>} accent="var(--diamond)" testId="skin issue-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-pixel text-[10px] uppercase">Severity (1-5)</label>
              <input type="range" min="1" max="5" value={skin issue.severity} onChange={(e) => setSkin Issue({...skin issue, severity: Number(e.target.value)})} className="w-full" data-testid="skin issue-severity"/>
              <div className="font-vt text-lg" style={{color: skin issue.severity >= 4 ? "var(--redstone)" : "var(--grass)"}}>Level {skin issue.severity}</div>
              <textarea className="pixel-textarea mt-2" rows={2} placeholder="Today's notes (foods, triggers)..." value={skin issue.note} onChange={(e) => setSkin Issue({...skin issue, note: e.target.value})} data-testid="skin issue-note"/>
            </div>
            <div className="space-y-2">
              {["no_sugar", "no_oil", "meditation"].map((k) => (
                <label key={k} className="flex items-center gap-3 p-2 cursor-pointer" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                  <input type="checkbox" checked={skin issue[k]} onChange={(e) => setSkin Issue({...skin issue, [k]: e.target.checked})} data-testid={`skin issue-${k}`}/>
                  <span className="capitalize">{k.replace("_", " ")}</span>
                  <span className="ml-auto text-xs" style={{color: "var(--gold)"}}>+10 XP</span>
                </label>
              ))}
              <PixelButton variant="diamond" onClick={submitSkin Issue} className="w-full" data-testid="skin issue-submit"><CheckCircle2 size={14}/>Save Today's Log</PixelButton>
            </div>
          </div>
          {skin issueLogs.length > 0 && (
            <div className="mt-4">
              <div className="font-pixel text-[10px] uppercase mb-2" style={{color: "var(--ink-muted)"}}>Recent logs</div>
              <ul className="space-y-1">
                {skin issueLogs.slice(0, 5).map((l) => (
                  <li key={l.id} className="font-vt text-base p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                    <span style={{color: "var(--ink-muted)"}}>{l.date}</span> · severity {l.severity}
                    {l.no_sugar && " · no-sugar"}{l.no_oil && " · no-oil"}{l.meditation && " · med"}
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <PixelButton variant="diamond" onClick={analyzeSkin} disabled={skinLoading} data-testid="analyze-skin">
                  <Sparkles size={14}/>{skinLoading ? "Analyzing..." : "AI Pattern Analysis"}
                </PixelButton>
                {skinInsight && (
                  <div className="npc-box mt-3" data-testid="skin-insight">
                    <span style={{color: "var(--diamond)"}}>[Blocky · Skin Analyst]</span>
                    <div className="whitespace-pre-wrap mt-2"><MarkdownText>{skinInsight}</MarkdownText></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Health Condition Rules" accent="var(--redstone)" testId="rules-card">
          <ul className="space-y-2">
            {health conditionRules.map((r) => {
              const done = habits?.habits?.find((h) => h.key === r.key)?.done;
              return (
                <li key={r.key} className="flex items-center gap-2 font-vt text-base">
                  <span style={{color: done ? "var(--grass)" : "var(--redstone)"}}>{done ? "✓" : "✗"}</span>
                  <span>{r.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 font-vt text-base" style={{color: "var(--ink-muted)"}}>
            Oil + sugar = inflammation trigger for health condition. Stick to rules for bonus XP and clear skin.
          </div>
        </BlockCard>

        <BlockCard title="7-Day Habit Score" testId="habits-chart">
          <div style={{height: 180}}>
            {habitStats && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={habitStats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46"/>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#A1A1AA" fontSize={10}/>
                  <YAxis stroke="#A1A1AA" fontSize={10}/>
                  <Tooltip contentStyle={{background: "#18181B", border: "2px solid #000"}}/>
                  <Line type="step" dataKey="count" stroke="#22C55E" strokeWidth={3} dot={{fill: "#22C55E"}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </BlockCard>

        <BlockCard title="Food Buddy" accent="var(--gold)" testId="food-buddy">
          <div className="npc-box">
            <span style={{color: "var(--gold)"}}>[Blocky]</span> Remember buddy: meals at <b>8am · 1pm · 7pm</b>. Hydrate between them. No oily snacks — your skin remembers everything.
          </div>
        </BlockCard>
      </div>
    </div>
  );
}
