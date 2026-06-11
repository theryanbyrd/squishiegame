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
  if (!on) stopMusic();
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
    // Safari needed the webkit prefix until 14.1 (iOS 12 iPods etc.)
    const AC: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!ctx) ctx = new AC();
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

// --- background music: a bouncy 4-bar chiptune loop (C–Am–F–G) ---
// Scheduled in small lookahead windows so the loop stays in time even
// when the tab's timers are throttled.

const MUSIC_BPM = 132;
const STEP_DUR = 60 / MUSIC_BPM / 2; // eighth notes

// 32 eighth-note steps = 4 bars; null = rest
const MELODY: (number | null)[] = [
  // C major
  659, 784, 1047, 784, 659, 784, 880, 784,
  // A minor
  880, null, 659, 880, 1047, 880, 784, 659,
  // F major
  698, 880, 1047, 880, 698, 587, 659, 698,
  // G major
  784, 988, 784, 659, 587, null, 523, null,
];

const BASS_ROOTS = [131, 110, 87, 98]; // C3 A2 F2 G2, one per bar
const BASS: (number | null)[] = Array.from({ length: 32 }, (_, i) =>
  i % 2 === 0 ? BASS_ROOTS[Math.floor(i / 8)] : null
);

let musicPlaying = false;
let musicStep = 0;
let nextStepTime = 0;
let schedulerId: ReturnType<typeof setInterval> | null = null;

function playNote(
  freq: number,
  t: number,
  dur: number,
  type: OscillatorType,
  vol: number
) {
  const c = ctx;
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.setValueAtTime(vol, t + dur * 0.6);
  gain.gain.linearRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function startMusic() {
  if (musicPlaying || !enabled) return;
  const c = getCtx();
  if (!c) return;
  musicPlaying = true;
  musicStep = 0;
  nextStepTime = c.currentTime + 0.1;
  schedulerId = setInterval(() => {
    if (!ctx || !musicPlaying) return;
    while (nextStepTime < ctx.currentTime + 0.35) {
      const i = musicStep % MELODY.length;
      const m = MELODY[i];
      if (m) playNote(m, nextStepTime, STEP_DUR * 0.9, "square", 0.03);
      const b = BASS[i];
      if (b) playNote(b, nextStepTime, STEP_DUR * 1.8, "triangle", 0.07);
      musicStep++;
      nextStepTime += STEP_DUR;
    }
  }, 120);
}

export function stopMusic() {
  musicPlaying = false;
  if (schedulerId) {
    clearInterval(schedulerId);
    schedulerId = null;
  }
}
