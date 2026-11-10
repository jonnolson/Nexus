/**
 * Tiny UI sounds, synthesised with Web Audio (no audio files to load).
 *
 * - `playHover()`: a very soft, short tick for hovering important controls.
 * - `playSuccess()`: a bright rising chime for money coming in (invoice marked paid).
 *
 * Browsers only allow audio after the user has interacted with the page, so the
 * AudioContext is created on the first pointer/key press (see `unlockAudio`); hovers
 * before that are silently skipped. Sounds can be switched off from the account menu
 * (stored per browser in localStorage).
 */

const STORAGE_KEY = "nexus:sounds";
const CHANGE_EVENT = "nexus:sounds-change";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// --- On/off preference --------------------------------------------------------------

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the toggle just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** For useSyncExternalStore. */
export function subscribeSounds(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// --- Audio context ------------------------------------------------------------------

/** Call from a user gesture (pointerdown/keydown). Safe to call repeatedly. */
export function unlockAudio() {
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
}

function ready(): { c: AudioContext; out: GainNode } | null {
  if (!ctx || !master || ctx.state !== "running" || !soundsEnabled()) return null;
  return { c: ctx, out: master };
}

/** One enveloped oscillator voice. */
function voice(
  c: AudioContext,
  out: AudioNode,
  {
    type = "sine",
    freq,
    freqEnd,
    start,
    attack = 0.004,
    decay,
    peak,
  }: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    start: number;
    attack?: number;
    decay: number;
    peak: number;
  },
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + decay);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + attack + decay + 0.02);
}

// --- Sounds -------------------------------------------------------------------------

let lastHover = 0;

/** Soft, short "tick". Throttled so sweeping across a toolbar doesn't rattle. */
export function playHover() {
  const a = ready();
  if (!a) return;
  const now = performance.now();
  if (now - lastHover < 70) return;
  lastHover = now;
  const t = a.c.currentTime;
  voice(a.c, a.out, { freq: 1900, freqEnd: 1300, start: t, attack: 0.002, decay: 0.035, peak: 0.05 });
}

/** Bright rising chime with a bell-like shimmer: "money in". */
export function playSuccess() {
  const a = ready();
  if (!a) return;
  const t = a.c.currentTime + 0.01;
  // Major arpeggio, C6 → E6 → G6 → C7, each note a sine plus a quiet octave partial.
  const notes = [1046.5, 1318.5, 1568, 2093];
  notes.forEach((f, i) => {
    const start = t + i * 0.075;
    const last = i === notes.length - 1;
    voice(a.c, a.out, { freq: f, start, decay: last ? 0.9 : 0.35, peak: last ? 0.07 : 0.05 });
    voice(a.c, a.out, { freq: f * 2, start, decay: last ? 0.5 : 0.2, peak: 0.015 });
  });
  // A soft low "body" under the first note so it doesn't sound thin.
  voice(a.c, a.out, { type: "triangle", freq: 523.25, start: t, attack: 0.01, decay: 0.45, peak: 0.03 });
}
