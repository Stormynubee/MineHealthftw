import React, { useEffect, useState } from "react";
import { Target, Trash2, Smartphone, Youtube, Instagram, Twitter, MoreHorizontal, AlertTriangle } from "lucide-react";
import { BarChart, Bar, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

const SOURCES = [
  { key: "phone",     label: "Phone",     icon: Smartphone,      color: "var(--redstone)" },
  { key: "youtube",   label: "YouTube",   icon: Youtube,         color: "#FF0000" },
  { key: "instagram", label: "Instagram", icon: Instagram,       color: "#E4405F" },
  { key: "twitter",   label: "Twitter/X", icon: Twitter,         color: "#1DA1F2" },
  { key: "other",     label: "Other",     icon: MoreHorizontal,  color: "var(--ink-muted)" },
];

export default function Focus() {
  const [today, setToday] = useState(null);
  const [stats, setStats] = useState(null);
  const [source, setSource] = useState("phone");
  const [mins, setMins] = useState(10);
  const [note, setNote] = useState("");
  const { refresh } = useProfile() || {};

  const load = async () => {
    const [t, s] = await Promise.all([
      api.get("/distractions/today"),
      api.get("/distractions/stats", { params: { days: 7 } }),
    ]);
    setToday(t.data);
    setStats(s.data);
  };
  useEffect(() => { load(); }, []);

  const log = async (s = source, m = mins) => {
    if (m < 1) return;
    try {
      const r = await api.post("/distractions", { source: s, duration_mins: Number(m), note });
      showXP(r.data.xp_penalty);
      toast.error(`Distraction logged: -${Math.abs(r.data.xp_penalty)} XP`);
      setNote("");
      await load(); refresh && refresh();
    } catch (e) {
      toast.error("Failed to log");
    }
  };

  const remove = async (id) => {
    await api.delete(`/distractions/${id}`);
    await load();
  };

  const totalToday = today?.total_minutes || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="Log a Distraction" icon={<Target size={12} color="#000"/>} accent="var(--redstone)" testId="focus-log">
          <p className="font-vt text-lg mb-3" style={{color: "var(--ink-muted)"}}>
            Honest accountability. Every minute lost costs XP. Pick the source, enter minutes, log it.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {SOURCES.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => setSource(s.key)}
                  className={`flex flex-col items-center gap-1 p-3 ${source === s.key ? "" : "opacity-60"}`}
                  style={{background: "var(--bg-1)", border: `2px solid ${source === s.key ? s.color : "#000"}`, boxShadow: "3px 3px 0 #000"}}
                  data-testid={`src-${s.key}`}>
                  <div style={{background: s.color, padding: 6, border: "2px solid #000"}}><Icon size={16} color="#fff"/></div>
                  <span className="font-pixel text-[9px] uppercase">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="font-pixel text-[10px] uppercase" style={{color: "var(--ink-muted)"}}>Minutes lost</label>
              <input type="number" min="1" max="480" value={mins} onChange={(e) => setMins(Math.max(1, Number(e.target.value) || 1))} className="pixel-input mt-1" data-testid="focus-mins"/>
            </div>
            <div className="md:col-span-2">
              <label className="font-pixel text-[10px] uppercase" style={{color: "var(--ink-muted)"}}>Note (optional)</label>
              <input className="pixel-input mt-1" placeholder="what triggered it?" value={note} onChange={(e) => setNote(e.target.value)} data-testid="focus-note"/>
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <PixelButton variant="danger" onClick={() => log()} data-testid="focus-submit"><AlertTriangle size={14}/>Log -{Math.min(60, mins*2)} XP</PixelButton>
            <PixelButton onClick={() => { setMins(5); log(source, 5); }} data-testid="quick-5">Quick: 5 min</PixelButton>
            <PixelButton onClick={() => { setMins(15); log(source, 15); }} data-testid="quick-15">Quick: 15 min</PixelButton>
            <PixelButton onClick={() => { setMins(30); log(source, 30); }} data-testid="quick-30">Quick: 30 min</PixelButton>
          </div>
        </BlockCard>

        <BlockCard title="Today's Distractions" testId="today-list">
          {today?.entries?.length === 0 ? (
            <div className="font-vt text-lg" style={{color: "var(--grass)"}}>🛡️ Zero distractions today. Proud of you.</div>
          ) : (
            <ul className="space-y-2">
              {today?.entries?.map((d) => {
                const meta = SOURCES.find((s) => s.key === d.source) || SOURCES[4];
                const Icon = meta.icon;
                return (
                  <li key={d.id} className="flex items-center gap-3 p-2" style={{background: "var(--bg-1)", border: "2px solid #000"}}>
                    <div style={{background: meta.color, padding: 6, border: "2px solid #000"}}><Icon size={14} color="#fff"/></div>
                    <div className="flex-1">
                      <div className="font-vt text-lg">{meta.label} · <span style={{color: "var(--redstone)"}}>{d.duration_mins} min</span></div>
                      {d.note && <div className="text-xs" style={{color: "var(--ink-muted)"}}>{d.note}</div>}
                    </div>
                    <span className="font-vt text-sm" style={{color: "var(--ink-dim)"}}>{d.created_at?.slice(11, 16)}</span>
                    <button onClick={() => remove(d.id)} className="opacity-60" data-testid={`del-distraction-${d.id}`}><Trash2 size={14}/></button>
                  </li>
                );
              })}
            </ul>
          )}
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Today's Damage" testId="today-damage">
          <div className="font-pixel text-4xl mb-2" style={{color: totalToday > 60 ? "var(--redstone)" : totalToday > 0 ? "var(--gold)" : "var(--grass)"}}>{totalToday}</div>
          <div className="font-vt text-lg" style={{color: "var(--ink-muted)"}}>minutes lost today</div>
          <div className="mt-3 space-y-1">
            {Object.entries(today?.by_source || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between font-vt text-base">
                <span className="capitalize">{k}</span>
                <span style={{color: "var(--redstone)"}}>{v} min</span>
              </div>
            ))}
          </div>
        </BlockCard>

        <BlockCard title="7-Day Damage" testId="week-chart">
          <div style={{height: 180}}>
            {stats && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3F3F46"/>
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#A1A1AA" fontSize={10}/>
                  <YAxis stroke="#A1A1AA" fontSize={10}/>
                  <Tooltip contentStyle={{background: "#18181B", border: "2px solid #000"}}/>
                  <Bar dataKey="minutes" fill="#EF4444"/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 font-vt text-base">
            Week total: <span style={{color: "var(--redstone)"}}>{stats?.total ?? 0} min</span>
          </div>
        </BlockCard>

        <BlockCard title="Tip" accent="var(--gold)" testId="focus-tip">
          <div className="npc-box">
            <span style={{color: "var(--gold)"}}>[Blocky]</span> When you're about to scroll, set a 5-min timer. After the 5 min, log it here. Being honest trains the brain faster than willpower.
          </div>
        </BlockCard>
      </div>
    </div>
  );
}
