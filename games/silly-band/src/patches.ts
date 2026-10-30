import { midiToHz } from './music.ts';
import { STYLES, type StyleId } from './styles.ts';

export type Voice =
  | 'kick'
  | 'snare'
  | 'hat'
  | 'stab'
  | 'drum'
  | 'tom'
  | 'bass'
  | 'melody'
  | 'voice'
  | 'clap'
  | 'sparkle'
  | 'tiny'
  | 'cheer'
  | 'whoosh';

/** One sound to make. `level` scales it, for soft notes. */
export interface Note {
  voice: Voice;
  midi: number;
  level?: number;
}

/** One layer of a sound: a wave or noise, with a pitch slide, a shaped loudness and maybe a filter. */
export interface Part {
  source: OscillatorType | 'noise';
  from: number;
  to?: number;
  seconds: number;
  gain: number;
  attack?: number;
  after?: number;
  filter?: { type: BiquadFilterType; hz: number; q: number };
}

function hat(seconds: number, gain: number): Part {
  return { source: 'noise', from: 0, seconds, gain, filter: { type: 'highpass', hz: 6500, q: 0.7 } };
}

function clapBurst(after: number, gain: number, seconds = 0.05): Part {
  return { source: 'noise', from: 0, seconds, gain, after, filter: { type: 'bandpass', hz: 1500, q: 1.1 } };
}

/** Square and saw waves are buzzy, so they always go through a soft filter. */
function lead(wave: OscillatorType, hz: number, seconds: number, gain: number): Part {
  const soft = wave === 'square' || wave === 'sawtooth';
  return {
    source: wave,
    from: hz * 0.98,
    to: hz,
    seconds,
    gain: soft ? gain * 0.6 : gain,
    attack: 0.008,
    ...(soft ? { filter: { type: 'lowpass' as const, hz: Math.min(hz * 3, 2600), q: 0.7 } } : {}),
  };
}

/**
 * The recipe for each sound, as data. Every recipe has a layer of 110 Hz or
 * higher, because a phone speaker can't play a low note on its own.
 */
export function patch(note: Note, styleId: StyleId): Part[] {
  const hz = midiToHz(note.midi);
  const style = STYLES[styleId];
  switch (note.voice) {
    case 'kick':
      return [
        { source: 'sine', from: 170, to: 62, seconds: 0.16, gain: 0.5 },
        { source: 'triangle', from: 340, to: 130, seconds: 0.1, gain: 0.22 },
        { source: 'noise', from: 0, seconds: 0.012, gain: 0.08, filter: { type: 'bandpass', hz: 2200, q: 0.8 } },
      ];
    case 'snare':
      return [
        { source: 'triangle', from: 300, to: 190, seconds: 0.08, gain: 0.14 },
        { source: 'noise', from: 0, seconds: 0.13, gain: 0.2, filter: { type: 'bandpass', hz: 2600, q: 0.6 } },
      ];
    case 'hat':
      return [hat(0.035, 0.09)];
    case 'stab':
      return [{ ...lead(style.lead, hz, 0.2, 0.08), attack: 0.012 }];
    case 'drum':
      return [
        { source: 'sine', from: 210, to: 75, seconds: 0.2, gain: 0.6 },
        { source: 'triangle', from: 420, to: 150, seconds: 0.12, gain: 0.3 },
        { source: 'noise', from: 0, seconds: 0.02, gain: 0.12, filter: { type: 'bandpass', hz: 1800, q: 0.7 } },
      ];
    case 'tom':
      return [
        { source: 'sine', from: 340, to: 170, seconds: 0.2, gain: 0.5 },
        { source: 'triangle', from: 680, to: 340, seconds: 0.1, gain: 0.16 },
        { source: 'noise', from: 0, seconds: 0.03, gain: 0.08, filter: { type: 'bandpass', hz: 1400, q: 0.8 } },
      ];
    case 'bass':
      return [
        { source: 'triangle', from: hz, seconds: 0.26, gain: 0.34, attack: 0.006 },
        // The overtones are what a phone speaker really plays.
        { source: 'sawtooth', from: hz * 2, seconds: 0.2, gain: 0.08, attack: 0.006, filter: { type: 'lowpass', hz: 1100, q: 0.8 } },
      ];
    case 'melody':
      return [
        // A small slide up, like a tiny meow.
        { ...lead(style.lead, hz, 0.34, 0.26), from: hz * 0.9 },
        { source: 'sine', from: hz * 2, seconds: 0.16, gain: 0.05, attack: 0.008 },
      ];
    case 'voice':
      return [
        { source: 'sawtooth', from: hz * 0.8, to: hz * 1.25, seconds: 0.09, gain: 0.26, attack: 0.006, filter: { type: 'bandpass', hz: 900, q: 2.5 } },
        { source: 'sawtooth', from: hz * 1.25, to: hz, seconds: 0.14, gain: 0.26, attack: 0.006, after: 0.08, filter: { type: 'bandpass', hz: 1500, q: 2.5 } },
      ];
    case 'clap':
      return [clapBurst(0, 0.28), clapBurst(0.018, 0.26), clapBurst(0.036, 0.3, 0.14)];
    case 'sparkle':
      return [
        { source: 'sine', from: hz, seconds: 0.4, gain: 0.14 },
        { source: 'sine', from: hz * 2, seconds: 0.25, gain: 0.05, after: 0.05 },
      ];
    case 'tiny':
      return [
        { source: 'triangle', from: hz * 1.3, to: hz, seconds: 0.09, gain: 0.14 },
        { source: 'sine', from: hz * 2, seconds: 0.08, gain: 0.04 },
      ];
    case 'cheer':
      return [
        { source: 'noise', from: 0, seconds: 1.4, gain: 0.14, attack: 0.3, filter: { type: 'bandpass', hz: 1700, q: 0.5 } },
        { source: 'noise', from: 0, seconds: 0.9, gain: 0.08, attack: 0.1, after: 0.2, filter: { type: 'bandpass', hz: 3200, q: 1 } },
      ];
    case 'whoosh':
      return [
        { source: 'noise', from: 0, seconds: 0.35, gain: 0.12, attack: 0.12, filter: { type: 'bandpass', hz: 2400, q: 0.8 } },
        { source: 'sine', from: 300, to: 1200, seconds: 0.3, gain: 0.07, attack: 0.05 },
      ];
  }
}
