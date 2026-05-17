import React from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, HeartPulse, Timer, Briefcase, Sparkles, Cpu,
  Palette, Trophy, Flame, ArrowRight, Check, Github, Zap,
  Atom, Pill, MessageSquareText, Award, Rocket,
} from "lucide-react";
import PixelButton from "../components/PixelButton";
import { useProfile } from "../lib/ProfileContext";

const FEATURES = [
  { icon: BookOpen, color: "var(--grass)", title: "JEE Syllabus Quest", desc: "83 chapters of Physics, Chemistry, Maths — 11th & 12th — tracked as checkboxes that award XP." },
  { icon: Timer, color: "var(--diamond)", title: "Pixel Pomodoro", desc: "15/25/45/60 minute focus blocks for JEE prep and building Umang OS. Every minute logs XP." },
  { icon: HeartPulse, color: "var(--redstone)", title: "Health Condition Buddy", desc: "Medicine reminders, skin issue checks, and strict 'No Sugar / No Oil' diet trackers." },
  { icon: Zap, color: "var(--gold)", title: "10 Habit Trackers", desc: "Yoga Nidra · Wim Hof · Huberman sunlight · 10k steps — tracked daily for streak XP." },
  { icon: Cpu, color: "var(--grass)", title: "Code & Robotics", desc: "Log ESP32 hardware builds, Rust/Next.js stacks, and your System Architecture progress." },
  { icon: Briefcase, color: "var(--diamond)", title: "Career Hub", desc: "LinkedIn, Daily Video Edits, Clients, GenAI prep, and NIT techfests." },
  { icon: MessageSquareText, color: "var(--gold)", title: "Blocky AI Buddy", desc: "Gemini 2.5 Flash lives inside the dashboard. JEE doubts, meal audits, and Huberman techniques — instantly." },
  { icon: Palette, color: "var(--redstone)", title: "Creative Tools", desc: "DaVinci/Photoshop editing streaks, flashcards, and scratchpads. Your creative mind has a home." },
  { icon: Award, color: "var(--gold)", title: "13 Achievements", desc: "Diamond Mind · SIH Finalist · JEE Warrior. Unlock badges as you level up." },
];

