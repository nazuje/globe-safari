import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels.ts';
import { addTreasure, addWin, cleanProgress, nextLevel, totalStars } from './progress.ts';

describe('saved progress', () => {
  it('starts empty from nothing or from rubbish', () => {
    for (const saved of [null, 5, 'x', { stars: 7, treasures: 'no' }]) {
      const progress = cleanProgress(saved);
      expect(progress.stars.easy).toHaveLength(LEVELS.length);
      expect(progress.treasures).toEqual([]);
    }
  });

  it('keeps the best stars and never takes any away', () => {
    let progress = addWin(cleanProgress(null), 'easy', 3, 2);
    progress = addWin(progress, 'easy', 3, 1);
    expect(progress.stars.easy[2]).toBe(2);
    expect(progress.stars.hard[2]).toBe(0);
  });

  it('survives a trip through storage', () => {
    const progress = addTreasure(addWin(cleanProgress(null), 'hard', 12, 3), 7);
    expect(cleanProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });

  it('points at the first unfinished level', () => {
    let progress = cleanProgress(null);
    expect(nextLevel(progress, 'easy')).toBe(1);
    progress = addWin(progress, 'easy', 1, 1);
    expect(nextLevel(progress, 'easy')).toBe(2);
    expect(totalStars(progress, 'easy')).toBe(1);
  });

  it('counts a treasure only once', () => {
    expect(addTreasure(addTreasure(cleanProgress(null), 7), 7).treasures).toEqual([7]);
  });
});
