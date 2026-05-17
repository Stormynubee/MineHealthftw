import React, { useEffect, useState } from "react";
import { Award } from "lucide-react";
import BlockCard from "../components/BlockCard";
import { api } from "../lib/api";

export default function Achievements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    api.get("/achievements")
      .then((r) => { setItems(r.data); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); }); 
  }, []);

  const unlocked = items.filter((a) => a.unlocked);
  const locked = items.filter((a) => !a.unlocked);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div style={{ width: 44, height: 44, background: "linear-gradient(135deg, var(--gold), #ea580c)", border: "2px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Award size={22} color="#000" />
        </div>
        <div>
          <h1 className="font-pixel text-lg" style={{ color: "var(--gold)" }}>TROPHY ROOM</h1>
          <p className="font-vt text-base" style={{ color: "var(--ink-muted)" }}>Unlock badges by leveling up and completing quests.</p>
        </div>
      </div>

      <BlockCard title="Your Achievements" icon={<Award size={12} color="#000"/>} accent="var(--gold)" testId="achievements-card">
        {loading ? (
          <div className="font-vt text-lg" style={{ color: "var(--ink-muted)" }}>Loading your trophies...</div>
        ) : items.length === 0 ? (
          <div className="font-vt text-lg" style={{ color: "var(--ink-muted)" }}>No achievements available right now. Keep playing!</div>
        ) : (
          <>
            <div className="font-vt text-lg mb-2">
              Unlocked: <span style={{color: "var(--grass)"}}>{unlocked.length}</span> / {items.length}
            </div>
            <div className="xp-bar-shell mb-6">
              <div className="xp-bar-fill" style={{width: `${(unlocked.length / items.length) * 100}%`, background: "var(--gold)"}}/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...unlocked, ...locked].map((a) => (
                <div key={a.id} className="flex flex-col p-4" style={{
                  background: a.unlocked ? "var(--bg-1)" : "var(--bg-0)",
                  border: a.unlocked ? "2px solid var(--gold)" : "2px solid #000",
                  boxShadow: a.unlocked ? "4px 4px 0 var(--gold)" : "2px 2px 0 #000",
                  opacity: a.unlocked ? 1 : 0.6,
                  transition: "all 0.2s ease"
                }} data-testid={`ach-${a.id}`}>
                  <div className="text-4xl mb-3 text-center">{a.icon}</div>
                  <div className="font-pixel text-[11px] mb-2 text-center" style={{ color: a.unlocked ? "var(--ink)" : "var(--ink-dim)" }}>
                    {a.name}
                  </div>
                  <div className="font-vt text-sm text-center flex-1" style={{color: "var(--ink-muted)"}}>
                    {a.desc}
                  </div>
                  <div className="mt-4 pt-3" style={{ borderTop: "1px dashed var(--bg-3)" }}>
                    <div className="xp-bar-shell" style={{height: 10}}>
                      <div className="xp-bar-fill" style={{
                        width: `${Math.min(100, (a.progress.cur / a.progress.target) * 100)}%`,
                        background: a.unlocked ? "var(--grass)" : "var(--diamond)"
                      }}/>
                    </div>
                    <div className="font-vt text-xs mt-1 text-center" style={{color: a.unlocked ? "var(--grass)" : "var(--ink-muted)"}}>
                      {a.unlocked ? "✓ UNLOCKED" : `${a.progress.cur} / ${a.progress.target} to unlock`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </BlockCard>
    </div>
  );
}
