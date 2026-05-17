import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, X, Maximize2, Coffee, BookOpen, Clock, Minimize2, Music, ChevronDown, ChevronUp, Trash2, Link, Target } from "lucide-react";
import ReactDOM from "react-dom";
import PixelButton from "./PixelButton";
import { api, showXP } from "../lib/api";
import { useProfile } from "../lib/ProfileContext";
import { toast } from "sonner";

/* ── Music URL Parsing ── */
function parseMusicUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Spotify: track, playlist, album, episode
  const spotifyMatch = trimmed.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return {
      type: "spotify",
      embedUrl: `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}?utm_source=generator&theme=0`,
      label: `Spotify ${spotifyMatch[1]}`,
    };
  }

  // YouTube: standard watch URL
  const ytWatch = trimmed.match(/(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/);
  if (ytWatch) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytWatch[1]}?autoplay=1&loop=1`,
      label: "YouTube video",
    };
  }

  // YouTube: short URL
  const ytShort = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (ytShort) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytShort[1]}?autoplay=1&loop=1`,
      label: "YouTube video",
    };
  }

  // YouTube: playlist
  const ytPlaylist = trimmed.match(/youtube\.com\/playlist\?.*list=([a-zA-Z0-9_-]+)/);
  if (ytPlaylist) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${ytPlaylist[1]}&autoplay=1`,
      label: "YouTube playlist",
    };
  }

  // YouTube Music
  const ytMusic = trimmed.match(/music\.youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
  if (ytMusic) {
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytMusic[1]}?autoplay=1&loop=1`,
      label: "YouTube Music",
    };
  }

  return null;
}

const MODES = {
  focus: { label: "Focus", minutes: 25, color: "var(--grass)" },
  short: { label: "Short Break", minutes: 5, color: "var(--diamond)" },
  long: { label: "Long Break", minutes: 15, color: "var(--gold)" },
};

/* ── Stoic & Minimalistic Quotes ── */
const STOIC_QUOTES = [
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "It is not that we have a short time to live, but that we waste a great deal of it.", author: "Seneca" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "Man is not worried by real problems so much as by his imagined anxieties about real problems.", author: "Epictetus" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "If it is not right, do not do it. If it is not true, do not say it.", author: "Marcus Aurelius" },
  { text: "He suffers more than necessary, who suffers before it is necessary.", author: "Seneca" },
  { text: "Make the mind tougher by exposing it to adversity.", author: "Seneca" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "It does not matter what you bear, but how you bear it.", author: "Seneca" },
];

function getQuote() {
  /* Deterministic by hour + day so it doesn't change every re-render */
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate() + now.getHours();
  return STOIC_QUOTES[seed % STOIC_QUOTES.length];
}

