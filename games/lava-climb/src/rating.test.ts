import { describe, expect, it } from 'vitest';
import { rate } from './rating.ts';
import { newRun } from './sim.ts';
import { testLevel } from './testLevel.ts';

const level = testLevel(['..*..*..$.....', '..............', '##############']);

describe('stars', () => {
  it('gives one for finishing, one for speed and one for all the gems', () => {
    const run = newRun(level);
    run.tick = 3600 + 120;
    expect(rate(level, run).count).toBe(1);
    run.tick = 1200;
    expect(rate(level, run).count).toBe(2);
    run.gems = 0b011;
    expect(rate(level, run).count).toBe(3);
  });

  it('never needs the secret gem', () => {
    const run = newRun(level);
    run.tick = 7200;
    run.gems = 0b100;
    expect(rate(level, run)).toMatchObject({ count: 1, allGems: false });
  });
});
