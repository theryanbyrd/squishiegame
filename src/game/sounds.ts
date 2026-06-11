// Tiny synthesized kawaii sound effects via Web Audio — no asset files.
// The AudioContext is created lazily on first use (inside a user gesture,
// which iOS Safari requires before audio can play).

let ctx: AudioContext | null = null;
let enabled = loadEnabled();

function loadEnabled(): boolean {
  try {
    return localStorage.getItem("dumplingDash.sound") !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem("dumplingDash.sound", on ? "on" : "off");
  } catch {
    // ignore
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type ToneOpts = {
  freq: number;
  endFreq?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
};

function tone({ freq, endFreq, dur, type = "sine", vol = 0.12, delay = 0 }: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  /** UI button tap — soft pop */
  click() {
    tone({ freq: 520, endFreq: 740, dur: 0.07, type: "triangle", vol: 0.08 });
  },
  /** bao bounce — squishy boing */
  flap() {
    tone({ freq: 300, endFreq: 560, dur: 0.12, type: "triangle", vol: 0.1 });
  },
  /** passed an obstacle — gentle tick */
  pass() {
    tone({ freq: 700, dur: 0.06, vol: 0.06 });
    tone({ freq: 940, dur: 0.06, vol: 0.06, delay: 0.05 });
  },
  /** collected a star/heart/boba — sparkle ding */
  collect() {
    tone({ freq: 880, dur: 0.09, vol: 0.1 });
    tone({ freq: 1320, dur: 0.12, vol: 0.1, delay: 0.06 });
  },
  /** rare golden dumpling — little fanfare */
  golden() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) =>
      tone({ freq, dur: 0.14, type: "triangle", vol: 0.12, delay: i * 0.08 })
    );
  },
  /** run ended — soft sad womp (gentle, kid-friendly) */
  gameover() {
    tone({ freq: 330, endFreq: 160, dur: 0.4, type: "triangle", vol: 0.12 });
    tone({ freq: 220, endFreq: 110, dur: 0.5, type: "sine", vol: 0.1, delay: 0.08 });
  },
  /** level up — cheerful jingle */
  levelup() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) =>
      tone({ freq, dur: 0.18, type: "triangle", vol: 0.13, delay: i * 0.1 })
    );
  },
  /** new badge unlocked — twinkle */
  badge() {
    tone({ freq: 988, dur: 0.1, vol: 0.1 });
    tone({ freq: 1319, dur: 0.16, vol: 0.1, delay: 0.09 });
  },
};
