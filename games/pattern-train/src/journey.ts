import { MAX_LEVEL } from './pattern.ts';

export const TRAINS_PER_LEVEL = 5;

/** Saved values can be old or broken, so anything odd falls back to the first level. */
export function readFurthest(saved: unknown): number {
  return typeof saved === 'number' && Number.isInteger(saved) && saved >= 1 && saved <= MAX_LEVEL ? saved : 1;
}

/**
 * A level counts as reached once a train there is finished, so a family peeking
 * at Level 6 doesn't move their starting point. Finishing a level reaches the next.
 */
export function furthestAfterTrain(furthest: number, level: number, trainsDone: number): number {
  const reached = trainsDone >= TRAINS_PER_LEVEL ? level + 1 : level;
  return Math.max(furthest, Math.min(reached, MAX_LEVEL));
}
