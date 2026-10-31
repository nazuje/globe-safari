import type { Level } from './level.ts';
import type { Run } from './sim.ts';
import { TICKS_PER_SECOND } from './tuning.ts';

export type StarCount = 1 | 2 | 3;

const secretBits = (level: Level): number => level.gems.reduce((bits, gem, index) => (gem.secret ? bits | (1 << index) : bits), 0);

export const gemsWanted = (level: Level): number => level.gems.filter((gem) => !gem.secret).length;

export function gemsFound(level: Level, run: Run): number {
  let found = 0;
  level.gems.forEach((gem, index) => {
    if (!gem.secret && run.gems & (1 << index)) found += 1;
  });
  return found;
}

export const seconds = (run: Run): number => run.tick / TICKS_PER_SECOND;

export interface Stars {
  count: StarCount;
  fast: boolean;
  allGems: boolean;
}

/** One star for getting out, one for speed and one for every gem. A secret gem is a bonus on top. */
export function rate(level: Level, run: Run): Stars {
  const fast = seconds(run) <= level.par;
  const allGems = gemsFound(level, run) === gemsWanted(level) && ((run.gems & ~secretBits(level)) !== 0 || gemsWanted(level) === 0);
  return { count: (1 + (fast ? 1 : 0) + (allGems ? 1 : 0)) as StarCount, fast, allGems };
}
