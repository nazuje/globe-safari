import { STEPS_PER_BAR, type ScaleKind, scaleMidi } from './music.ts';

export const STYLE_IDS = ['march', 'disco', 'lullaby', 'robot', 'circus'] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export type Backing = 'kick' | 'snare' | 'hat' | 'stab' | 'bass';

export interface Style {
  id: StyleId;
  emoji: string;
  bpm: number;
  scale: ScaleKind;
  /** Degree 0 of the tunes. */
  root: number;
  /** Degree 0 of the bass, at least A2 so phones can carry it. */
  bassRoot: number;
  /** The scale degree each bar's chord sits on, for the eight bars of the loop. */
  chords: readonly number[];
  /** One bar, a character per step. x plays, o plays softly; on the bass line a digit is a scale step. */
  tracks: Record<Backing, string>;
  lead: OscillatorType;
  /** Scales the whole backing, so a lullaby stays a lullaby. */
  loudness: number;
}

export const STYLES: Record<StyleId, Style> = {
  march: {
    id: 'march',
    emoji: '🎺',
    bpm: 112,
    scale: 'major',
    root: 60,
    bassRoot: 48,
    chords: [0, 3, 0, 3, 0, 4, 3, 0],
    tracks: {
      kick: 'x-------x-------',
      snare: '----x-o-----x-o-',
      hat: 'o-o-o-o-o-o-o-o-',
      stab: '--x---x---x---x-',
      bass: '0-------3-------',
    },
    lead: 'triangle',
    loudness: 1,
  },
  disco: {
    id: 'disco',
    emoji: '🪩',
    bpm: 122,
    scale: 'minor',
    root: 57,
    bassRoot: 45,
    chords: [0, 0, 4, 4, 1, 1, 4, 3],
    tracks: {
      kick: 'x---x---x---x---',
      snare: '----x-------x---',
      hat: '--x---x---x---x-',
      stab: '---x--x----x--x-',
      bass: '0-5-0-5-0-5-3-5-',
    },
    lead: 'sawtooth',
    loudness: 1,
  },
  lullaby: {
    id: 'lullaby',
    emoji: '🌙',
    bpm: 76,
    scale: 'major',
    root: 67,
    bassRoot: 55,
    chords: [0, 4, 3, 0, 0, 3, 4, 0],
    tracks: {
      kick: '----------------',
      snare: '----------------',
      hat: '--------o-------',
      stab: 'o-------o-------',
      bass: '0-------3-------',
    },
    lead: 'sine',
    loudness: 0.7,
  },
  robot: {
    id: 'robot',
    emoji: '🤖',
    bpm: 104,
    scale: 'minor',
    root: 64,
    bassRoot: 52,
    chords: [0, 0, 3, 3, 0, 0, 2, 3],
    tracks: {
      kick: 'x--x--x-x--x----',
      snare: '----x-------x---',
      hat: 'oooooooooooooooo',
      stab: 'x-----x-----x---',
      bass: '0--0--5-0--0--3-',
    },
    lead: 'square',
    loudness: 0.9,
  },
  circus: {
    id: 'circus',
    emoji: '🎪',
    bpm: 138,
    scale: 'major',
    root: 62,
    bassRoot: 50,
    chords: [0, 3, 3, 0, 0, 3, 4, 0],
    tracks: {
      kick: 'x-------x-------',
      snare: '------------o-o-',
      hat: '----o-------o---',
      stab: '----x-------x---',
      bass: '0-------3-------',
    },
    lead: 'triangle',
    loudness: 1,
  },
};

/** The note of the chord under a given step. */
export function chordDegree(style: Style, step: number): number {
  const bar = Math.floor(step / STEPS_PER_BAR);
  const { length } = style.chords;
  return style.chords[((bar % length) + length) % length] ?? 0;
}

/** A bass note: the chord's root plus a step up the scale. */
export function bassMidi(style: Style, step: number, offset: number): number {
  return scaleMidi(style.bassRoot, style.scale, chordDegree(style, step) + offset);
}

/** Three notes of the scale, around the chord. Never leaves the pentatonic, so it can't clash. */
export function stabMidis(style: Style, step: number): number[] {
  const degree = chordDegree(style, step);
  return [0, 2, 3].map((offset) => scaleMidi(style.root, style.scale, degree + offset));
}
