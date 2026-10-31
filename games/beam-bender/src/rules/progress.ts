import { BONUS_LEVELS, LEVELS, levelById, MAIN_LEVELS, type Level } from './levels.ts';

export interface Progress {
  /** Best stars by level id. A finished level always has at least 1. */
  stars: Record<number, number>;
  /** Levels passed with the skip button. They stay unfinished but open the next one. */
  skipped: number[];
  /** Bonus level ids opened by a hidden target. */
  found: number[];
}

export const emptyProgress = (): Progress => ({ stars: {}, skipped: [], found: [] });

const asStars = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(3, Math.floor(value))) : 0;

const knownIds = (value: unknown, levels: readonly Level[]): number[] =>
  levels.flatMap(({ id }) => (Array.isArray(value) && value.includes(id) ? [id] : []));

/** Stored values can be anything an older version left behind, so each one is checked. */
export function cleanProgress(saved: unknown): Progress {
  const raw = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const stars = (typeof raw.stars === 'object' && raw.stars !== null ? raw.stars : {}) as Record<string, unknown>;
  const clean = emptyProgress();
  for (const { id } of LEVELS) {
    const best = asStars(stars[id]);
    if (best > 0) clean.stars[id] = best;
  }
  clean.skipped = knownIds(raw.skipped, MAIN_LEVELS);
  clean.found = knownIds(raw.found, BONUS_LEVELS);
  return clean;
}

export const isDone = (progress: Progress, id: number): boolean => (progress.stars[id] ?? 0) > 0;

/** Levels open in order. Finishing or skipping one opens the next, and nothing ever closes again. */
export function isOpen(progress: Progress, id: number): boolean {
  const level = levelById(id);
  if (!level) return false;
  if (level.world === 'bonus') return progress.found.includes(id);
  const before = id - 1;
  return before < 1 || isDone(progress, before) || progress.skipped.includes(before);
}

/** Keeps the best result. A worse run never takes anything away. */
export function addWin(before: Progress, id: number, stars: number): Progress {
  return { ...before, stars: { ...before.stars, [id]: Math.max(before.stars[id] ?? 0, stars) } };
}

export const addSkip = (before: Progress, id: number): Progress =>
  before.skipped.includes(id) ? before : { ...before, skipped: [...before.skipped, id] };

export const addFound = (before: Progress, bonus: number): Progress =>
  before.found.includes(bonus) ? before : { ...before, found: [...before.found, bonus] };

/** The next level to point at, or null when every main level is done. */
export function nextLevel(progress: Progress): number | null {
  const waiting = MAIN_LEVELS.filter(({ id }) => !isDone(progress, id) && isOpen(progress, id));
  return (waiting.find(({ id }) => !progress.skipped.includes(id)) ?? waiting[0])?.id ?? null;
}

export const totalStars = (progress: Progress): number => Object.values(progress.stars).reduce((sum, stars) => sum + stars, 0);
