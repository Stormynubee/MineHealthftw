import React from "react";
import { Swords } from "lucide-react";

// JEE exam countdown. Defaults: JEE Main 2027 ≈ Jan 24, 2027 · JEE Advanced 2027 ≈ May 23, 2027
// (Official dates shift slightly; edit here to adjust.)
const EXAMS = [
  { name: "JEE MAIN", date: "2027-01-24", color: "var(--diamond)" },
  { name: "JEE ADV",  date: "2027-05-23", color: "var(--gold)" },
];

function daysLeft(iso) {
  const target = new Date(iso + "T00:00:00");
  const now = new Date();
  const ms = target - now;
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function JEECountdown() {
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="jee-countdown">
      {EXAMS.map((e) => {
        const d = daysLeft(e.date);
        return (
          <div key={e.name} style={{background: "var(--bg-1)", border: "2px solid #000", boxShadow: "3px 3px 0 #000", padding: 10}}>
            <div className="flex items-center gap-1 mb-1">
              <Swords size={10} color={e.color}/>
              <span className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>{e.name}</span>
            </div>
            <div className="font-pixel text-2xl" style={{color: e.color, textShadow: "2px 2px 0 #000"}}>{d}</div>
            <div className="font-vt text-xs" style={{color: "var(--ink-dim)"}}>days</div>
          </div>
        );
      })}
    </div>
  );
}
