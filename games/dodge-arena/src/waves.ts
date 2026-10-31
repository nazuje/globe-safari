import type { Kind } from './dangers.ts';
import { KINDS } from './dangers.ts';
import { WARN_EASY, WARN_FLOOR, WARN_HARD } from './tuning.ts';

export const WAVE_SECONDS = 12;
/** Five waves make a minute, so a named wave always lands on the minute mark. */
const WAVES_PER_MINUTE = 5;
const HARDEST_AT = 300;
const FASTEST_AT = 600;
const FIRST_GAP = 2;
const HARD_GAP = 0.8;
const FASTEST_GAP = 0.6;
const NAMED_PACE = 0.75;

export const NAMED_WAVES = ['storm', 'bowling', 'disco', 'ripple', 'soup'] as const;
export type NamedWave = (typeof NAMED_WAVES)[number];

const NAMED_FOCUS: Record<NamedWave, Kind> = { storm: 'meteor', bowling: 'boulder', disco: 'beam', ripple: 'ring', soup: 'slime' };

/** The order dangers first appear, one a wave. Wave 5 is the first named wave, so slime comes straight after it. */
const DEBUTS: Partial<Record<number, Kind>> = { 0: 'meteor', 1: 'boulder', 2: 'beam', 3: 'ring', 4: 'bar', 6: 'slime' };
/** After every danger has shown up, each wave's new idea is one of them arriving in pairs. */
const TWINS: readonly Kind[] = ['meteor', 'boulder', 'beam', 'slime', 'bar', 'ring'];
const LAST_DEBUT = 6;

export interface Wave {
  index: number;
  /** The danger this wave is about. It turns up most often. */
  focus: Kind;
  /** Everything that can turn up. */
  kinds: readonly Kind[];
  /** A danger the player hasn't met before, so the game teaches it. */
  debut: Kind | null;
  name: NamedWave | null;
  /** The focus arrives in pairs. */
  twin: boolean;
}

function kindsMet(index: number): Kind[] {
  return KINDS.filter((kind) => Object.entries(DEBUTS).some(([at, debut]) => debut === kind && Number(at) <= index));
}

export function waveIndexAt(seconds: number): number {
  return Math.floor(seconds / WAVE_SECONDS);
}

export function waveAt(seconds: number): Wave {
  const index = waveIndexAt(seconds);
  const named = index > 0 && index % WAVES_PER_MINUTE === 0;
  const kinds = kindsMet(index);
  if (named) {
    const name = NAMED_WAVES[(index / WAVES_PER_MINUTE - 1) % NAMED_WAVES.length] as NamedWave;
    return { index, focus: NAMED_FOCUS[name], kinds, debut: null, name, twin: false };
  }
  const debut = DEBUTS[index] ?? null;
  if (debut) return { index, focus: debut, kinds, debut, name: null, twin: false };
  const turn = index - LAST_DEBUT - 1 - Math.floor((index - LAST_DEBUT - 1) / WAVES_PER_MINUTE);
  return { index, focus: TWINS[turn % TWINS.length] as Kind, kinds, debut: null, name: null, twin: true };
}

/** How hard the numbers are at this moment of an endless run, from 0 to 1. */
export function difficultyAt(seconds: number): number {
  return Math.min(1, seconds / HARDEST_AT);
}

/** Seconds of warning at this difficulty. It shrinks slowly and has a floor, however late the run gets. */
export function warnFor(difficulty: number): number {
  return Math.max(WARN_FLOOR, WARN_EASY + (WARN_HARD - WARN_EASY) * difficulty);
}

/** Seconds between new dangers. Named waves are denser, which is what makes them feel like an event. */
export function gapAt(seconds: number): number {
  const early = FIRST_GAP + (HARD_GAP - FIRST_GAP) * Math.min(1, seconds / HARDEST_AT);
  const late = HARD_GAP + (FASTEST_GAP - HARD_GAP) * Math.min(1, Math.max(0, seconds - HARDEST_AT) / (FASTEST_AT - HARDEST_AT));
  const gap = seconds < HARDEST_AT ? early : late;
  return waveAt(seconds).name ? gap * NAMED_PACE : gap;
}
