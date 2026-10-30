import { describe, expect, it } from 'vitest';
import { matchup, type Racer } from './simulate.ts';

const ROUNDS = 20000;
const four: Racer = { level: 'little', tapsPerSecond: 3 };
const six: Racer = { level: 'big', tapsPerSecond: 5 };
const parent: Racer = { level: 'grownup', tapsPerSecond: 7 };

describe('close finishes at 3, 5 and 7 taps a second', () => {
  it.each([
    ['a 4-year-old against a 6-year-old', four, six],
    ['a 4-year-old against a parent', four, parent],
    ['a 6-year-old against a parent', six, parent],
  ])('%s is about even and close', (_, first, second) => {
    const result = matchup(first, second, ROUNDS, 11);
    expect(result.firstWins).toBeGreaterThan(0.43);
    expect(result.firstWins).toBeLessThan(0.57);
    expect(result.meanLoserFill).toBeGreaterThan(0.88);
    expect(result.closeFinishes).toBeGreaterThan(0.9);
  });

  it('keeps rounds short', () => {
    const { meanSeconds } = matchup(four, six, ROUNDS, 12);
    expect(meanSeconds).toBeGreaterThan(6);
    expect(meanSeconds).toBeLessThan(10);
  });

  it('is closer with the comeback than without it', () => {
    const helped = matchup(four, six, ROUNDS, 13, true);
    const plain = matchup(four, six, ROUNDS, 13, false);
    expect(helped.meanLoserFill).toBeGreaterThan(plain.meanLoserFill);
  });

  it('still rewards tapping faster at the same level', () => {
    const fast = { ...six, tapsPerSecond: 6 };
    const slow = { ...six, tapsPerSecond: 3.5 };
    expect(matchup(fast, slow, ROUNDS, 14).firstWins).toBeGreaterThan(0.8);
  });

  it('shows why the levels matter: on the same level the 6-year-old nearly always wins', () => {
    const sameLevel: Racer = { level: 'big', tapsPerSecond: 3 };
    expect(matchup(sameLevel, six, ROUNDS, 15).firstWins).toBeLessThan(0.1);
  });
});
