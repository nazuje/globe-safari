import { describe, expect, it } from 'vitest';
import { starsFor } from './rating.ts';
import { cleanProgress, emptyProgress, record, type Outcome } from './save.ts';

const OUTCOME: Outcome = { levelId: 'meadow-1', difficulty: 'easy', stars: 2, score: 500, foundTreasure: false };

describe('starsFor', () => {
  const thresholds = [0.5, 0.8] as const;

  it('always gives a star for reaching the flag', () => {
    expect(starsFor(0, 100, thresholds)).toBe(1);
  });

  it('gives more for collecting more', () => {
    expect(starsFor(50, 100, thresholds)).toBe(2);
    expect(starsFor(80, 100, thresholds)).toBe(3);
  });
});

describe('record', () => {
  it('keeps the best of each', () => {
    const first = record(emptyProgress(), OUTCOME);
    const second = record(first.progress, { ...OUTCOME, stars: 3, score: 100 });
    expect(second.progress.best['meadow-1:easy']).toEqual({ stars: 3, score: 500 });
  });

  it('only calls it a new best when there was one to beat', () => {
    const first = record(emptyProgress(), OUTCOME);
    expect(first.newBest).toBe(false);
    expect(record(first.progress, { ...OUTCOME, score: 501 }).newBest).toBe(true);
    expect(record(first.progress, { ...OUTCOME, score: 500 }).newBest).toBe(false);
  });

  it('keeps settings apart', () => {
    const first = record(emptyProgress(), OUTCOME);
    const second = record(first.progress, { ...OUTCOME, difficulty: 'turbo', score: 9 });
    expect(Object.keys(second.progress.best)).toHaveLength(2);
    expect(second.newBest).toBe(false);
  });

  it('counts a treasure once', () => {
    const first = record(emptyProgress(), { ...OUTCOME, foundTreasure: true });
    const second = record(first.progress, { ...OUTCOME, foundTreasure: true });
    expect(first.firstTreasure).toBe(true);
    expect(second.firstTreasure).toBe(false);
    expect(second.progress.treasures).toEqual(['meadow-1']);
  });
});

describe('cleanProgress', () => {
  it('survives anything', () => {
    for (const junk of [null, 3, 'x', [], { best: 5 }, { treasures: 'no' }]) expect(cleanProgress(junk)).toEqual(emptyProgress());
  });

  it('keeps what is good and drops what is not', () => {
    const clean = cleanProgress({
      best: { a: { stars: 2, score: 10 }, b: { stars: 9, score: 10 }, c: { stars: 1, score: -1 } },
      treasures: ['a', 4],
    });
    expect(clean).toEqual({ best: { a: { stars: 2, score: 10 } }, treasures: ['a'] });
  });
});