export default function Landing() {
  const { profile, summary } = useProfile() || {};
  const level = profile?.level ?? 1;
  const xp = profile?.xp_in_level ?? 0;
  const xpNext = profile?.xp_for_next ?? 500;
  const streak = profile?.streak ?? 0;
  const isLoaded = !!profile;

  return (
    <div style={{background: "var(--bg-1)"}}>
      {/* Top bar */}
      <nav className="flex items-center justify-between px-6 py-4" style={{borderBottom: "2px solid #000", background: "var(--bg-0)"}}>
        <div className="flex items-center gap-2">
          <div style={{width: 28, height: 28, background: "var(--grass)", border: "2px solid #000", boxShadow: "2px 2px 0 #000"}}/>
          <div className="font-pixel text-sm">LIFE BLOCKS</div>
        </div>
        <div className="flex gap-2 items-center">
          <Link to="/profile" data-testid="nav-public-profile">
            <PixelButton>Share Profile</PixelButton>
          </Link>
          <Link to="/app" data-testid="nav-enter-dashboard">
            <PixelButton variant="primary">Enter Dashboard <ArrowRight size={14}/></PixelButton>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-2 mb-6" style={{background: "var(--bg-2)", border: "2px solid #000", boxShadow: "3px 3px 0 #000"}}>
          <svg viewBox="0 0 8 8" width="14" height="14" shapeRendering="crispEdges" style={{imageRendering: "pixelated"}}>
            <rect x="0" y="0" width="8" height="8" fill="#22C55E"/>
            <rect x="0" y="0" width="8" height="2" fill="#4ADE80"/>
            <rect x="0" y="6" width="8" height="2" fill="#16A34A"/>
          </svg>
          <span className="font-pixel text-[10px] uppercase" style={{color: "var(--grass)", letterSpacing: "0.12em"}}>A LIFE OS BUILT LIKE A GAME</span>
        </div>
        <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl mb-4 leading-tight">
          <span style={{color: "var(--grass)"}}>LEVEL UP</span><br/>
          YOUR ENTIRE LIFE.
        </h1>
        <p className="font-vt text-xl sm:text-2xl max-w-2xl mx-auto mb-8" style={{color: "var(--ink-muted)"}}>
          JEE grind · Health Condition rules · Umang OS builds · Freelance wins — all in one Minecraft-themed dashboard. Every habit earns XP. Every quest unlocks a badge.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-10">
          <Link to="/app" data-testid="hero-enter">
            <PixelButton variant="primary" className="text-sm"><Rocket size={16}/>Enter Your Dashboard</PixelButton>
          </Link>
          <a href="#features">
            <PixelButton>See Features</PixelButton>
          </a>
        </div>

        {/* Hero mock card */}
        <div className="max-w-3xl mx-auto" style={{background: "var(--bg-2)", border: "2px solid #000", boxShadow: "8px 8px 0 #000", padding: 24}}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy size={18} color="var(--gold)"/>
              <span className="font-pixel text-sm">LV {level} {profile?.title || "NOVICE ENGINEER"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame size={18} color="var(--redstone)"/>
              <span className="font-vt text-xl" style={{color: "var(--redstone)"}}>{streak} DAY STREAK</span>
            </div>
          </div>
          <div className="xp-bar-shell">
            <div className="xp-bar-fill" style={{width: `${(xp / xpNext) * 100}%`}}/>
          </div>
          <div className="flex justify-between mt-1 font-vt text-lg">
            <span style={{color: "var(--ink-muted)"}}>XP</span>
            <span style={{color: "var(--grass)"}}>{xp} / {xpNext}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            {[
              {l: "Focus", v: isLoaded && summary ? `${summary.pomodoro_mins_today ?? 0} min` : "0 min", c: "var(--diamond)"},
              {l: "Habits", v: isLoaded && summary ? `${summary.habits_done_today ?? 0}/${summary.habits_total ?? 0}` : "0/10", c: "var(--grass)"},
              {l: "JEE Done", v: isLoaded && summary ? `${summary.jee_done ?? 0}/${summary.jee_total ?? 83}` : "0/83", c: "var(--gold)"},
              {l: "Meds", v: isLoaded && summary ? `${summary.meds_taken_today ?? 0}/${summary.meds_total ?? 0}` : "0/2", c: "var(--redstone)"},
            ].map((s, i) => (
              <div key={i} style={{background: "var(--bg-1)", border: "2px solid #000", padding: 10}}>
                <div className="font-pixel text-[9px] uppercase" style={{color: "var(--ink-muted)"}}>{s.l}</div>
                <div className="font-vt text-2xl" style={{color: s.c}}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-pixel text-2xl sm:text-3xl mb-2">
            9 <span style={{color: "var(--grass)"}}>MODULES.</span> ONE DASHBOARD.
          </h2>
          <p className="font-vt text-xl" style={{color: "var(--ink-muted)"}}>Everything your life needs — blocked together.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="block-card p-5" data-testid={`feature-${i}`}>
              <div style={{background: f.color, width: 40, height: 40, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12}}>
                <f.icon size={20} color="#000"/>
              </div>
              <h3 className="font-pixel text-sm mb-2">{f.title}</h3>
              <p className="font-vt text-lg leading-snug" style={{color: "var(--ink-muted)"}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="font-pixel text-2xl sm:text-3xl text-center mb-10">
          HOW IT <span style={{color: "var(--diamond)"}}>WORKS</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {n: "01", t: "Do a Quest", d: "Study a chapter, take your meds, do Wim Hof, edit a video."},
            {n: "02", t: "Earn XP", d: "Every action logs XP. Level up. Unlock achievement badges."},
            {n: "03", t: "Stack Streaks", d: "Daily consistency = streak flames + nether-tier trophies."},
          ].map((s, i) => (
            <div key={i} className="block-card-raised p-6" data-testid={`step-${i}`}>
              <div className="font-pixel text-3xl mb-3" style={{color: "var(--gold)"}}>{s.n}</div>
              <div className="font-pixel text-sm mb-2">{s.t}</div>
              <div className="font-vt text-lg" style={{color: "var(--ink-muted)"}}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="block-card-raised p-10" style={{background: "var(--bg-0)"}}>
          <Atom size={40} color="var(--grass)" className="mx-auto mb-4"/>
          <h2 className="font-pixel text-2xl mb-3">READY TO GRIND?</h2>
          <p className="font-vt text-xl mb-6" style={{color: "var(--ink-muted)"}}>
            No sign-up. No friction. Your dashboard is already yours.
          </p>
          <Link to="/app" data-testid="cta-enter">
            <PixelButton variant="primary" className="text-sm"><Rocket size={16}/>Start Playing Life Blocks</PixelButton>
          </Link>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 font-vt text-lg text-center" style={{color: "var(--ink-dim)", borderTop: "2px solid #000"}}>
        Life Blocks · built block by block · pixel love to every JEE warrior
      </footer>
    </div>
  );
}