export default function Pomodoro({ compact = false }) {
  const [mode, setMode] = useState("focus");
  const [seconds, setSeconds] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState("Physics");
  const [customMin, setCustomMin] = useState(25);
  const [fullscreen, setFullscreen] = useState(false);
  const [quote, setQuote] = useState(() => getQuote());
  const [musicUrl, setMusicUrl] = useState("");
  const [musicEmbed, setMusicEmbed] = useState(() => {
    try {
      const saved = localStorage.getItem("pomo_music_url");
      return saved ? parseMusicUrl(saved) : null;
    } catch { return null; }
  });
  const [savedMusicUrl, setSavedMusicUrl] = useState(() => {
    try { return localStorage.getItem("pomo_music_url") || ""; } catch { return ""; }
  });
  const [musicPanelOpen, setMusicPanelOpen] = useState(false);
  const [sessionGoals, setSessionGoals] = useState(() => {
    try { return localStorage.getItem("pomo_session_goals") || ""; } catch { return ""; }
  });
  const [goalsOpen, setGoalsOpen] = useState(false);
  const tickRef = useRef(null);
  const { refresh } = useProfile() || {};

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(tickRef.current);
          setRunning(false);
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  /* Lock body scroll when fullscreen */
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("pomodoro-fullscreen-active");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("pomodoro-fullscreen-active");
    }
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("pomodoro-fullscreen-active");
    };
  }, [fullscreen]);

  /* ESC key exits fullscreen */
  useEffect(() => {
    if (!fullscreen) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fullscreen]);

  const handleComplete = async () => {
    if (mode === "focus") {
      try {
        const mins = customMin || MODES.focus.minutes;
        await api.post("/pomodoro/log", { subject, duration_mins: mins });
        showXP(mins);
        toast.success(`Focus done! +${mins} XP`, { description: `${subject} locked in.` });
        refresh && refresh();
      } catch (e) {
        toast.error("Failed to log session");
      }
    } else {
      toast.success("Break complete — back to the grind.");
    }
  };

  const switchMode = (m) => {
    setMode(m);
    const mins = m === "focus" ? customMin : MODES[m].minutes;
    setSeconds(mins * 60);
    setRunning(false);
  };

  const reset = () => {
    const mins = mode === "focus" ? customMin : MODES[mode].minutes;
    setSeconds(mins * 60);
    setRunning(false);
  };

  const applyCustom = (m) => {
    setCustomMin(m);
    if (mode === "focus") setSeconds(m * 60);
  };

  const startAndGoFullscreen = useCallback(() => {
    setQuote(getQuote());
    setRunning(true);
    setFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    setFullscreen(false);
  }, []);

  const applyMusicUrl = useCallback(() => {
    const parsed = parseMusicUrl(musicUrl);
    if (parsed) {
      setMusicEmbed(parsed);
      setSavedMusicUrl(musicUrl);
      try { localStorage.setItem("pomo_music_url", musicUrl); } catch {}
      toast.success(`${parsed.label} loaded!`);
      setMusicUrl("");
    } else {
      toast.error("Couldn't parse that URL. Paste a Spotify or YouTube link.");
    }
  }, [musicUrl]);

  const clearMusic = useCallback(() => {
    setMusicEmbed(null);
    setSavedMusicUrl("");
    setMusicUrl("");
    try { localStorage.removeItem("pomo_music_url"); } catch {}
  }, []);

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const totalSecs = (mode === "focus" ? customMin : MODES[mode].minutes) * 60;
  const pct = totalSecs > 0 ? 100 - (seconds / totalSecs) * 100 : 0;

  /* ═══════════════════════════════════════════════
     FULLSCREEN OVERLAY (rendered via portal)
     ═══════════════════════════════════════════════ */
  const fullscreenOverlay = fullscreen
    ? ReactDOM.createPortal(
        <div className="pomo-fullscreen" data-testid="pomo-fullscreen">
          {/* Ambient background particles */}
          <div className="pomo-fs-ambient">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="pomo-fs-particle" style={{
                left: `${15 + i * 14}%`,
                animationDelay: `${i * 1.2}s`,
                animationDuration: `${8 + i * 2}s`,
              }} />
            ))}
          </div>

          {/* Exit button */}
          <button
            className="pomo-fs-exit"
            onClick={exitFullscreen}
            data-testid="pomo-fs-exit"
            title="Exit fullscreen (Esc)"
          >
            <Minimize2 size={18} />
          </button>

          {/* Mode label */}
          <div className="pomo-fs-mode-label" style={{ color: MODES[mode].color }}>
            {mode === "focus" ? <><BookOpen size={16} /> {subject}</> : <><Coffee size={16} /> {MODES[mode].label}</>}
          </div>

          {/* Timer display — the hero */}
          <div className="pomo-fs-timer-wrap">
            <div className="pomo-fs-time" style={{ color: MODES[mode].color }} data-testid="pomo-fs-time">
              {mm}:{ss}
            </div>

            {/* Circular progress ring */}
            <svg className="pomo-fs-ring" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="100" cy="100" r="90"
                fill="none"
                stroke={MODES[mode].color}
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - pct / 100)}`}
                strokeLinecap="square"
                style={{ transition: "stroke-dashoffset 1s linear", transform: "rotate(-90deg)", transformOrigin: "center" }}
              />
            </svg>
          </div>

          {/* Progress bar */}
          <div className="pomo-fs-progress">
            <div className="pomo-fs-progress-fill" style={{ width: `${pct}%`, background: MODES[mode].color }} />
          </div>

          {/* Controls */}
          <div className="pomo-fs-controls">
            <button
              className="pomo-fs-btn"
              onClick={() => setRunning(!running)}
              style={{ background: running ? "rgba(255,255,255,0.08)" : MODES[mode].color, color: running ? "var(--ink)" : "#000" }}
              data-testid="pomo-fs-toggle"
            >
              {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
            </button>
            <button className="pomo-fs-btn pomo-fs-btn-ghost" onClick={reset} data-testid="pomo-fs-reset">
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          {/* Mode tabs */}
          <div className="pomo-fs-modes">
            {Object.entries(MODES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => switchMode(k)}
                className={`pomo-fs-mode-tab ${mode === k ? "active" : ""}`}
                style={mode === k ? { borderColor: v.color, color: v.color } : {}}
                data-testid={`pomo-fs-mode-${k}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Subject & Time controls (only in focus mode) */}
          {mode === "focus" && (
            <div className="pomo-fs-settings">
              <div className="pomo-fs-setting-group">
                <label className="pomo-fs-label"><BookOpen size={12} /> Subject</label>
                <select
                  className="pomo-fs-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="pomo-fs-subject"
                >
                  <option>Physics</option>
                  <option>Chemistry</option>
                  <option>Maths</option>
                  <option>Coding</option>
                  <option>Robotics</option>
                  <option>Reading</option>
                  <option>General</option>
                </select>
              </div>
              <div className="pomo-fs-setting-group">
                <label className="pomo-fs-label"><Clock size={12} /> Duration</label>
                <div className="pomo-fs-presets">
                  {[15, 25, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => applyCustom(m)}
                      className={`pomo-fs-preset ${customMin === m ? "active" : ""}`}
                      data-testid={`pomo-fs-preset-${m}`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Session Goals ── */}
          <div className="pomo-fs-goals" data-testid="pomo-fs-goals">
            <button
              className="pomo-fs-goals-toggle"
              onClick={() => setGoalsOpen(!goalsOpen)}
              data-testid="pomo-fs-goals-toggle"
            >
              <Target size={14} />
              <span>{sessionGoals.trim() ? "Session Goals" : "Set Session Goals"}</span>
              {sessionGoals.trim() && !goalsOpen && (
                <span className="pomo-fs-goals-dot" />
              )}
              {goalsOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {goalsOpen && (
              <div className="pomo-fs-goals-panel">
                <textarea
                  className="pomo-fs-goals-textarea"
                  placeholder="What do you want to accomplish this session?&#10;e.g. Finish Kinematics chapter 3...&#10;     Solve 10 HC Verma problems..."
                  value={sessionGoals}
                  onChange={(e) => {
                    setSessionGoals(e.target.value);
                    try { localStorage.setItem("pomo_session_goals", e.target.value); } catch {}
                  }}
                  rows={4}
                  data-testid="pomo-fs-goals-text"
                />
                {sessionGoals.trim() && (
                  <button
                    className="pomo-fs-goals-clear"
                    onClick={() => {
                      setSessionGoals("");
                      try { localStorage.removeItem("pomo_session_goals"); } catch {}
                    }}
                    data-testid="pomo-fs-goals-clear"
                  >
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stoic quote — the soul of the screen */}
          <div className="pomo-fs-quote">
            <p className="pomo-fs-quote-text">"{quote.text}"</p>
            <p className="pomo-fs-quote-author">— {quote.author}</p>
          </div>

          {/* ── Music Player ── */}
          <div className="pomo-fs-music" data-testid="pomo-fs-music">
            <button
              className="pomo-fs-music-toggle"
              onClick={() => setMusicPanelOpen(!musicPanelOpen)}
              data-testid="pomo-fs-music-toggle"
            >
              <Music size={14} />
              <span>{musicEmbed ? musicEmbed.label : "Add Music"}</span>
              {musicPanelOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {musicPanelOpen && (
              <div className="pomo-fs-music-panel">
                {/* URL input */}
                <div className="pomo-fs-music-input-row">
                  <div className="pomo-fs-music-input-wrap">
                    <Link size={12} className="pomo-fs-music-link-icon" />
                    <input
                      className="pomo-fs-music-input"
                      placeholder="Paste Spotify or YouTube URL..."
                      value={musicUrl}
                      onChange={(e) => setMusicUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && applyMusicUrl()}
                      data-testid="pomo-fs-music-url"
                    />
                  </div>
                  <button className="pomo-fs-music-apply" onClick={applyMusicUrl} data-testid="pomo-fs-music-apply">
                    <Play size={12} /> Play
                  </button>
                  {musicEmbed && (
                    <button className="pomo-fs-music-clear" onClick={clearMusic} title="Remove music" data-testid="pomo-fs-music-clear">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                {/* Saved URL hint */}
                {savedMusicUrl && !musicUrl && (
                  <div className="pomo-fs-music-saved">
                    Currently: {savedMusicUrl.length > 50 ? savedMusicUrl.slice(0, 50) + "..." : savedMusicUrl}
                  </div>
                )}

                {/* Embed iframe */}
                {musicEmbed && (
                  <div className="pomo-fs-music-embed">
                    <iframe
                      src={musicEmbed.embedUrl}
                      width="100%"
                      height={musicEmbed.type === "spotify" ? 80 : 60}
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      title="Focus music"
                      style={{ borderRadius: 0, border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ESC hint */}
          <div className="pomo-fs-hint">ESC to exit</div>
        </div>,
        document.body
      )
    : null;

  /* ═══════════════════════════════════════════════
     INLINE (normal card) VIEW
     ═══════════════════════════════════════════════ */
  return (
    <>
      <div data-testid="pomodoro-widget">
        <div className="flex gap-2 mb-3 flex-wrap">
          {Object.entries(MODES).map(([k, v]) => (
            <button
              key={k}
              data-testid={`pomo-mode-${k}`}
              onClick={() => switchMode(k)}
              className={`hotbar-slot ${mode === k ? "active" : ""}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="text-center py-4" style={{ background: "var(--bg-0)", border: "2px solid #000", boxShadow: "inset 3px 3px 0 rgba(0,0,0,0.5)" }}>
          <div className="font-pixel" style={{ fontSize: compact ? 48 : 72, color: MODES[mode].color, textShadow: "3px 3px 0 #000", letterSpacing: "0.05em" }} data-testid="pomo-time">
            {mm}:{ss}
          </div>
          <div className="xp-bar-shell mt-3 mx-4">
            <div className="xp-bar-fill" style={{ width: `${pct}%`, background: MODES[mode].color }} />
          </div>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {/* START → goes fullscreen. PAUSE stays inline. */}
          {!running ? (
            <PixelButton variant="primary" onClick={startAndGoFullscreen} data-testid="pomo-toggle">
              <Maximize2 size={14} />Start
            </PixelButton>
          ) : (
            <>
              <PixelButton variant="primary" onClick={() => setRunning(false)} data-testid="pomo-toggle">
                <Pause size={14} />Pause
              </PixelButton>
              <PixelButton variant="diamond" onClick={() => setFullscreen(true)} data-testid="pomo-expand">
                <Maximize2 size={14} />Focus
              </PixelButton>
            </>
          )}
          <PixelButton onClick={reset} data-testid="pomo-reset">
            <RotateCcw size={14} />Reset
          </PixelButton>
        </div>

        {mode === "focus" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            <div>
              <label className="font-pixel text-[10px] uppercase" style={{ color: "var(--ink-muted)" }}>Subject</label>
              <select className="pixel-select mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="pomo-subject">
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Maths</option>
                <option>Coding</option>
                <option>Robotics</option>
                <option>Reading</option>
                <option>General</option>
              </select>
            </div>
            <div>
              <label className="font-pixel text-[10px] uppercase" style={{ color: "var(--gold)" }}>Custom Minutes (1-240)</label>
              <div className="flex gap-1 mt-1 items-center">
                {[15, 25, 45, 60].map((m) => (
                  <button key={m} onClick={() => applyCustom(m)} className={`hotbar-slot ${customMin === m ? "active" : ""}`} data-testid={`pomo-preset-${m}`}>
                    {m}
                  </button>
                ))}
                <input type="number" min="1" max="240" value={customMin} onChange={(e) => applyCustom(Math.max(1, Math.min(240, Number(e.target.value) || 1)))} className="pixel-input" style={{ width: 80, fontSize: 16 }} data-testid="pomo-custom-min" title="Type any number 1-240" />
              </div>
            </div>
          </div>
        )}
      </div>
      {fullscreenOverlay}
    </>
  );
}
