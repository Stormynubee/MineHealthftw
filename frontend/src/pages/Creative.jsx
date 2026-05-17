import React, { useEffect, useState } from "react";
import { Palette, Plus, Trash2, BookOpenCheck, Lightbulb, Save } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

const COLORS = ["var(--grass)", "var(--diamond)", "var(--gold)", "var(--redstone)", "#A855F7", "#EC4899"];

export default function Creative() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [ideas, setIdeas] = useState(["", "", ""]);
  const [ideaDoc, setIdeaDoc] = useState(null);
  const [recent, setRecent] = useState([]);
  const [flashcards, setFlashcards] = useState(() => JSON.parse(localStorage.getItem("flashcards") || "[]"));
  const [front, setFront] = useState(""); const [back, setBack] = useState("");
  const [flip, setFlip] = useState({});
  const { refresh } = useProfile() || {};

  const load = async () => {
    const [r, i, rec] = await Promise.all([
      api.get("/tasks", { params: { category: "creative" } }),
      api.get("/ideas/today"),
      api.get("/ideas/recent"),
    ]);
    setTasks(r.data);
    setIdeaDoc(i.data);
    setRecent(rec.data);
    if (i.data.ideas?.length) {
      const arr = [...i.data.ideas];
      while (arr.length < 3) arr.push("");
      setIdeas(arr);
    }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { localStorage.setItem("flashcards", JSON.stringify(flashcards)); }, [flashcards]);

  const saveIdeas = async () => {
    const filled = ideas.filter((i) => i && i.trim());
    if (filled.length < 3) {
      toast.error(`You need at least 3 ideas. Currently: ${filled.length}`);
      return;
    }
    try {
      const r = await api.post("/ideas/day", { ideas: filled });
      if (r.data.xp_awarded > 0) showXP(r.data.xp_awarded);
      toast.success(`${r.data.count} ideas saved${r.data.xp_awarded ? ` · +${r.data.xp_awarded} XP` : " · updated"}`);
      await load(); refresh && refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    }
  };
  const addSlot = () => setIdeas([...ideas, ""]);
  const updateIdea = (i, v) => {
    const copy = [...ideas];
    copy[i] = v;
    setIdeas(copy);
  };
  const removeSlot = (i) => {
    if (ideas.length <= 3) return;
    setIdeas(ideas.filter((_, idx) => idx !== i));
  };

  const add = async () => {
    if (!newTitle.trim()) return;
    await api.post("/tasks", { title: newTitle, category: "creative", xp: 25 });
    setNewTitle("");
    await load(); toast.success("Creative quest added");
  };
  const toggle = async (id) => {
    const r = await api.patch(`/tasks/${id}/toggle`);
    showXP(r.data.xp_awarded);
    await load(); refresh && refresh();
  };
  const remove = async (id) => { await api.delete(`/tasks/${id}`); load(); };

  const addCard = () => {
    if (!front.trim() || !back.trim()) return;
    setFlashcards([{ id: Date.now().toString(), front, back, color: COLORS[flashcards.length % COLORS.length] }, ...flashcards]);
    setFront(""); setBack("");
    toast.success("Flashcard added");
  };
  const delCard = (id) => setFlashcards(flashcards.filter((c) => c.id !== id));

  const filledCount = ideas.filter((i) => i && i.trim()).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-7 flex flex-col gap-5">
        <BlockCard title="Today's 3 Ideas (minimum)" icon={<Lightbulb size={12} color="#000"/>} accent="var(--gold)" testId="daily-ideas">
          <p className="font-vt text-lg mb-3" style={{color: "var(--ink-muted)"}}>
            Drop at least 3 creative ideas today — startup, video, coding project, meme, anything. +30 XP on save, +10 XP per bonus idea beyond 3.
          </p>
          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="font-pixel text-sm px-3 py-2" style={{background: idea.trim() ? "var(--gold)" : "var(--bg-1)", color: idea.trim() ? "#000" : "var(--ink-muted)", border: "2px solid #000", boxShadow: "2px 2px 0 #000", minWidth: 40, textAlign: "center"}}>{i+1}</div>
                <input
                  className="pixel-input"
                  placeholder={`Idea ${i+1}${i < 3 ? " (required)" : ""}...`}
                  value={idea}
                  onChange={(e) => updateIdea(i, e.target.value)}
                  data-testid={`idea-${i}`}
                />
                {i >= 3 && (
                  <button onClick={() => removeSlot(i)} className="opacity-60" data-testid={`remove-idea-${i}`}><Trash2 size={14}/></button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <PixelButton variant="gold" onClick={saveIdeas} disabled={filledCount < 3} data-testid="save-ideas">
              <Save size={14}/>Save ({filledCount}/3 min)
            </PixelButton>
            <PixelButton onClick={addSlot} data-testid="add-idea-slot"><Plus size={14}/>Add more</PixelButton>
          </div>
          {ideaDoc?.ideas?.length >= 3 && (
            <div className="mt-3 font-vt text-base" style={{color: "var(--grass)"}}>
              ✓ Saved today at {ideaDoc.updated_at?.slice(11, 16)} — {ideaDoc.ideas.length} ideas locked.
            </div>
          )}
        </BlockCard>

        {recent.length > 0 && (
          <BlockCard title="Recent Idea Journal" testId="recent-ideas">
            <ul className="space-y-3">
              {recent.slice(0, 7).map((d) => (
                <li key={d.id} style={{background: "var(--bg-1)", border: "2px solid #000", padding: 10}}>
                  <div className="font-pixel text-[10px] mb-1" style={{color: "var(--gold)"}}>{d.date} · {d.ideas.length} ideas</div>
                  <ol className="font-vt text-base list-decimal list-inside" style={{color: "var(--ink)"}}>
                    {d.ideas.map((i, idx) => <li key={idx}>{i}</li>)}
                  </ol>
                </li>
              ))}
            </ul>
          </BlockCard>
        )}

        <BlockCard title="Creative Quests" icon={<Palette size={12} color="#000"/>} accent="var(--grass)" testId="creative-quests">
          <div className="flex gap-2 mb-3">
            <input className="pixel-input" placeholder="e.g. Design YouTube thumbnail..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} data-testid="creative-input"/>
            <PixelButton variant="primary" onClick={add} data-testid="creative-add"><Plus size={14}/>Add</PixelButton>
          </div>
          <ul className="space-y-2">
            {tasks.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>No creative quests. Drop one.</div>}
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                <button className={`pixel-checkbox ${t.completed ? "checked" : ""}`} onClick={() => toggle(t.id)} data-testid={`creative-toggle-${t.id}`}/>
                <div className="flex-1"><span className={t.completed ? "line-through opacity-60" : ""}>{t.title}</span></div>
                <span className="font-pixel text-[10px]" style={{color: "var(--gold)"}}>+{t.xp} XP</span>
                <button onClick={() => remove(t.id)} className="opacity-60" data-testid={`creative-del-${t.id}`}><Trash2 size={14}/></button>
              </li>
            ))}
          </ul>
        </BlockCard>

        <BlockCard title="Flashcards" icon={<BookOpenCheck size={12} color="#000"/>} accent="var(--diamond)" testId="flashcards">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input className="pixel-input" placeholder="Front" value={front} onChange={(e) => setFront(e.target.value)} data-testid="card-front"/>
            <input className="pixel-input" placeholder="Back" value={back} onChange={(e) => setBack(e.target.value)} data-testid="card-back"/>
          </div>
          <PixelButton variant="diamond" className="mt-2" onClick={addCard} data-testid="add-card"><Plus size={14}/>Add Card</PixelButton>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {flashcards.map((c) => (
              <button key={c.id} onClick={() => setFlip({...flip, [c.id]: !flip[c.id]})}
                className="p-4 text-left min-h-[120px] relative"
                style={{background: c.color, color: "#000", border: "2px solid #000", boxShadow: "4px 4px 0 #000", fontFamily: "VT323"}}
                data-testid={`card-${c.id}`}>
                <div className="font-pixel text-[9px] uppercase mb-2">{flip[c.id] ? "BACK" : "FRONT"}</div>
                <div className="text-xl leading-snug">{flip[c.id] ? c.back : c.front}</div>
                <button onClick={(e) => { e.stopPropagation(); delCard(c.id); }} className="absolute top-2 right-2"><Trash2 size={12}/></button>
              </button>
            ))}
          </div>
        </BlockCard>
      </div>

      <div className="lg:col-span-5">
        <BlockCard title="Scratch Notepad" testId="notepad">
          <NotePad />
        </BlockCard>
      </div>
    </div>
  );
}

const NotePad = () => {
  const [note, setNote] = useState(() => localStorage.getItem("scratchpad") || "");
  useEffect(() => { localStorage.setItem("scratchpad", note); }, [note]);
  return (
    <div>
      <textarea
        className="pixel-textarea font-vt"
        rows={20}
        placeholder="Brain-dump here. Ideas. Memes. Formulas. It saves locally."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{fontSize: 18, lineHeight: 1.4}}
        data-testid="notepad-area"
      />
      <div className="font-vt text-base mt-2" style={{color: "var(--ink-muted)"}}>
        Words: <span style={{color: "var(--grass)"}}>{note.trim().split(/\s+/).filter(Boolean).length}</span> · auto-saved
      </div>
    </div>
  );
};
