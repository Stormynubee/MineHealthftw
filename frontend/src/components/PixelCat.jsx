import React, { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";

const PRESET_LINES = [
  "Hey legend, drink water.",
  "You got this. One block at a time.",
  "Don't forget the meds!",
  "A chapter a day keeps rank drops away.",
  "Stretch your back. Screen too long = dopamine leak.",
  "No sugar today = clearer skin tomorrow.",
  "25 more minutes. You're unstoppable.",
  "Morning sun > morning scroll.",
  "Your JEE future self is watching.",
  "Protein + sleep + sunlight.",
  "purr... did you breathe today?",
  "*licks paw* I believe in you.",
];

// Colors
const C = {
  body: "#E4A853",
  dark: "#B07A2C",
  deep: "#6B4423",
  pink: "#FF6A8A",
  white: "#FFF8E7",
};

// --- Cat sprites (16x16) ---
// Walk frame A: front-left + back-right forward
const CatWalkA = () => (
  <>
    {/* body */}
    <rect x="3" y="6" width="10" height="6" fill={C.body}/>
    {/* head */}
    <rect x="2" y="4" width="5" height="4" fill={C.body}/>
    {/* ears */}
    <rect x="2" y="3" width="1" height="1" fill={C.body}/>
    <rect x="6" y="3" width="1" height="1" fill={C.body}/>
    <rect x="2" y="2" width="1" height="1" fill={C.deep}/>
    <rect x="6" y="2" width="1" height="1" fill={C.deep}/>
    {/* stripes */}
    <rect x="4" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="8" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="11" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="6" y="8" width="1" height="1" fill={C.dark}/>
    <rect x="10" y="8" width="1" height="1" fill={C.dark}/>
    {/* eyes (open) */}
    <rect x="3" y="5" width="1" height="1" fill="#000"/>
    <rect x="5" y="5" width="1" height="1" fill="#000"/>
    {/* nose */}
    <rect x="4" y="6" width="1" height="1" fill={C.pink}/>
    {/* tail up */}
    <rect x="13" y="6" width="1" height="1" fill={C.body}/>
    <rect x="14" y="5" width="1" height="1" fill={C.body}/>
    <rect x="14" y="4" width="1" height="1" fill={C.body}/>
    <rect x="15" y="4" width="1" height="1" fill={C.body}/>
    {/* legs: FRONT-LEFT forward (lower), FRONT-RIGHT back (raised) */}
    <rect x="3" y="12" width="2" height="3" fill={C.body}/>
    <rect x="6" y="12" width="2" height="2" fill={C.body}/>
    {/* legs: BACK-LEFT back, BACK-RIGHT forward */}
    <rect x="9" y="12" width="2" height="2" fill={C.body}/>
    <rect x="11" y="12" width="2" height="3" fill={C.body}/>
    {/* paw dots */}
    <rect x="3" y="15" width="2" height="1" fill={C.deep}/>
    <rect x="11" y="15" width="2" height="1" fill={C.deep}/>
  </>
);

// Walk frame B: opposite diagonal
const CatWalkB = () => (
  <>
    <rect x="3" y="6" width="10" height="6" fill={C.body}/>
    <rect x="2" y="4" width="5" height="4" fill={C.body}/>
    <rect x="2" y="3" width="1" height="1" fill={C.body}/>
    <rect x="6" y="3" width="1" height="1" fill={C.body}/>
    <rect x="2" y="2" width="1" height="1" fill={C.deep}/>
    <rect x="6" y="2" width="1" height="1" fill={C.deep}/>
    <rect x="4" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="8" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="11" y="6" width="1" height="1" fill={C.dark}/>
    <rect x="6" y="8" width="1" height="1" fill={C.dark}/>
    <rect x="10" y="8" width="1" height="1" fill={C.dark}/>
    <rect x="3" y="5" width="1" height="1" fill="#000"/>
    <rect x="5" y="5" width="1" height="1" fill="#000"/>
    <rect x="4" y="6" width="1" height="1" fill={C.pink}/>
    {/* tail swished down */}
    <rect x="13" y="7" width="1" height="1" fill={C.body}/>
    <rect x="14" y="7" width="1" height="1" fill={C.body}/>
    <rect x="14" y="8" width="1" height="1" fill={C.body}/>
    <rect x="15" y="8" width="1" height="1" fill={C.body}/>
    {/* legs: FRONT-LEFT back (raised), FRONT-RIGHT forward */}
    <rect x="3" y="12" width="2" height="2" fill={C.body}/>
    <rect x="6" y="12" width="2" height="3" fill={C.body}/>
    {/* legs: BACK-LEFT forward, BACK-RIGHT back (raised) */}
    <rect x="9" y="12" width="2" height="3" fill={C.body}/>
    <rect x="11" y="12" width="2" height="2" fill={C.body}/>
    <rect x="6" y="15" width="2" height="1" fill={C.deep}/>
    <rect x="9" y="15" width="2" height="1" fill={C.deep}/>
  </>
);

// Sitting pose
const CatSit = ({ blink = false }) => (
  <>
    {/* body (compact) */}
    <rect x="5" y="8" width="7" height="5" fill={C.body}/>
    <rect x="2" y="4" width="5" height="4" fill={C.body}/>
    <rect x="2" y="3" width="1" height="1" fill={C.body}/>
    <rect x="6" y="3" width="1" height="1" fill={C.body}/>
    <rect x="2" y="2" width="1" height="1" fill={C.deep}/>
    <rect x="6" y="2" width="1" height="1" fill={C.deep}/>
    {/* stripes */}
    <rect x="6" y="9" width="1" height="1" fill={C.dark}/>
    <rect x="10" y="9" width="1" height="1" fill={C.dark}/>
    <rect x="8" y="11" width="1" height="1" fill={C.dark}/>
    {/* eyes */}
    {blink ? (
      <>
        <rect x="3" y="6" width="1" height="1" fill="#000"/>
        <rect x="5" y="6" width="1" height="1" fill="#000"/>
      </>
    ) : (
      <>
        <rect x="3" y="5" width="1" height="1" fill="#000"/>
        <rect x="5" y="5" width="1" height="1" fill="#000"/>
      </>
    )}
    <rect x="4" y="6" width="1" height="1" fill={C.pink}/>
    {/* tail curled */}
    <rect x="12" y="10" width="1" height="1" fill={C.body}/>
    <rect x="13" y="9" width="1" height="1" fill={C.body}/>
    <rect x="13" y="8" width="1" height="1" fill={C.body}/>
    <rect x="12" y="7" width="1" height="1" fill={C.body}/>
    {/* front paws tucked */}
    <rect x="5" y="13" width="2" height="2" fill={C.body}/>
    <rect x="10" y="13" width="2" height="2" fill={C.body}/>
    <rect x="5" y="15" width="2" height="1" fill={C.deep}/>
    <rect x="10" y="15" width="2" height="1" fill={C.deep}/>
  </>
);

// Grooming pose (licking paw)
const CatGroom = () => (
  <>
    <rect x="5" y="8" width="7" height="5" fill={C.body}/>
    <rect x="3" y="3" width="5" height="4" fill={C.body}/>
    <rect x="3" y="2" width="1" height="1" fill={C.body}/>
    <rect x="7" y="2" width="1" height="1" fill={C.body}/>
    <rect x="3" y="1" width="1" height="1" fill={C.deep}/>
    <rect x="7" y="1" width="1" height="1" fill={C.deep}/>
    {/* head turned down */}
    <rect x="4" y="4" width="1" height="1" fill="#000"/>
    <rect x="6" y="4" width="1" height="1" fill="#000"/>
    <rect x="5" y="5" width="1" height="1" fill={C.pink}/>
    {/* tongue */}
    <rect x="4" y="6" width="1" height="1" fill={C.pink}/>
    {/* raised paw to mouth */}
    <rect x="3" y="7" width="2" height="2" fill={C.body}/>
    <rect x="3" y="9" width="2" height="1" fill={C.deep}/>
    {/* stripes */}
    <rect x="6" y="9" width="1" height="1" fill={C.dark}/>
    <rect x="10" y="10" width="1" height="1" fill={C.dark}/>
    {/* tail curled */}
    <rect x="12" y="10" width="1" height="1" fill={C.body}/>
    <rect x="13" y="9" width="1" height="1" fill={C.body}/>
    <rect x="13" y="8" width="1" height="1" fill={C.body}/>
    {/* back paws */}
    <rect x="9" y="13" width="2" height="2" fill={C.body}/>
    <rect x="11" y="13" width="2" height="2" fill={C.body}/>
    <rect x="9" y="15" width="4" height="1" fill={C.deep}/>
  </>
);

const FRAME_COMPONENTS = {
  walkA: <CatWalkA/>,
  walkB: <CatWalkB/>,
  sit: <CatSit/>,
  sitBlink: <CatSit blink/>,
  groom: <CatGroom/>,
};

export default function PixelCat() {
  const [x, setX] = useState(30);
  const [dir, setDir] = useState(1);
  const [bubble, setBubble] = useState("");
  const [mode, setMode] = useState("walk"); // walk | sit | groom | talk
  const [frame, setFrame] = useState("walkA");
  const nextSpeakRef = useRef(Date.now() + 12000);
  const nextIdleRef = useRef(Date.now() + 15000 + Math.random() * 10000);
  const [name] = useState(() => {
    const stored = localStorage.getItem("cat_name");
    if (!stored || stored === "Creeper Jr.") {
      localStorage.setItem("cat_name", "Dozuu");
      return "Dozuu";
    }
    return stored;
  });

  // Frame tick: walk cycle alternates walkA/walkB; sit alternates sit/sitBlink for blinking
  useEffect(() => {
    const id = setInterval(() => {
      if (mode === "walk") {
        setFrame((f) => (f === "walkA" ? "walkB" : "walkA"));
      } else if (mode === "sit") {
        setFrame((f) => (Math.random() < 0.12 ? (f === "sit" ? "sitBlink" : "sit") : f));
      }
    }, 180);
    return () => clearInterval(id);
  }, [mode]);

  // Position tick: smaller, smoother steps
  useEffect(() => {
    const id = setInterval(() => {
      if (mode !== "walk") return;
      setX((prev) => {
        const maxX = Math.max(80, window.innerWidth - 100);
        let nx = prev + dir * 1.6;
        if (nx > maxX) { setDir(-1); nx = maxX; }
        if (nx < 20)   { setDir(1);  nx = 20; }
        return nx;
      });
    }, 60);
    return () => clearInterval(id);
  }, [dir, mode]);

  // Idle state machine: occasionally sit/groom, then resume walking
  useEffect(() => {
    const id = setInterval(() => {
      if (mode !== "walk") return;
      if (Date.now() >= nextIdleRef.current) {
        const action = Math.random() < 0.5 ? "sit" : "groom";
        setMode(action);
        setFrame(action);
        const dur = action === "sit" ? 4000 + Math.random() * 3000 : 3000 + Math.random() * 2000;
        setTimeout(() => {
          setMode("walk");
          setFrame("walkA");
          nextIdleRef.current = Date.now() + 12000 + Math.random() * 10000;
        }, dur);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // Speech cycle
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() >= nextSpeakRef.current && !bubble) {
        const line = PRESET_LINES[Math.floor(Math.random() * PRESET_LINES.length)];
        setBubble(line);
        nextSpeakRef.current = Date.now() + 22000 + Math.random() * 10000;
        setTimeout(() => setBubble(""), 5200);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [bubble]);

  const onClick = useCallback(async () => {
    setMode("sit");
    setFrame("sit");
    setBubble("mrow! let me think...");
    try {
      const r = await api.post("/ai/chat", {
        text: "In one short sentence (max 20 words), give me an actionable tip for right now — JEE, habits, or skin. Keep it spicy and kind.",
        session_id: "cat",
      });
      setBubble(r.data.reply);
    } catch {
      setBubble("purr — go knock out one more quest, champ.");
    }
    setTimeout(() => {
      setBubble("");
      setMode("walk");
      setFrame("walkA");
    }, 7500);
  }, []);

  return (
    <>
      <style>{`
        @keyframes catBob {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-1px); }
          75% { transform: translateY(-2px); }
        }
        @keyframes catSitBreathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.04); }
        }
        @keyframes tailSwish {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes bubblePop {
          0% { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.85); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        .cat-wrapper {
          position: fixed; bottom: 8px; z-index: 40;
          cursor: pointer;
          transition: left 0.06s linear;
          transform-origin: bottom center;
        }
        .cat-wrapper.walking { animation: catBob 0.36s steps(2, end) infinite; }
        .cat-wrapper.sitting { animation: catSitBreathe 2.4s ease-in-out infinite; }
        .cat-wrapper:hover { filter: brightness(1.18) drop-shadow(0 0 4px rgba(228,168,83,0.5)); }
        .cat-svg { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
        .cat-bubble {
          position: absolute; bottom: 60px; left: 50%;
          transform: translateX(-50%);
          background: var(--bg-1); border: 2px solid #000;
          box-shadow: 3px 3px 0 #000; padding: 8px 12px;
          font-family: 'VT323', monospace; font-size: 16px; color: var(--ink);
          max-width: 260px; white-space: normal;
          animation: bubblePop 0.25s cubic-bezier(0.2, 0.9, 0.3, 1) both;
        }
        .cat-bubble::after {
          content: ''; position: absolute; bottom: -8px; left: 50%;
          transform: translateX(-50%) rotate(45deg); width: 8px; height: 8px;
          background: var(--bg-1);
          border-right: 2px solid #000; border-bottom: 2px solid #000;
        }
        .cat-name {
          color: var(--grass);
          font-family: 'Silkscreen', monospace;
          font-size: 9px;
          text-transform: uppercase;
          display: block;
          margin-bottom: 2px;
        }
      `}</style>
      <div
        className={`cat-wrapper ${mode === "walk" ? "walking" : (mode === "sit" || mode === "groom") ? "sitting" : ""}`}
        style={{ left: x }}
        onClick={onClick}
        title={`Pet ${name}`}
        data-testid="pixel-cat"
      >
        {bubble && (
          <div className="cat-bubble" data-testid="cat-bubble">
            <span className="cat-name">{name}</span>
            {bubble}
          </div>
        )}
        <svg
          viewBox="0 0 16 16"
          width="56"
          height="56"
          className="cat-svg"
          style={{ transform: dir === -1 ? "scaleX(-1)" : "none" }}
          shapeRendering="crispEdges"
        >
          {FRAME_COMPONENTS[frame] || FRAME_COMPONENTS.walkA}
        </svg>
      </div>
    </>
  );
}
