import React, { useEffect, useRef, useState } from "react";
import { Timer, Play, Pause, RotateCcw, Wind } from "lucide-react";
import BlockCard from "../components/BlockCard";
import PixelButton from "../components/PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

const PRESETS = [5, 10, 15, 20, 30];

export default function Meditate() {
  const [minutes, setMinutes] = useState(10);
  const [seconds, setSeconds] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const [mode, setMode] = useState("meditation"); // meditation | wimhof | breathing
  const tickRef = useRef(null);
  const { refresh } = useProfile() || {};

  const loadStats = async () => {
    const r = await api.get("/meditation/stats");
    setStats(r.data);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          setRunning(false);
          complete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const complete = async () => {
    try {
      await api.post("/meditation/session", { duration_mins: minutes });
      showXP(minutes * 2);
      toast.success(`Meditation done! +${minutes * 2} XP`);
      refresh && refresh();
      loadStats();
    } catch {}
  };

  const setPreset = (m) => {
    setMinutes(m);
    setSeconds(m * 60);
    setRunning(false);
  };
  const reset = () => { setSeconds(minutes * 60); setRunning(false); };
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const pct = 100 - (seconds / (minutes * 60)) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-8 flex flex-col gap-5">
        <BlockCard title="Meditation Timer" icon={<Timer size={12} color="#000"/>} accent="var(--gold)" testId="meditate-timer">
          <div className="flex gap-2 mb-4 flex-wrap items-end">
            {PRESETS.map((m) => (
              <button key={m} onClick={() => setPreset(m)} className={`hotbar-slot ${minutes === m ? "active" : ""}`} data-testid={`meditate-preset-${m}`}>
                {m}m
              </button>
            ))}
            <div className="ml-auto flex flex-col">
              <label className="font-pixel text-[10px] uppercase mb-1" style={{color: "var(--gold)"}}>Custom (1-180 min)</label>
              <input type="number" min="1" max="180" value={minutes} onChange={(e) => setPreset(Math.max(1, Math.min(180, Number(e.target.value) || 1)))} className="pixel-input w-32" style={{fontSize: 18}} data-testid="meditate-custom"/>
            </div>
          </div>
          <div className="text-center py-8" style={{background: "linear-gradient(180deg, #0a0a1f 0%, #18181B 100%)", border: "2px solid #000", boxShadow: "inset 3px 3px 0 rgba(0,0,0,0.5)"}}>
            <div className="font-pixel" style={{fontSize: 96, color: "var(--gold)", textShadow: "3px 3px 0 #000"}} data-testid="meditate-time">
              {mm}:{ss}
            </div>
            <div className="xp-bar-shell mt-4 mx-8">
              <div className="xp-bar-fill" style={{width: `${pct}%`, background: "var(--gold)"}}/>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <PixelButton variant="gold" onClick={() => setRunning(!running)} data-testid="meditate-toggle">
              {running ? <><Pause size={14}/>Pause</> : <><Play size={14}/>Begin</>}
            </PixelButton>
            <PixelButton onClick={reset} data-testid="meditate-reset"><RotateCcw size={14}/>Reset</PixelButton>
          </div>
        </BlockCard>

        <BlockCard title="Wim Hof Breathing Guide" icon={<Wind size={12} color="#000"/>} accent="var(--diamond)" testId="wim-hof">
          <ol className="space-y-2 font-vt text-lg">
            <li><span style={{color: "var(--diamond)"}}>Round 1:</span> 30-40 deep breaths (inhale nose, exhale mouth, don't force).</li>
            <li><span style={{color: "var(--diamond)"}}>Hold:</span> After last exhale, hold as long as comfortable.</li>
            <li><span style={{color: "var(--diamond)"}}>Recovery:</span> One deep inhale, hold 15 seconds.</li>
            <li><span style={{color: "var(--diamond)"}}>Repeat:</span> 3 rounds total. Never do this in water or while driving.</li>
          </ol>
          <div className="npc-box mt-3">
            <span style={{color: "var(--diamond)"}}>[Blocky]</span> After: mark the "Wim Hof Breathing" habit to stack XP. Do it fasted, right after waking.
          </div>
        </BlockCard>
      </div>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <BlockCard title="Meditation Stats" testId="meditate-stats">
          <div className="grid grid-cols-2 gap-2">
            <div style={{background: "var(--bg-1)", border: "2px solid #000", padding: 12}}>
              <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>Total</div>
              <div className="font-vt text-3xl" style={{color: "var(--gold)"}}>{stats?.total_minutes ?? 0} min</div>
            </div>
            <div style={{background: "var(--bg-1)", border: "2px solid #000", padding: 12}}>
              <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>Sessions</div>
              <div className="font-vt text-3xl" style={{color: "var(--diamond)"}}>{stats?.sessions ?? 0}</div>
            </div>
          </div>
        </BlockCard>

        <BlockCard title="NSDR (Huberman)" testId="nsdr">
          <p className="font-vt text-lg">
            Non-Sleep Deep Rest — 10 minutes after lunch. Resets dopamine, fights fatigue. Use this timer set to 10.
          </p>
          <PixelButton className="mt-2" onClick={() => setPreset(10)} data-testid="nsdr-set">Set 10-min NSDR</PixelButton>
        </BlockCard>

        <BlockCard title="Yoga Nidra" testId="yoga-nidra">
          <p className="font-vt text-lg">
            20 minutes body-scan lying down. Works like 2 hours of sleep. Use 20-min preset.
          </p>
          <PixelButton className="mt-2" variant="gold" onClick={() => setPreset(20)} data-testid="yoga-set">Set 20-min Yoga Nidra</PixelButton>
        </BlockCard>
      </div>
    </div>
  );
}
