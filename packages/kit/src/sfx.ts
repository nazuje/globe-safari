import { onEveryTap } from './taps.ts';

const VOLUME = 0.5;
const QUIET = 0.001;

interface Tone {
  wave: OscillatorType;
  from: number;
  to: number;
  seconds: number;
  gain?: number;
  /** Seconds after the sound starts, for sounds made of several tones. */
  after?: number;
}

const SOUNDS = {
  pop: [{ wave: 'sine', from: 900, to: 220, seconds: 0.09 }],
  boing: [{ wave: 'triangle', from: 180, to: 620, seconds: 0.28 }],
  ding: [{ wave: 'sine', from: 1320, to: 1320, seconds: 0.35, gain: 0.6 }],
  whoosh: [{ wave: 'sawtooth', from: 200, to: 1200, seconds: 0.3, gain: 0.15 }],
  bonk: [{ wave: 'square', from: 160, to: 60, seconds: 0.14, gain: 0.5 }],
  dig: [{ wave: 'square', from: 120, to: 70, seconds: 0.08, gain: 0.35 }],
  burp: [{ wave: 'sawtooth', from: 110, to: 60, seconds: 0.4, gain: 0.7 }],
  toot: [{ wave: 'square', from: 95, to: 70, seconds: 0.45, gain: 0.5 }],
  tada: [
    { wave: 'triangle', from: 523, to: 523, seconds: 0.14 },
    { wave: 'triangle', from: 659, to: 659, seconds: 0.14, after: 0.13 },
    { wave: 'triangle', from: 784, to: 784, seconds: 0.14, after: 0.26 },
    { wave: 'triangle', from: 1047, to: 1047, seconds: 0.4, after: 0.39 },
  ],
} satisfies Record<string, Tone[]>;

export type SoundName = keyof typeof SOUNDS;

export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];

export interface NoteOptions {
  wave?: OscillatorType;
  seconds?: number;
  gain?: number;
}

let context: AudioContext | null = null;
let master: AudioNode | null = null;

function wake(): void {
  if (context && context.state !== 'running') context.resume().catch(() => undefined);
}

/** Browsers only let sound start from a tap, so the first sound of a game also watches for the next tap. */
function ready(): boolean {
  if (context) return true;
  if (typeof AudioContext === 'undefined') return false;
  try {
    context = new AudioContext();
    // Keeps a child mashing the screen from turning into a harsh, clipped noise.
    const limiter = context.createDynamicsCompressor();
    const gain = context.createGain();
    gain.gain.value = VOLUME;
    limiter.connect(gain).connect(context.destination);
    master = limiter;
    onEveryTap(wake);
  } catch {
    context = null;
  }
  return context !== null;
}

function play({ wave, from, to, seconds, gain = 1, after = 0 }: Tone): void {
  if (!context || !master) return;
  const at = context.currentTime + after;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(from, at);
  oscillator.frequency.exponentialRampToValueAtTime(to, at + seconds);
  envelope.gain.setValueAtTime(gain, at);
  envelope.gain.exponentialRampToValueAtTime(QUIET, at + seconds);
  oscillator.connect(envelope).connect(master);
  oscillator.start(at);
  oscillator.stop(at + seconds);
}

/** A short sound effect. Quiet no-op without Web Audio, so a game plays on silently. */
export function playSound(name: SoundName): void {
  if (!ready()) return;
  wake();
  for (const tone of SOUNDS[name]) play(tone);
}

/** One held note, for games that make music. */
export function playNote(hz: number, { wave = 'triangle', seconds = 0.4, gain = 0.7 }: NoteOptions = {}): void {
  if (!ready()) return;
  wake();
  play({ wave, from: hz, to: hz, seconds, gain });
}

/** For tests: forgets the audio context so each test starts clean. */
export function resetSounds(): void {
  context = null;
  master = null;
}
