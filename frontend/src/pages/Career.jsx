import React, { useEffect, useState } from "react";
import { Briefcase, Linkedin, Trash2, Plus, Video, Users, GraduationCap, Microscope, ExternalLink, Sparkles, Copy } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import MarkdownText from "../components/MarkdownText";
import { toast } from "sonner";

const TYPE_META = {
  video_edit: { label: "Video Edit", icon: Video, color: "var(--diamond)" },
  client: { label: "Client", icon: Users, color: "var(--grass)" },
  program: { label: "Program", icon: GraduationCap, color: "var(--gold)" },
  research: { label: "Research", icon: Microscope, color: "var(--redstone)" },
};

export default function Career() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ totals: {}, today: {} });
  const [programs, setPrograms] = useState([]);
  const [linkedin, setLinkedin] = useState("");
  const [draft, setDraft] = useState({ type: "video_edit", title: "", link: "", note: "" });
  const { profile, refresh } = useProfile() || {};

  const load = async () => {
    const [e, s, p, pr] = await Promise.all([
      api.get("/career"),
      api.get("/career/stats"),
      api.get("/career/programs"),
      api.get("/profile"),
    ]);
    setEntries(e.data); setStats(s.data); setPrograms(p.data);
    setLinkedin(pr.data.linkedin_url || "");
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.title.trim()) return;
    await api.post("/career", draft);
    showXP(40);
    setDraft({ ...draft, title: "", link: "", note: "" });
    await load(); refresh && refresh();
    toast.success("Career entry logged");
  };
  const remove = async (id) => { await api.delete(`/career/${id}`); load(); };
  const saveLinkedIn = async () => {
    await api.patch("/profile", { linkedin_url: linkedin });
    toast.success("LinkedIn saved");
    refresh && refresh();
  };

  const [recap, setRecap] = useState("");
  const [recapLoading, setRecapLoading] = useState(false);
  const genRecap = async () => {
    setRecapLoading(true);
    try {
      const r = await api.post("/ai/linkedin-recap");
      setRecap(r.data.post);
      toast.success("Weekly recap generated");
    } catch (e) {
      toast.error("Blocky couldn't generate. Try later.");
    } finally {
      setRecapLoading(false);
    }
  };
  const copyRecap = async () => {
    await navigator.clipboard.writeText(recap);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="LinkedIn" icon={<Linkedin size={12} color="#000"/>} accent="var(--diamond)" testId="linkedin-card">
          <div className="flex flex-col md:flex-row gap-2">
            <input className="pixel-input" placeholder="https://linkedin.com/in/your-handle" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} data-testid="linkedin-input"/>
            <PixelButton variant="diamond" onClick={saveLinkedIn} data-testid="save-linkedin">Save</PixelButton>
            {linkedin && (
              <a href={linkedin} target="_blank" rel="noreferrer">
                <PixelButton data-testid="open-linkedin"><ExternalLink size={14}/>Open</PixelButton>
              </a>
            )}
          </div>
          <p className="font-vt text-base mt-2" style={{color: "var(--ink-muted)"}}>
            Post one win weekly. Recruiters remember consistency, not perfection.
          </p>
        </BlockCard>

        <BlockCard title="Weekly LinkedIn Recap — AI" icon={<Sparkles size={12} color="#000"/>} accent="var(--gold)" testId="linkedin-recap-card">
          <p className="font-vt text-base mb-2" style={{color: "var(--ink-muted)"}}>
            Blocky reads your last 7 days of career log and drafts a ready-to-post LinkedIn caption. One click, copy, post.
          </p>
          <div className="flex gap-2 flex-wrap">
            <PixelButton variant="gold" onClick={genRecap} disabled={recapLoading} data-testid="gen-recap">
              <Sparkles size={14}/>{recapLoading ? "Mining..." : "Generate Recap"}
            </PixelButton>
            {recap && <PixelButton onClick={copyRecap} data-testid="copy-recap"><Copy size={14}/>Copy</PixelButton>}
          </div>
          {recap && (
            <div className="npc-box mt-3" data-testid="recap-output">
              <span style={{color: "var(--gold)"}}>[Blocky · LinkedIn Draft]</span>
              <div className="whitespace-pre-wrap mt-2"><MarkdownText>{recap}</MarkdownText></div>
            </div>
          )}
        </BlockCard>

        <BlockCard title="Log Today's Grind" icon={<Plus size={12} color="#000"/>} accent="var(--grass)" testId="career-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select className="pixel-select" value={draft.type} onChange={(e) => setDraft({...draft, type: e.target.value})} data-testid="career-type">
              {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input className="pixel-input" placeholder="Title (e.g. 'Edited reel for Client X')" value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} data-testid="career-title"/>
            <input className="pixel-input" placeholder="Link (optional)" value={draft.link} onChange={(e) => setDraft({...draft, link: e.target.value})} data-testid="career-link"/>
            <input className="pixel-input" placeholder="Note" value={draft.note} onChange={(e) => setDraft({...draft, note: e.target.value})} data-testid="career-note"/>
          </div>
          <PixelButton variant="primary" className="mt-3" onClick={add} data-testid="career-add"><Plus size={14}/>Log +40 XP</PixelButton>
        </BlockCard>

        <BlockCard title="Career Log" icon={<Briefcase size={12} color="#000"/>} accent="var(--gold)" testId="career-log">
          <ul className="space-y-2 max-h-[440px] overflow-y-auto">
            {entries.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>No entries yet. Log your first win.</div>}
            {entries.map((e) => {
              const meta = TYPE_META[e.type];
              const Icon = meta?.icon || Briefcase;
              return (
                <li key={e.id} className="flex items-start gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                  <div style={{background: meta?.color, border: "2px solid #000", padding: 6}}><Icon size={14}/></div>
                  <div className="flex-1">
                    <div>{e.title}</div>
                    <div className="text-xs" style={{color: "var(--ink-muted)"}}>{e.date} · {meta?.label}{e.note ? ` · ${e.note}` : ""}</div>
                    {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-xs" style={{color: "var(--diamond)"}}>{e.link}</a>}
                  </div>
                  <button onClick={() => remove(e.id)} className="opacity-60" data-testid={`career-del-${e.id}`}><Trash2 size={14}/></button>
                </li>
              );
            })}
          </ul>
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Totals" testId="career-totals">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <div key={k} style={{background: "var(--bg-1)", border: "2px solid #000", padding: 10}}>
                <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>{v.label}</div>
                <div className="font-vt text-2xl" style={{color: v.color}}>{stats.totals?.[k] ?? 0}</div>
                <div className="font-vt text-xs" style={{color: "var(--ink-muted)"}}>Today: {stats.today?.[k] ?? 0}</div>
              </div>
            ))}
          </div>
        </BlockCard>

        <BlockCard title="Programs & Fests" icon={<GraduationCap size={12} color="#000"/>} accent="var(--diamond)" testId="programs-card">
          <ul className="space-y-2 max-h-[500px] overflow-y-auto">
            {programs.map((p) => (
              <li key={p.name} className="p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                <div className="font-vt text-lg">{p.name}</div>
                <div className="text-xs" style={{color: "var(--ink-muted)"}}>{p.host} · #{p.tag}</div>
                <a href={p.url} target="_blank" rel="noreferrer" className="text-xs" style={{color: "var(--diamond)"}}>
                  {p.url} <ExternalLink size={10} className="inline"/>
                </a>
              </li>
            ))}
          </ul>
        </BlockCard>
      </div>
    </div>
  );
}
