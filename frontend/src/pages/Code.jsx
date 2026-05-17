import React, { useEffect, useState } from "react";
import { Cpu, Plus, Trash2, Bot, Lightbulb, ExternalLink, Archive, Calendar } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

const CURRENT_YEAR = new Date().getFullYear();

export default function Code() {
  const [tasks, setTasks] = useState([]);
  const [category, setCategory] = useState("code");
  const [draft, setDraft] = useState({ title: "", xp: 40, note: "", year: CURRENT_YEAR, status: "active", link: "" });
  const { refresh } = useProfile() || {};

  const load = async () => {
    const [code, robo] = await Promise.all([
      api.get("/tasks", { params: { category: "code" } }),
      api.get("/tasks", { params: { category: "robotics" } }),
    ]);
    setTasks([...code.data, ...robo.data]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.title.trim()) return;
    await api.post("/tasks", { ...draft, category, year: Number(draft.year) });
    setDraft({ ...draft, title: "", note: "", link: "" });
    await load();
    toast.success(`${category === "code" ? "Code" : "Robotics"} project added`);
  };
  const toggle = async (id) => {
    const r = await api.patch(`/tasks/${id}/toggle`);
    showXP(r.data.xp_awarded);
    await load(); refresh && refresh();
  };
  const remove = async (id) => { await api.delete(`/tasks/${id}`); load(); };

  const codeTasks = tasks.filter((t) => t.category === "code");
  const roboTasks = tasks.filter((t) => t.category === "robotics");
  const activeCode = codeTasks.filter((t) => (t.status || "active") === "active" && !t.completed);
  const pastCode   = codeTasks.filter((t) => t.completed || t.status === "archived" || t.status === "completed");
  const activeRobo = roboTasks.filter((t) => (t.status || "active") === "active" && !t.completed);
  const pastRobo   = roboTasks.filter((t) => t.completed || t.status === "archived" || t.status === "completed");

  const IDEAS = [
    "Build a Chrome extension for JEE flashcards",
    "ESP32 line-follower with PID control",
    "Port your notes to a Python CLI",
    "Build a 4-DOF robotic arm with servos",
    "Train a tiny CNN on MNIST from scratch",
    "Raspberry Pi home-automation dashboard",
    "Arduino health condition medicine reminder",
    "OMR sheet grader using OpenCV",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="Add Project" icon={<Plus size={12} color="#000"/>} accent="var(--grass)" testId="add-code-goal">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="pixel-select" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="code-category">
              <option value="code">Coding</option>
              <option value="robotics">Robotics</option>
            </select>
            <input className="pixel-input md:col-span-2" placeholder="Project title..." value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} data-testid="code-title"/>
            <input type="number" className="pixel-input" placeholder="Year" value={draft.year} onChange={(e) => setDraft({...draft, year: e.target.value})} data-testid="code-year"/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
            <select className="pixel-select" value={draft.status} onChange={(e) => setDraft({...draft, status: e.target.value})} data-testid="code-status">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <input type="number" className="pixel-input" placeholder="XP" value={draft.xp} onChange={(e) => setDraft({...draft, xp: Number(e.target.value)})} data-testid="code-xp"/>
            <input className="pixel-input" placeholder="Repo / demo link" value={draft.link} onChange={(e) => setDraft({...draft, link: e.target.value})} data-testid="code-link"/>
          </div>
          <textarea className="pixel-textarea mt-2" rows={2} placeholder="Tech stack / notes..." value={draft.note} onChange={(e) => setDraft({...draft, note: e.target.value})} data-testid="code-note"/>
          <PixelButton variant="primary" className="mt-3" onClick={add} data-testid="code-add"><Plus size={14}/>Save Project</PixelButton>
          <p className="font-vt text-base mt-2" style={{color: "var(--ink-muted)"}}>
            Adding old projects? Set year to the past year and mark status as "Completed" or "Archived".
          </p>
        </BlockCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BlockCard title="Active Coding" icon={<Cpu size={12} color="#000"/>} accent="var(--diamond)" testId="coding-quests">
            <GoalList list={activeCode} toggle={toggle} remove={remove} test="code"/>
          </BlockCard>
          <BlockCard title="Active Robotics" icon={<Bot size={12} color="#000"/>} accent="var(--redstone)" testId="robotics-quests">
            <GoalList list={activeRobo} toggle={toggle} remove={remove} test="robo"/>
          </BlockCard>
        </div>

        {(pastCode.length + pastRobo.length > 0) && (
          <BlockCard title="Project Archive" icon={<Archive size={12} color="#000"/>} accent="var(--gold)" testId="archive-card">
            <div className="font-vt text-lg mb-2" style={{color: "var(--ink-muted)"}}>
              {pastCode.length + pastRobo.length} past builds — the résumé layer.
            </div>
            <ul className="space-y-2">
              {[...pastCode, ...pastRobo].sort((a,b) => (b.year || 0) - (a.year || 0)).map((t) => (
                <li key={t.id} className="flex items-start gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                  <div className="font-pixel text-[10px] px-2 py-1" style={{background: "var(--gold)", color: "#000", border: "2px solid #000", minWidth: 44, textAlign: "center"}}>{t.year || "—"}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{t.title}</span>
                      <span className="font-pixel text-[9px] px-1" style={{background: t.category === "code" ? "var(--diamond)" : "var(--redstone)", color: "#fff"}}>{t.category.toUpperCase()}</span>
                    </div>
                    {t.note && <div className="text-xs mt-1" style={{color: "var(--ink-muted)"}}>{t.note}</div>}
                    {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 mt-1" style={{color: "var(--diamond)"}}><ExternalLink size={10}/>{t.link}</a>}
                  </div>
                  <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100" data-testid={`arc-del-${t.id}`}><Trash2 size={14}/></button>
                </li>
              ))}
            </ul>
          </BlockCard>
        )}
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Idea Drop" icon={<Lightbulb size={12} color="#000"/>} accent="var(--gold)" testId="idea-drop">
          <div className="font-vt text-lg mb-2" style={{color: "var(--ink-muted)"}}>Need a new build? Pick one:</div>
          <ul className="space-y-1">
            {IDEAS.map((i) => (
              <li key={i} className="p-2 font-vt text-base cursor-pointer" style={{background: "var(--bg-1)", border: "2px solid #000"}}
                onClick={() => { setDraft({...draft, title: i, xp: 80, status: "active", year: CURRENT_YEAR}); toast("Prefilled. Add details above!"); }} data-testid={`idea-${i.slice(0,10)}`}>
                {i}
              </li>
            ))}
          </ul>
        </BlockCard>
      </div>
    </div>
  );
}

const GoalList = ({ list, toggle, remove, test }) => (
  <ul className="space-y-2 max-h-[480px] overflow-y-auto">
    {list.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>No active quests. Plant one.</div>}
    {list.map((t) => (
      <li key={t.id} className="flex items-start gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
        <button className={`pixel-checkbox ${t.completed ? "checked" : ""}`} onClick={() => toggle(t.id)} data-testid={`${test}-toggle-${t.id}`}/>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={t.completed ? "line-through opacity-60" : ""}>{t.title}</span>
            {t.year && <span className="font-pixel text-[9px]" style={{color: "var(--ink-muted)"}}><Calendar size={10} className="inline mr-1"/>{t.year}</span>}
          </div>
          {t.note && <div className="text-xs mt-1" style={{color: "var(--ink-muted)"}}>{t.note}</div>}
          {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 mt-1" style={{color: "var(--diamond)"}}><ExternalLink size={10}/>link</a>}
          <div className="text-xs mt-1" style={{color: "var(--gold)"}}>+{t.xp} XP</div>
        </div>
        <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100" data-testid={`${test}-del-${t.id}`}><Trash2 size={14}/></button>
      </li>
    ))}
  </ul>
);
