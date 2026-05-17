import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutGrid, BookOpen, Cpu, HeartPulse, Timer, Briefcase,
  MessageSquareText, Palette, Flame, Trophy, Award, Share2, Home, Target,
  Settings, Menu, X, AlarmClock, Camera
} from "lucide-react";
import { useProfile } from "../lib/ProfileContext";
import XPBar from "./XPBar";
import NotificationManager from "./NotificationManager";
import InstallPrompt from "./InstallPrompt";
import PixelCat from "./PixelCat";
import { Toaster } from "sonner";

const links = [
  { to: "/app", label: "Base Camp", icon: LayoutGrid, end: true },
  { to: "/app/study", label: "Study Quest", icon: BookOpen },
  { to: "/app/code", label: "Code & Bots", icon: Cpu },
  { to: "/app/health", label: "Health Zone", icon: HeartPulse },
  { to: "/app/meditate", label: "Meditate", icon: Timer },
  { to: "/app/focus", label: "Focus Log", icon: Target },
  { to: "/app/career", label: "Career Hub", icon: Briefcase },
  { to: "/app/buddy", label: "Blocky AI", icon: MessageSquareText },
  { to: "/app/creative", label: "Creative", icon: Palette },
  { to: "/app/morning", label: "Morning", icon: AlarmClock },
  { to: "/app/journal", label: "Secure Journal", icon: Camera },
  { to: "/app/achievements", label: "Achievements", icon: Award },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export default function Shell() {
  const { profile, summary } = useProfile() || {};
  const level = profile?.level ?? 1;
  const xpIn = profile?.xp_in_level ?? 0;
  const xpNext = profile?.xp_for_next ?? 500;
  const streak = profile?.streak ?? 0;
  const totalXP = profile?.total_xp ?? 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="app-shell">
      {/* Mobile top bar — only visible on mobile */}
      <div className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          data-testid="mobile-menu-toggle"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-topbar-brand">
          <div style={{width: 20, height: 20, background: "var(--grass)", border: "2px solid #000", boxShadow: "1px 1px 0 #000"}} />
          <span className="font-pixel" style={{fontSize: 11, color: "var(--ink)"}}>LIFE BLOCKS</span>
        </div>
        <div className="mobile-topbar-xp font-vt" style={{color: "var(--gold)", fontSize: 14}}>
          LV {level} · {totalXP} XP
        </div>
      </div>

      {/* Backdrop overlay — only visible when mobile menu is open */}
      {mobileMenuOpen && (
        <div className="mobile-backdrop" onClick={closeMobileMenu} />
      )}

      <aside className={`app-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`} data-testid="sidebar">
        <div className="flex items-center gap-2 pb-2" style={{borderBottom: "2px solid #000"}}>
          <div style={{width: 28, height: 28, background: "var(--grass)", border: "2px solid #000", boxShadow: "2px 2px 0 #000"}} />
          <div>
            <div className="font-pixel text-sm" style={{color: "var(--ink)"}}>LIFE BLOCKS</div>
            <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>v1.0.4 // morning-alarm</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 sidebar-nav-scroll">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={closeMobileMenu}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2" style={{fontFamily: "JetBrains Mono", fontSize: 11, color: "var(--ink-dim)"}}>
          <Link to="/" className="nav-link" data-testid="nav-home" onClick={closeMobileMenu}>
            <Home size={14}/>Homepage
          </Link>
          <Link to="/profile" className="nav-link" data-testid="nav-share-profile" onClick={closeMobileMenu}>
            <Share2 size={14}/>Share Profile
          </Link>
          <div className="mt-3 p-2 block-card" style={{border: "2px solid #000", background: "var(--bg-1)", boxShadow: "3px 3px 0 #000"}}>
            <div className="flex items-center gap-2 mb-1">
              <div style={{width: 16, height: 16, background: profile?.avatar_color || "var(--grass)", border: "2px solid #000"}} />
              <div className="font-pixel text-[10px]" style={{color: "var(--ink)"}}>{profile?.name || "Player One"}</div>
            </div>
            <div className="font-vt text-sm flex items-center justify-between" style={{color: "var(--ink-muted)"}}>
              <span style={{color: "var(--gold)"}}>{totalXP} XP</span>
              <span>LV {level}</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="app-main" data-testid="main-area">
        <header className="header-strip block-drop">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="stat-tile" data-testid="level-tile">
              <Trophy size={18} color="var(--gold)" />
              <div>
                <div className="label">Level</div>
                <div className="value font-pixel" style={{fontSize: 18}}>LV {level}</div>
              </div>
            </div>
            <div className="stat-tile" data-testid="streak-tile">
              <Flame size={18} color="var(--redstone)" className="pulse-streak" />
              <div>
                <div className="label">Streak</div>
                <div className="value">{streak}d</div>
              </div>
            </div>
            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-pixel text-[10px]" style={{color: "var(--ink-muted)"}}>XP PROGRESS</span>
                <span className="font-vt" style={{color: "var(--grass)"}}>{xpIn} / {xpNext}</span>
              </div>
              <XPBar value={xpIn} max={xpNext} />
            </div>
          </div>
          {summary ? (
            <div className="font-vt text-sm" style={{color: "var(--ink-muted)"}}>
              Today: <span style={{color: "var(--grass)"}}>{summary.tasks?.done_today ?? 0}</span> quests done &middot; <span style={{color: "var(--diamond)"}}>{summary.pomodoro_mins_today ?? 0} min</span> focus &middot; <span style={{color: "var(--gold)"}}>{summary.habits_done_today ?? 0}/{summary.habits_total ?? 0}</span> habits
            </div>
          ) : (
            <div className="flex gap-2 items-center opacity-50">
              <div style={{height: 12, width: 100, background: "var(--bg-3)"}} /> &middot;
              <div style={{height: 12, width: 80, background: "var(--bg-3)"}} /> &middot;
              <div style={{height: 12, width: 90, background: "var(--bg-3)"}} />
            </div>
          )}
        </header>
        <div className="block-drop">
          <Outlet />
        </div>
      </main>
      <NotificationManager />
      <InstallPrompt />
      <PixelCat />
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
