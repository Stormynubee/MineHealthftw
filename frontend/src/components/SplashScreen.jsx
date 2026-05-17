import React, { useEffect, useState } from "react";

// Minecraft-style splash shown once per session.
// Block drops in → title types out → loading bar fills → fades out.
export default function SplashScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState("drop"); // drop → title → loading → fade
  const [title, setTitle] = useState("");

  // Phase 1: block drop (handled by CSS)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("title"), 600);
    return () => clearTimeout(t1);
  }, []);

  // Phase 2: type title
  useEffect(() => {
    if (phase !== "title") return;
    const full = "LIFE BLOCKS";
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTitle(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        setTimeout(() => setPhase("loading"), 300);
      }
    }, 70);
    return () => clearInterval(id);
  }, [phase]);

  // Phase 3: load bar
  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(() => {
      setPct((p) => {
        const np = p + 4 + Math.random() * 8;
        if (np >= 100) {
          clearInterval(id);
          setTimeout(() => setPhase("fade"), 300);
          return 100;
        }
        return np;
      });
    }, 90);
    return () => clearInterval(id);
  }, [phase]);

  // Phase 4: fade out
  useEffect(() => {
    if (phase !== "fade") return;
    const t = setTimeout(() => onDone && onDone(), 500);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  return (
    <>
      <style>{`
        .splash-root { position: fixed; inset: 0; background: #0a0a0b; display: flex; align-items: center; justify-content: center; flex-direction: column; z-index: 99999; transition: opacity 500ms ease; }
        .splash-root.fade { opacity: 0; pointer-events: none; }
        @keyframes blockDrop { 0% { transform: translateY(-200px) rotate(-6deg); opacity: 0; } 70% { transform: translateY(10px) rotate(2deg); opacity: 1; } 100% { transform: translateY(0) rotate(0); } }
        @keyframes blockHover { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        .splash-block { width: 88px; height: 88px; position: relative; animation: blockDrop 0.6s cubic-bezier(0.2,0.8,0.2,1.2) both; }
        .splash-block.hover { animation: blockHover 1.4s ease-in-out infinite; }
        .splash-title { font-family: 'Silkscreen', monospace; font-size: 42px; letter-spacing: 0.08em; color: #F4F4F5; margin-top: 24px; min-height: 48px; }
        .splash-sub { font-family: 'VT323', monospace; font-size: 20px; color: #71717A; margin-top: 4px; letter-spacing: 0.05em; }
        .splash-bar { width: 260px; height: 16px; margin-top: 28px; background: #000; border: 2px solid #3F3F46; position: relative; }
        .splash-bar-fill { height: 100%; background: repeating-linear-gradient(90deg, #22C55E 0 10px, #16A34A 10px 12px); transition: width 80ms linear; }
        .splash-loading-text { font-family: 'Silkscreen', monospace; font-size: 10px; color: #22C55E; margin-top: 8px; letter-spacing: 0.15em; }
        .caret { animation: caret 0.6s steps(2) infinite; }
        @keyframes caret { 50% { opacity: 0; } }
      `}</style>
      <div className={`splash-root ${phase === "fade" ? "fade" : ""}`} data-testid="splash">
        <div className={`splash-block ${phase !== "drop" ? "hover" : ""}`}>
          <svg viewBox="0 0 16 16" width="88" height="88" style={{imageRendering: "pixelated"}} shapeRendering="crispEdges">
            <rect x="0" y="0" width="16" height="16" fill="#22C55E"/>
            <rect x="0" y="4" width="16" height="12" fill="#8B5A2B"/>
            <rect x="0" y="0" width="16" height="4" fill="#22C55E"/>
            {[0,2,4,6,8,10,12,14].map((x) => <rect key={x} x={x} y="3" width="1" height="1" fill="#16A34A"/>)}
            {[1,3,5,7,9,11,13].map((x) => <rect key={x} x={x} y="2" width="1" height="1" fill="#4ADE80"/>)}
            {[2,6,10,14].map((x) => <rect key={x} x={x} y="7" width="1" height="1" fill="#6B4423"/>)}
            {[1,5,9,13].map((x) => <rect key={x} x={x} y="11" width="1" height="1" fill="#6B4423"/>)}
            {/* outline */}
            <rect x="0" y="0" width="16" height="1" fill="#000"/>
            <rect x="0" y="15" width="16" height="1" fill="#000"/>
            <rect x="0" y="0" width="1" height="16" fill="#000"/>
            <rect x="15" y="0" width="1" height="16" fill="#000"/>
          </svg>
        </div>
        <div className="splash-title">
          {title}<span className="caret" style={{color: "#22C55E"}}>_</span>
        </div>
        <div className="splash-sub">level up your life</div>
        {phase === "loading" && (
          <>
            <div className="splash-bar">
              <div className="splash-bar-fill" style={{width: `${pct}%`}}/>
            </div>
            <div className="splash-loading-text">LOADING WORLD · {Math.floor(pct)}%</div>
          </>
        )}
      </div>
    </>
  );
}
