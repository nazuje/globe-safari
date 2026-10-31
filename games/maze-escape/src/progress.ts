import { LEVELS } from './levels.ts';
import { SETTINGS, type Setting } from './tuning.ts';

export type TreasureId = number;

export interface Progress {
  /** Best stars for each level, by setting. 0 means not finished yet. */
  stars: Record<Setting, number[]>;
  /** Level numbers whose hidden treasure has been found. */
  treasures: number[];
}

const asStars = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;

function cleanRow(saved: unknown): number[] {
  const row = Array.isArray(saved) ? saved : [];
  return LEVELS.map((_, index) => asStars(row[index]));
}

/** Stored values can be anything an older version left behind, so each one is checked. */
export function cleanProgress(saved: unknown): Progress {
  const raw = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const stars = (typeof raw.stars === 'object' && raw.stars !== null ? raw.stars : {}) as Record<string, unknown>;
  const treasures = Array.isArray(raw.treasures) ? raw.treasures : [];
  return {
    stars: Object.fromEntries(SETTINGS.map((setting) => [setting, cleanRow(stars[setting])])) as Record<Setting, number[]>,
    treasures: LEVELS.flatMap((_, index) => (treasures.includes(index + 1) ? [index + 1] : [])),
  };
}

/** Keeps the best result. A worse run never takes anything away. */
export function addWin(before: Progress, setting: Setting, level: number, stars: number): Progress {
  const row = before.stars[setting].map((best, index) => (index === level - 1 ? Math.max(best, stars) : best));
  return { ...before, stars: { ...before.stars, [setting]: row } };
}

export const addTreasure = (before: Progress, level: number): Progress =>
  before.treasures.includes(level) ? before : { ...before, treasures: [...before.treasures, level].sort((a, b) => a - b) };

/** The first level not finished yet, for the map to point at. Everything stays open whatever this says. */
export function nextLevel(progress: Progress, setting: Setting): number {
  const open = progress.stars[setting].findIndex((stars) => stars === 0);
  return open === -1 ? LEVELS.length : open + 1;
}

export const totalStars = (progress: Progress, setting: Setting): number =>
  progress.stars[setting].reduce((sum, stars) => sum + stars, 0);
