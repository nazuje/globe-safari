import type { Level } from './rounds.ts';

export type ScoredMode = 'guess' | 'make';

export interface Progress {
  stars: Record<ScoredMode, number>;
  level: Record<ScoredMode, Level>;
}

export const PROGRESS_KEY = 'color-lab';

function asStars(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;
}

function asLevel(value: unknown): Level {
  return value === 1 || value === 2 ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Saved data can be old or damaged, so nothing in it is trusted. */
export function readProgress(saved: unknown): Progress {
  const { stars, level } = asRecord(saved);
  const savedStars = asRecord(stars);
  const savedLevel = asRecord(level);
  return {
    stars: { guess: asStars(savedStars['guess']), make: asStars(savedStars['make']) },
    level: { guess: asLevel(savedLevel['guess']), make: asLevel(savedLevel['make']) },
  };
}

export function withStar(progress: Progress, mode: ScoredMode): Progress {
  return { ...progress, stars: { ...progress.stars, [mode]: progress.stars[mode] + 1 } };
}

export function withLevel(progress: Progress, mode: ScoredMode, level: Level): Progress {
  return { ...progress, level: { ...progress.level, [mode]: level } };
}
