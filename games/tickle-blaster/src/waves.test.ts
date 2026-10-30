import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_IDS, SPEED_IDS, type PatternId } from './levels.ts';
import { LOWEST, pathPoint, planSurprises, planWaves, waveTime, WAVES, type Point } from './waves.ts';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLOWN: PatternId[] = ['swoop', 'zigzag', 'vee', 'curtain', 'ring', 'dive', 'figure8', 'spiral', 'zip'];
const SLOTS = [0, 0.13, 0.25, 0.5, 0.75, 0.9, 1];

function point(pattern: PatternId, p: number, slot: number, side: 1 | -1): Point {
  const out = { u: 0, v: 0 };
  pathPoint(pattern, p, slot, side, out);
  return out;
}

function offScreen({ u, v }: Point): boolean {
  return u < 0 || u > 1 || v < 0;
}

describe('patterns', () => {
  for (const pattern of FLOWN) {
    it(`${pattern} starts and ends out of sight`, () => {
      for (const slot of SLOTS) {
        expect(offScreen(point(pattern, 0, slot, 1))).toBe(true);
        expect(offScreen(point(pattern, 1, slot, 1))).toBe(true);
      }
    });

    it(`${pattern} moves smoothly with no jumps`, () => {
      for (const slot of SLOTS) {
        let last = point(pattern, 0, slot, 1);
        for (let p = 0.005; p <= 1; p += 0.005) {
          const next = point(pattern, p, slot, 1);
          expect(Math.hypot(next.u - last.u, next.v - last.v)).toBeLessThan(0.06);
          last = next;
        }
      }
    });

    it(`${pattern} never flies into the ship's space`, () => {
      for (const slot of SLOTS) {
        for (let p = 0; p <= 1; p += 0.01) expect(point(pattern, p, slot, 1).v).toBeLessThanOrEqual(LOWEST);
      }
    });

    it(`${pattern} mirrors`, () => {
      const left = point(pattern, 0.4, 0.3, 1);
      const right = point(pattern, 0.4, 0.3, -1);
      expect(left.u + right.u).toBeCloseTo(1);
      expect(left.v).toBeCloseTo(right.v);
    });

    it(`${pattern} really visits the screen`, () => {
      expect(offScreen(point(pattern, 0.5, 0.5, 1))).toBe(false);
    });
  }

  it('the sneeze flies out of the top or the sides and never reaches the ship', () => {
    for (const slot of SLOTS) {
      const end = point('sneeze', 1, slot, 1);
      expect(end.v < 0.3 || end.u < 0 || end.u > 1).toBe(true);
      for (let p = 0; p <= 1; p += 0.01) expect(point('sneeze', p, slot, 1).v).toBeLessThanOrEqual(LOWEST);
    }
  });
});

describe('wave plans', () => {
  it('sends something for every wave of every level, in time order', () => {
    for (const level of LEVEL_IDS) {
      for (const speed of SPEED_IDS) {
        const spawns = planWaves(level, speed, seeded(5));
        const times = spawns.map((spawn) => spawn.at);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        for (let wave = 0; wave < WAVES; wave++) {
          expect(spawns.some((spawn) => spawn.at >= waveTime(wave) && spawn.at < waveTime(wave) + 5)).toBe(true);
        }
      }
    }
  });

  it('has one pattern for each wave', () => {
    for (const level of LEVELS) expect(level.patterns).toHaveLength(WAVES);
  });

  it('gets busier and quicker toward the end', () => {
    for (const level of LEVEL_IDS) {
      const spawns = planWaves(level, 'fast', seeded(9));
      const inWave = (wave: number) => spawns.filter((spawn) => spawn.at >= waveTime(wave) && spawn.at < waveTime(wave + 1) - 0.01);
      expect(inWave(7).length).toBeGreaterThan(inWave(0).length);
      expect(inWave(7)[0].seconds).toBeLessThan(inWave(0)[0].seconds);
    }
  });

  it('makes Fast and Wild harder than Easy', () => {
    const size = (speed: (typeof SPEED_IDS)[number]) => planWaves('moon', speed, seeded(3)).length;
    expect(size('easy')).toBeLessThan(size('fast'));
    expect(size('fast')).toBeLessThan(size('wild'));
  });

  it('asks only one tickle of everyone on Easy', () => {
    for (const level of LEVEL_IDS) expect(planWaves(level, 'easy', seeded(2)).every((spawn) => spawn.tickles === 1)).toBe(true);
  });

  it('gives goo only to the silly ones', () => {
    for (const spawn of planWaves('ice', 'wild', seeded(4))) expect(spawn.goo.length > 0).toBe(spawn.kind === 'goober');
  });
});

describe('lanes', () => {
  it('starts down the middle, then sends waves to the sides and never crosses a parked ship', () => {
    for (const level of LEVEL_IDS) {
      const spawns = planWaves(level, 'fast', seeded(6));
      expect(spawns[0].center).toBe(0.5);
      const later = spawns.filter((spawn) => spawn.at >= waveTime(1) - 0.01);
      expect(later.every((spawn) => Math.abs(spawn.center - 0.5) > 0.2)).toBe(true);
      expect(new Set(later.map((spawn) => spawn.center > 0.5)).size).toBe(2);
      for (const spawn of later) {
        const out = { u: 0, v: 0 };
        for (let p = 0; p <= 1; p += 0.02) {
          pathPoint(spawn.pattern, p, spawn.slot, spawn.side, out, spawn.center, spawn.width);
          if (out.v > 0) expect(Math.abs(out.u - 0.5)).toBeGreaterThanOrEqual(0.139);
        }
      }
    }
  });
});

describe('surprises', () => {
  it('are rare, but not so rare that a child never sees one', () => {
    const rng = seeded(11);
    const plans = Array.from({ length: 2000 }, () => planSurprises(rng));
    const share = (test: (plan: (typeof plans)[number]) => boolean) => plans.filter(test).length / plans.length;
    expect(share((plan) => plan.golden !== null)).toBeGreaterThan(0.2);
    expect(share((plan) => plan.golden !== null)).toBeLessThan(0.4);
    expect(share((plan) => plan.cat !== null)).toBeGreaterThan(0.15);
    expect(share((plan) => plan.cat !== null)).toBeLessThan(0.35);
    expect(share((plan) => plan.sneeze)).toBeGreaterThan(0.3);
    expect(share((plan) => plan.sneeze)).toBeLessThan(0.5);
  });
});
