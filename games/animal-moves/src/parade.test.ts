import { describe, expect, it } from 'vitest';
import { MOVES, type Energy } from './moves.ts';
import { danceMs, energyPlan, frozenMs, pickChoices, pickParade, shuffled, type Rng } from './parade.ts';

/** A small seeded random generator, so every run tests the same parades. */
function seeded(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

function longestRun(energies: Energy[]): number {
  let longest = 0;
  let run = 0;
  energies.forEach((energy, i) => {
    run = energy === energies[i - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  });
  return longest;
}

describe('energyPlan', () => {
  it.each([3, 6, 10])('mixes both kinds and ends calm for %i moves', (count) => {
    const plan = energyPlan(count);
    expect(plan).toHaveLength(count);
    expect(plan.at(-1)).toBe('calm');
    expect(new Set(plan).size).toBe(2);
    expect(longestRun(plan)).toBe(1);
  });
});

describe('pickParade', () => {
  it.each([3, 6, 10])('never repeats, mixes energy and ends calm with %i moves', (count) => {
    for (const seed of SEEDS) {
      const parade = pickParade(MOVES, count, seeded(seed));
      expect(parade).toHaveLength(count);
      expect(new Set(parade.map((move) => move.id)).size).toBe(count);
      expect(parade.at(-1)?.energy).toBe('calm');
      expect(longestRun(parade.map((move) => move.energy))).toBe(1);
    }
  });

  it('is repeatable from the same seed and different across seeds', () => {
    const ids = (seed: number) => pickParade(MOVES, 6, seeded(seed)).map((move) => move.id);
    expect(ids(5)).toEqual(ids(5));
    expect(ids(5)).not.toEqual(ids(6));
  });

  it('avoids the last parade when it can', () => {
    for (const seed of SEEDS) {
      const first = pickParade(MOVES, 10, seeded(seed)).map((move) => move.id);
      const second = pickParade(MOVES, 10, seeded(seed + 1000), first).map((move) => move.id);
      expect(second.filter((id) => first.includes(id))).toEqual([]);
    }
  });

  it('still ends calm when only recent moves are left', () => {
    const everything = MOVES.map((move) => move.id);
    expect(pickParade(MOVES, 6, seeded(1), everything).at(-1)?.energy).toBe('calm');
  });

  it('copes with fewer moves than asked for', () => {
    expect(pickParade(MOVES.slice(0, 2), 6, seeded(1))).toHaveLength(2);
  });
});

describe('pickChoices', () => {
  it('offers three different unused animals of the wanted energy', () => {
    for (const seed of SEEDS) {
      const rng = seeded(seed);
      const used = pickParade(MOVES, 9, rng).map((move) => move.id);
      const choices = pickChoices(MOVES, 'calm', used, rng);
      expect(choices).toHaveLength(3);
      expect(new Set(choices.map((move) => move.id)).size).toBe(3);
      expect(choices.every((move) => move.energy === 'calm' && !used.includes(move.id))).toBe(true);
    }
  });
});

describe('Freeze dance timing', () => {
  it('stays in range and varies', () => {
    const rng = seeded(9);
    const dances = SEEDS.map(() => danceMs(rng));
    const freezes = SEEDS.map(() => frozenMs(rng));
    expect(Math.min(...dances)).toBeGreaterThanOrEqual(4000);
    expect(Math.max(...dances)).toBeLessThanOrEqual(9000);
    expect(Math.min(...freezes)).toBeGreaterThanOrEqual(2500);
    expect(Math.max(...freezes)).toBeLessThanOrEqual(4500);
    expect(new Set(dances).size).toBeGreaterThan(50);
  });
});

describe('shuffled', () => {
  it('keeps every item and leaves the original alone', () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffled(items, seeded(2));
    expect([...result].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
