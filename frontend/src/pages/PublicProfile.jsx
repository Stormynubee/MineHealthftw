import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Flame, ArrowLeft, Share2, Check, Linkedin, ExternalLink, Github } from "lucide-react";
import { api } from "../lib/api";
import PixelButton from "../components/PixelButton";
import XPBar from "../components/XPBar";
import { toast } from "sonner";
import { Toaster } from "sonner";

export default function PublicProfile() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/public-profile").then((r) => setData(r.data)); }, []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Life Blocks Profile", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {}
  };

  if (!data) return <div className="font-vt text-xl p-8">Loading player profile...</div>;
  const p = data.profile;
  const unlocked = data.achievements.filter((a) => a.unlocked);
  const locked = data.achievements.filter((a) => !a.unlocked);
  const jeePct = data.stats.jee_total ? Math.round((data.stats.jee_done / data.stats.jee_total) * 100) : 0;

  return (
    <div style={{background: "var(--bg-1)", minHeight: "100vh"}}>
      <nav className="flex items-center justify-between px-6 py-4" style={{borderBottom: "2px solid #000", background: "var(--bg-0)"}}>
        <Link to="/" className="flex items-center gap-2" data-testid="back-home">
          <ArrowLeft size={16}/>
          <div style={{width: 24, height: 24, background: "var(--grass)", border: "2px solid #000"}}/>
          <div className="font-pixel text-sm">LIFE BLOCKS</div>
        </Link>
        <div className="flex gap-2">
          <PixelButton onClick={share} data-testid="share-btn"><Share2 size={14}/>Share</PixelButton>
          <Link to="/app"><PixelButton variant="primary">Enter Dashboard</PixelButton></Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Banner */}
        <div className="block-card-raised p-6 md:p-8 mb-8" style={{background: "linear-gradient(135deg, var(--bg-0), var(--bg-2))"}}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div style={{width: 96, height: 96, background: p.avatar_color || "var(--grass)", border: "3px solid #000", boxShadow: "6px 6px 0 #000", display: "flex", alignItems: "center", justifyContent: "center"}}>
              <Trophy size={48} color="#000"/>
            </div>
            <div className="flex-1 w-full">
              <div className="font-pixel text-2xl md:text-3xl" data-testid="public-name">{p.name}</div>
              <div className="font-vt text-xl mt-1" style={{color: "var(--ink-muted)"}}>LEVEL {p.level} · {p.total_xp} TOTAL XP</div>
              <div className="mt-3">
                <XPBar value={p.xp_in_level} max={p.xp_for_next}/>
                <div className="flex justify-between font-vt text-base mt-1">
                  <span style={{color: "var(--ink-muted)"}}>XP to next</span>
                  <span style={{color: "var(--grass)"}}>{p.xp_in_level} / {p.xp_for_next}</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Flame size={32} color="var(--redstone)" className="pulse-streak mx-auto"/>
              <div className="font-pixel text-2xl" style={{color: "var(--redstone)"}}>{p.streak}</div>
              <div className="font-pixel text-[10px]" style={{color: "var(--ink-muted)"}}>DAY STREAK</div>
            </div>
          </div>
          {p.bio && (
            <div className="font-vt text-lg mt-3" style={{color: "var(--ink-muted)"}}>{p.bio}</div>
          )}
          <div className="flex gap-2 mt-4 flex-wrap">
            {p.linkedin_url && (
              <a href={p.linkedin_url} target="_blank" rel="noreferrer" data-testid="public-linkedin">
                <PixelButton variant="diamond"><Linkedin size={14}/>LinkedIn<ExternalLink size={12}/></PixelButton>
              </a>
            )}
            {p.github_url && (
              <a href={p.github_url} target="_blank" rel="noreferrer" data-testid="public-github">
                <PixelButton><Github size={14}/>GitHub<ExternalLink size={12}/></PixelButton>
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatBox label="Achievements" value={`${data.unlocked_count}/${data.achievements.length}`} c="var(--gold)"/>
          <StatBox label="JEE Done" value={`${data.stats.jee_done}/${data.stats.jee_total}`} c="var(--diamond)"/>
          <StatBox label="Focus Min" value={data.stats.pomo_mins} c="var(--grass)"/>
          <StatBox label="Meditation" value={`${data.stats.meditation_mins} min`} c="var(--gold)"/>
        </div>

        {/* Achievements */}
        <h2 className="font-pixel text-xl mb-4" style={{textShadow: "2px 2px 0 #000"}}>ACHIEVEMENTS</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-10">
          {[...unlocked, ...locked].map((a) => (
            <div key={a.id} className={a.unlocked ? "block-card-static p-4" : "p-4"} style={{
              background: a.unlocked ? "var(--bg-2)" : "var(--bg-0)",
              opacity: a.unlocked ? 1 : 0.45,
              border: "2px solid #000",
              boxShadow: a.unlocked ? "4px 4px 0 #000" : "2px 2px 0 #000",
            }} data-testid={`achievement-${a.id}`}>
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-pixel text-[11px] mb-1">{a.name}</div>
              <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>{a.desc}</div>
              <div className="font-vt text-xs mt-2" style={{color: a.unlocked ? "var(--grass)" : "var(--ink-dim)"}}>
                {a.unlocked ? "✓ UNLOCKED" : `${a.progress.cur}/${a.progress.target}`}
              </div>
            </div>
          ))}
        </div>

        {/* Recent wins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="block-card-static p-5">
            <h3 className="font-pixel text-sm mb-3">RECENT QUESTS</h3>
            {data.recent_tasks.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>Nothing yet.</div>}
            <ul className="space-y-1">
              {data.recent_tasks.map((t) => (
                <li key={t.id} className="font-vt text-base flex items-center gap-2">
                  <Check size={14} color="var(--grass)"/>
                  <span className="flex-1">{t.title}</span>
                  <span className="text-xs" style={{color: "var(--ink-muted)"}}>+{t.xp}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="block-card-static p-5">
            <h3 className="font-pixel text-sm mb-3">CAREER LOG</h3>
            {data.recent_career.length === 0 && <div className="font-vt text-base" style={{color: "var(--ink-muted)"}}>No entries yet.</div>}
            <ul className="space-y-1">
              {data.recent_career.map((c) => (
                <li key={c.id} className="font-vt text-base">
                  <span style={{color: "var(--ink-muted)"}}>{c.date}</span> · <span style={{color: "var(--diamond)"}}>{c.type}</span> · {c.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}

const StatBox = ({ label, value, c }) => (
  <div style={{background: "var(--bg-2)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", padding: 14}}>
    <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>{label}</div>
    <div className="font-vt text-2xl" style={{color: c}}>{value}</div>
  </div>
);
