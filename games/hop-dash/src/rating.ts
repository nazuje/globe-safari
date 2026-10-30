import type { Run } from './run.ts';

export type StarCount = 1 | 2 | 3;

/** Reaching the flag always earns a star. The other two come from how much was collected on the way. */
export function starsFor(collected: number, countable: number, thresholds: readonly [number, number]): StarCount {
  const share = countable === 0 ? 1 : collected / countable;
  if (share >= thresholds[1]) return 3;
  return share >= thresholds[0] ? 2 : 1;
}

export function runStars(run: Run): StarCount {
  return starsFor(run.collected, run.level.countable, run.level.tuning.stars);
}
