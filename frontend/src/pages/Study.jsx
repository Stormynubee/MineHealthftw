import React, { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, Atom, FlaskConical, Sigma, RotateCcw, StickyNote, ChevronDown, ChevronRight } from "lucide-react";
import { CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import Pomodoro from "../components/Pomodoro";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

const SUBJECT_META = {
  physics: { icon: Atom, color: "var(--diamond)", label: "Physics" },
  chemistry: { icon: FlaskConical, color: "var(--grass)", label: "Chemistry" },
  maths: { icon: Sigma, color: "var(--gold)", label: "Maths" },
};

const STATUS_META = [
  { val: 0, label: "New",     color: "#3F3F46" },
  { val: 1, label: "Weak",    color: "var(--redstone)" },
  { val: 2, label: "Medium",  color: "var(--gold)" },
  { val: 3, label: "Mastered", color: "var(--grass)" },
];

export default function Study() {
  const [syllabus, setSyllabus] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newXp, setNewXp] = useState(30);
  const [openSubject, setOpenSubject] = useState("physics");
  const [openClass, setOpenClass] = useState("11");
  const [expanded, setExpanded] = useState({});
  const { refresh } = useProfile() || {};

  const load = async () => {
    const [s, t, ps] = await Promise.all([
      api.get("/jee/syllabus"),
      api.get("/tasks", { params: { category: "study" } }),
      api.get("/pomodoro/stats"),
    ]);
    setSyllabus(s.data);
    setTasks(t.data);
    setStats(ps.data);
  };

  useEffect(() => { load(); }, []);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    await api.post("/tasks", { title: newTitle, category: "study", xp: newXp });
    setNewTitle("");
    await load();
    toast.success("Study quest added");
  };
  const toggle = async (id) => {
    const r = await api.patch(`/tasks/${id}/toggle`);
    showXP(r.data.xp_awarded);
    await load(); refresh && refresh();
  };
  const remove = async (id) => { await api.delete(`/tasks/${id}`); await load(); };

  const setStatus = async (topicId, status) => {
    await api.patch(`/jee/topic/${topicId}/meta`, { status });
    if (status === 3) showXP(30);
    await load(); refresh && refresh();
  };
  const saveNotes = async (topicId, notes) => {
    await api.patch(`/jee/topic/${topicId}/meta`, { notes });
  };
  const bumpRevision = async (topicId, cur) => {
    await api.patch(`/jee/topic/${topicId}/meta`, { revisions: cur + 1 });
    showXP(10);
    await load(); refresh && refresh();
  };

  const curChapters = syllabus?.syllabus?.[openSubject]?.[openClass] || [];
  // status counts
  const counts = [0,0,0,0];
  if (syllabus) {
    Object.values(syllabus.syllabus).forEach((byClass) => {
      Object.values(byClass).forEach((arr) => arr.forEach((t) => { counts[t.status || 0] += 1; }));
    });
  }
  const statusChart = STATUS_META.map((s, i) => ({ label: s.label, count: counts[i], color: s.color }));

  const subjectProgress = Object.keys(SUBJECT_META).map(subj => {
    let done = 0, tot = 0;
    if (syllabus?.syllabus?.[subj]) {
      Object.values(syllabus.syllabus[subj]).forEach(clsArr => clsArr.forEach(t => {
        tot++;
        if (t.status && t.status >= 2) done++;
      }));
    }
    return { subj, done, tot, pct: tot ? (done / tot) * 100 : 0, meta: SUBJECT_META[subj] };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="JEE Journey" icon={<Atom size={12} color="#000"/>} accent="var(--diamond)">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {subjectProgress.map(s => {
              const Icon = s.meta.icon;
              return (
                <div key={s.subj} className="p-3" style={{background: "var(--bg-1)", border: "2px solid #000", boxShadow: `2px 2px 0 ${s.meta.color}`}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-pixel text-[10px] uppercase" style={{color: s.meta.color}}>
                      <Icon size={12}/> {s.meta.label}
                    </div>
                    <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>{s.done}/{s.tot}</div>
                  </div>
                  <div className="xp-bar-shell" style={{height: 10}}>
                    <div className="xp-bar-fill" style={{width: `${s.pct}%`, background: s.meta.color}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </BlockCard>

        <BlockCard title="JEE Syllabus — Mastery Tracker" icon={<BookOpen size={12} color="#000"/>} accent="var(--gold)" testId="jee-tracker">
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.keys(SUBJECT_META).map((s) => {
              const { icon: Icon, label } = SUBJECT_META[s];
              return (
                <button key={s} onClick={() => setOpenSubject(s)} className={`hotbar-slot ${openSubject === s ? "active" : ""}`} data-testid={`subject-${s}`}>
                  <Icon size={12} className="inline mr-1"/>{label}
                </button>
              );
            })}
            <div className="ml-auto flex gap-2">
              {["11", "12"].map((c) => (
                <button key={c} onClick={() => setOpenClass(c)} className={`hotbar-slot ${openClass === c ? "active" : ""}`} data-testid={`class-${c}`}>Class {c}</button>
              ))}
            </div>
          </div>

          {syllabus && (
            <>
              <div className="font-vt text-base mb-2" style={{color: "var(--ink-muted)"}}>
                Mastered: <span style={{color: "var(--grass)"}}>{syllabus.mastered}</span> · Covered: <span style={{color: "var(--gold)"}}>{syllabus.done}</span> / <span>{syllabus.total}</span>
              </div>
              <div className="xp-bar-shell mb-4">
                <div className="xp-bar-fill" style={{width: `${(syllabus.done/syllabus.total)*100}%`, background: "var(--gold)"}}/>
              </div>
              <ul className="space-y-2">
                {curChapters.map((topic) => {
                  const isOpen = expanded[topic.id];
                  const sMeta = STATUS_META[topic.status || 0];
                  return (
                    <li key={topic.id} className="p-2" style={{background: "var(--bg-1)", border: `2px solid ${topic.status >= 2 ? sMeta.color : "#000"}`}}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setExpanded({...expanded, [topic.id]: !isOpen})} data-testid={`expand-${topic.id}`}>
                          {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>
                        <span className="flex-1">{topic.chapter}</span>
                        <span className="font-pixel text-[9px] px-2 py-1" style={{background: sMeta.color, color: "#000"}}>{sMeta.label}</span>
                        <span className="font-pixel text-[9px]" style={{color: "var(--ink-muted)"}}>×{topic.revisions || 0}</span>
                      </div>
                      {isOpen && (
                        <div className="mt-3 pl-6 space-y-2">
                          <div className="flex gap-1 flex-wrap">
                            {STATUS_META.map((s) => (
                              <button key={s.val}
                                onClick={() => setStatus(topic.id, s.val)}
                                className="font-pixel text-[9px] px-2 py-1 uppercase"
                                style={{
                                  background: topic.status === s.val ? s.color : "var(--bg-2)",
                                  color: topic.status === s.val ? "#000" : "var(--ink-muted)",
                                  border: "2px solid #000",
                                  boxShadow: "2px 2px 0 #000",
                                  cursor: "pointer",
                                }}
                                data-testid={`status-${topic.id}-${s.val}`}>
                                {s.label}
                              </button>
                            ))}
                            <button onClick={() => bumpRevision(topic.id, topic.revisions || 0)}
                              className="ml-auto font-pixel text-[9px] px-2 py-1 uppercase flex items-center gap-1"
                              style={{background: "var(--diamond)", color: "#fff", border: "2px solid #000", boxShadow: "2px 2px 0 #000"}}
                              data-testid={`revise-${topic.id}`}>
                              <RotateCcw size={10}/>REVISE +10
                            </button>
                          </div>
                          <textarea
                            className="pixel-textarea font-vt"
                            rows={2}
                            defaultValue={topic.notes}
                            placeholder="Notes, formulas, tricky concepts..."
                            onBlur={(e) => saveNotes(topic.id, e.target.value)}
                            data-testid={`notes-${topic.id}`}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </BlockCard>

        <BlockCard title="Study Quests" icon={<BookOpen size={12} color="#000"/>} accent="var(--grass)" testId="study-quests">
          <div className="flex gap-2 mb-3 flex-wrap">
            <input className="pixel-input" placeholder="Add study quest..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} data-testid="study-new-title"/>
            <input type="number" className="pixel-input w-24" value={newXp} onChange={(e) => setNewXp(Number(e.target.value))} data-testid="study-new-xp"/>
            <PixelButton variant="primary" onClick={addTask} data-testid="study-add"><Plus size={14}/>Add</PixelButton>
          </div>
          <ul className="space-y-2 max-h-[400px] overflow-y-auto">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                <button className={`pixel-checkbox ${t.completed ? "checked" : ""}`} onClick={() => toggle(t.id)} data-testid={`study-toggle-${t.id}`}/>
                <div className="flex-1">
                  <div className={t.completed ? "line-through opacity-60" : ""}>{t.title}</div>
                  <div className="text-xs" style={{color: "var(--ink-muted)"}}>+{t.xp} XP</div>
                </div>
                <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100" data-testid={`study-delete-${t.id}`}><Trash2 size={14}/></button>
              </li>
            ))}
            {tasks.length === 0 && <div className="font-vt text-lg" style={{color: "var(--ink-muted)"}}>No study quests yet. Add your first mission.</div>}
          </ul>
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Pomodoro" accent="var(--diamond)" testId="study-pomodoro">
          <Pomodoro />
        </BlockCard>

        <BlockCard title="Mastery Map" testId="mastery-map">
          <div style={{height: 170}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46"/>
                <XAxis dataKey="label" stroke="#A1A1AA" fontSize={10} fontFamily="JetBrains Mono"/>
                <YAxis stroke="#A1A1AA" fontSize={10} fontFamily="JetBrains Mono"/>
                <Tooltip contentStyle={{background: "#18181B", border: "2px solid #000", fontFamily: "JetBrains Mono"}}/>
                <Bar dataKey="count" fill="#22C55E"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BlockCard>

        <BlockCard title="7-Day Focus" testId="focus-chart">
          <div style={{height: 150}}>
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46"/>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#A1A1AA" fontSize={10}/>
                  <YAxis stroke="#A1A1AA" fontSize={10}/>
                  <Tooltip contentStyle={{background: "#18181B", border: "2px solid #000"}}/>
                  <Bar dataKey="minutes" fill="#22C55E"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 font-vt text-base">
            Total: <span style={{color: "var(--grass)"}}>{stats?.total_minutes ?? 0} min</span> · <span style={{color: "var(--diamond)"}}>{stats?.sessions ?? 0} sessions</span>
          </div>
        </BlockCard>
      </div>
    </div>
  );
}
