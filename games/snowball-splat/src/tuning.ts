import type { Assist } from './aim.ts';
import type { Band, Motion } from './layout.ts';

export const LEVEL_IDS = ['easy', 'medium', 'hard'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export const ROUND_SECONDS = 60;
export const GOLDEN_POINTS = 10;
export const FAR_POINTS = 3;
export const FRIEND_POINTS = 5;

export interface Level {
  /** How big snowmen are. */
  size: number;
  /** Snowmen out at the start, and how many more by the end of the round. */
  crowd: number;
  crowdRise: number;
  /** Seconds a snowman stays out at the start. */
  stay: number;
  /** How fast things slide, as a multiple of Easy. */
  speed: number;
  /** How much faster everything is by the end of the round: 0.5 means half as fast again. */
  ramp: number;
  /** Seconds between new snowmen. */
  gap: number;
  bands: Record<Band, number>;
  motions: Record<Motion, number>;
  assist: Assist;
  giantHits: number;
  /** How forgiving taps at the giant are. */
  giantPull: number;
  /** Scores for one, two and three stars. The first is what the giant alone gives. */
  stars: readonly [number, number, number];
  /** Seconds between harmless snowballs at the screen, or null for none. */
  lobEvery: number | null;
}

export const LEVELS: Record<LevelId, Level> = {
  easy: {
    size: 1.4,
    crowd: 3,
    crowdRise: 1,
    stay: 6,
    speed: 1,
    ramp: 0.5,
    gap: 0.7,
    bands: { near: 5, mid: 3, far: 0 },
    motions: { rise: 4, slide: 4, waddle: 3, sled: 1, window: 1 },
    assist: { size: 0.5, angle: 0.11 },
    giantHits: 12,
    giantPull: 100,
    stars: [12, 30, 45],
    lobEvery: null,
  },
  medium: {
    size: 1.1,
    crowd: 4,
    crowdRise: 1,
    stay: 3.4,
    speed: 1.6,
    ramp: 0.7,
    gap: 0.5,
    bands: { near: 3, mid: 4, far: 2 },
    motions: { rise: 3, slide: 3, waddle: 3, sled: 3, window: 2 },
    assist: { size: 0.25, angle: 0.05 },
    giantHits: 18,
    giantPull: 3,
    stars: [18, 55, 100],
    lobEvery: 11,
  },
  hard: {
    size: 0.9,
    crowd: 5,
    crowdRise: 2,
    stay: 2.2,
    speed: 2.3,
    ramp: 0.9,
    gap: 0.4,
    bands: { near: 2, mid: 4, far: 4 },
    motions: { rise: 3, slide: 3, waddle: 2, sled: 4, window: 3 },
    assist: { size: 0.1, angle: 0.022 },
    giantHits: 26,
    giantPull: 1.5,
    stars: [26, 70, 130],
    lobEvery: 6,
  },
};

/** 0, 1, 2 or 3 stars for a score. */
export function starsFor(score: number, level: Level): number {
  return level.stars.filter((needed) => score >= needed).length;
}

/** What a saved level should be, whatever storage held. */
export function cleanLevel(saved: unknown): LevelId {
  return LEVEL_IDS.find((level) => level === saved) ?? 'easy';
}

/** How many rounds came before this one, and what to save for next time. */
export function countRound(saved: unknown): { before: number; after: number } {
  const before = typeof saved === 'number' && Number.isInteger(saved) && saved > 0 ? saved : 0;
  return { before, after: before + 1 };
}

/** Personal bests by level, whatever storage held. */
export function cleanBests(saved: unknown): Record<LevelId, number> {
  const held = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const best = (level: LevelId): number => {
    const value = held[level];
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  };
  return { easy: best('easy'), medium: best('medium'), hard: best('hard') };
}
