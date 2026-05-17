/**
 * AlarmSound — Multi-ringtone alarm system with preset + custom audio support.
 *
 * Presets are 100% Web Audio API synthesized (no external files).
 * Custom ringtones use the HTML5 Audio API with user-uploaded data URLs.
 */

// ── Preset: Minecraft XP (8-bit ascending chime) ──
function playMinecraft(ctx, gain) {
  const notes = [
    { freq: 523.25, start: 0.00, dur: 0.12, vol: 0.20 },
    { freq: 659.25, start: 0.16, dur: 0.12, vol: 0.22 },
    { freq: 783.99, start: 0.32, dur: 0.12, vol: 0.24 },
    { freq: 1046.50, start: 0.48, dur: 0.28, vol: 0.28 },
    { freq: 1318.51, start: 0.85, dur: 0.08, vol: 0.15 },
    { freq: 587.33, start: 1.10, dur: 0.12, vol: 0.20 },
    { freq: 739.99, start: 1.26, dur: 0.12, vol: 0.22 },
    { freq: 880.00, start: 1.42, dur: 0.12, vol: 0.24 },
    { freq: 1174.66, start: 1.58, dur: 0.30, vol: 0.30 },
    { freq: 1396.91, start: 2.00, dur: 0.06, vol: 0.12 },
    { freq: 1567.98, start: 2.10, dur: 0.06, vol: 0.10 },
    { freq: 1760.00, start: 2.20, dur: 0.10, vol: 0.08 },
  ];
  const t = ctx.currentTime;
  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = n.freq;
    g.gain.setValueAtTime(0.001, t + n.start);
    g.gain.linearRampToValueAtTime(n.vol, t + n.start + 0.008);
    g.gain.setValueAtTime(n.vol, t + n.start + n.dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
    osc.connect(g);
    g.connect(gain);
    osc.start(t + n.start);
    osc.stop(t + n.start + n.dur + 0.02);
  });
  // Sub-bass rumble
  const bass = ctx.createOscillator();
  const bg = ctx.createGain();
  bass.type = "sine";
  bass.frequency.value = 65.41;
  bg.gain.setValueAtTime(0.08, t);
  bg.gain.linearRampToValueAtTime(0.12, t + 1.0);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
  bass.connect(bg);
  bg.connect(gain);
  bass.start(t);
  bass.stop(t + 2.6);
}

// ── Preset: Gentle Bell (soft sine wave bell) ──
function playGentle(ctx, gain) {
  const t = ctx.currentTime;
  const bellNotes = [
    { freq: 440, start: 0, dur: 1.5, vol: 0.15 },
    { freq: 554.37, start: 0.6, dur: 1.2, vol: 0.12 },
    { freq: 659.25, start: 1.2, dur: 1.0, vol: 0.10 },
    { freq: 880, start: 2.0, dur: 1.5, vol: 0.13 },
  ];
  bellNotes.forEach((n) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.freq;
    g.gain.setValueAtTime(0.001, t + n.start);
    g.gain.linearRampToValueAtTime(n.vol, t + n.start + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
    osc.connect(g);
    g.connect(gain);
    osc.start(t + n.start);
    osc.stop(t + n.start + n.dur + 0.05);
  });
}

// ── Preset: Battle Horn (epic brass) ──
function playBattle(ctx, gain) {
  const t = ctx.currentTime;
  [130.81, 164.81, 196.00, 261.63].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const start = i * 0.35;
    g.gain.setValueAtTime(0.001, t + start);
    g.gain.linearRampToValueAtTime(0.18, t + start + 0.08);
    g.gain.setValueAtTime(0.18, t + start + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + 1.2);
    osc.connect(g);
    g.connect(gain);
    osc.start(t + start);
    osc.stop(t + start + 1.3);
  });
  // Power chord sustain
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sawtooth";
  osc2.frequency.value = 261.63;
  g2.gain.setValueAtTime(0.001, t + 1.4);
  g2.gain.linearRampToValueAtTime(0.22, t + 1.6);
  g2.gain.setValueAtTime(0.22, t + 2.4);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
  osc2.connect(g2);
  g2.connect(gain);
  osc2.start(t + 1.4);
  osc2.stop(t + 3.3);
}

// ── Preset: Redstone Pulse (electronic) ──
function playRedstone(ctx, gain) {
  const t = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 220 + i * 110;
    const start = i * 0.25;
    g.gain.setValueAtTime(0.001, t + start);
    g.gain.linearRampToValueAtTime(0.14, t + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + start + 0.2);
    osc.connect(g);
    g.connect(gain);
    osc.start(t + start);
    osc.stop(t + start + 0.25);
  }
  // Bass drop
  const bass = ctx.createOscillator();
  const bg = ctx.createGain();
  bass.type = "square";
  bass.frequency.setValueAtTime(440, t + 1.6);
  bass.frequency.exponentialRampToValueAtTime(55, t + 2.4);
  bg.gain.setValueAtTime(0.001, t + 1.6);
  bg.gain.linearRampToValueAtTime(0.20, t + 1.65);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
  bass.connect(bg);
  bg.connect(gain);
  bass.start(t + 1.6);
  bass.stop(t + 2.6);
}

const SYNTH_MAP = { minecraft: playMinecraft, gentle: playGentle, battle: playBattle, redstone: playRedstone };

/**
 * Create an alarm player that supports both preset synth sounds and custom audio files.
 * @param {string} type - "minecraft" | "gentle" | "battle" | "redstone" | "custom"
 * @param {string} [customDataUrl] - base64 data URL for custom audio
 * @returns {{ start: Function, stop: Function, setVolume: Function }}
 */
export function createAlarmPlayer(type = "minecraft", customDataUrl = null) {
  let ctx = null;
  let gainNode = null;
  let loopId = null;
  let isPlaying = false;
  let audioEl = null;

  const start = () => {
    if (isPlaying) return;
    isPlaying = true;

    if (type === "custom" && customDataUrl) {
      // Play custom audio file on loop
      try {
        audioEl = new Audio(customDataUrl);
        audioEl.loop = true;
        audioEl.volume = 0.7;
        audioEl.play().catch(() => {});
      } catch (e) {
        console.warn("Custom ringtone failed, falling back to Minecraft", e);
        startSynth("minecraft");
      }
    } else {
      startSynth(type);
    }
  };

  const startSynth = (synthType) => {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = ctx.createGain();
      gainNode.gain.value = 0.25;
      gainNode.connect(ctx.destination);
      const fn = SYNTH_MAP[synthType] || SYNTH_MAP.minecraft;
      fn(ctx, gainNode);
      loopId = setInterval(() => {
        if (isPlaying && ctx) fn(ctx, gainNode);
      }, 3200);
    } catch (e) {
      console.warn("AlarmSound: Web Audio not supported", e);
    }
  };

  const stop = () => {
    isPlaying = false;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl = null;
    }
    if (loopId) {
      clearInterval(loopId);
      loopId = null;
    }
    if (ctx && ctx.state !== "closed") {
      try { ctx.close(); } catch {}
    }
    ctx = null;
    gainNode = null;
  };

  const setVolume = (v) => {
    const vol = Math.max(0, Math.min(1, v));
    if (gainNode) gainNode.gain.value = vol;
    if (audioEl) audioEl.volume = vol;
  };

  return { start, stop, setVolume };
}

// Backward compat — default export is the old PixelAlarm class interface
export default class PixelAlarm {
  constructor() {
    this._player = createAlarmPlayer("minecraft");
  }
  start() { this._player.start(); }
  stop() { this._player.stop(); }
  setVolume(v) { this._player.setVolume(v); }
}
