import type { StarCount } from './rating.ts';
import type { DifficultyId } from './tuning.ts';

export interface Best {
  stars: StarCount;
  score: number;
}

export interface Progress {
  /** The best run per level and setting. */
  best: Record<string, Best>;
  /** Levels whose hidden treasure has been found. */
  treasures: string[];
}

export const emptyProgress = (): Progress => ({ best: {}, treasures: [] });

function cleanBest(saved: unknown): Best | null {
  if (typeof saved !== 'object' || saved === null) return null;
  const { stars, score } = saved as { stars?: unknown; score?: unknown };
  if ((stars !== 1 && stars !== 2 && stars !== 3) || typeof score !== 'number' || !Number.isFinite(score) || score < 0) return null;
  return { stars, score: Math.round(score) };
}

/** Saved data can be anything by the time it's read back. Whatever can't be trusted is left out. */
export function cleanProgress(saved: unknown): Progress {
  const progress = emptyProgress();
  if (typeof saved !== 'object' || saved === null) return progress;
  const { best, treasures } = saved as { best?: unknown; treasures?: unknown };
  if (typeof best === 'object' && best !== null) {
    for (const [key, value] of Object.entries(best)) {
      const clean = cleanBest(value);
      if (clean) progress.best[key] = clean;
    }
  }
  if (Array.isArray(treasures)) progress.treasures = treasures.filter((id): id is string => typeof id === 'string');
  return progress;
}

export const bestKey = (levelId: string, difficulty: DifficultyId): string => `${levelId}:${difficulty}`;

export interface Outcome {
  levelId: string;
  difficulty: DifficultyId;
  stars: StarCount;
  score: number;
  foundTreasure: boolean;
}

export interface Recorded {
  progress: Progress;
  /** This run beat an earlier score, which isn't true of a first go. */
  newBest: boolean;
  firstTreasure: boolean;
}

export function record(progress: Progress, outcome: Outcome): Recorded {
  const key = bestKey(outcome.levelId, outcome.difficulty);
  const before = progress.best[key];
  const best: Best = {
    stars: Math.max(before?.stars ?? 1, outcome.stars) as StarCount,
    score: Math.max(before?.score ?? 0, outcome.score),
  };
  const firstTreasure = outcome.foundTreasure && !progress.treasures.includes(outcome.levelId);
  return {
    progress: {
      best: { ...progress.best, [key]: best },
      treasures: firstTreasure ? [...progress.treasures, outcome.levelId] : progress.treasures,
    },
    newBest: before !== undefined && outcome.score > before.score,
    firstTreasure,
  };
}
