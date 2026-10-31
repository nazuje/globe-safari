import { describe, expect, it } from 'vitest';
import { addFound, addSkip, addWin, cleanProgress, emptyProgress, isOpen, nextLevel, totalStars } from './progress.ts';

describe('progress', () => {
  it('opens the first level and no others', () => {
    const progress = emptyProgress();
    expect(isOpen(progress, 1)).toBe(true);
    expect(isOpen(progress, 2)).toBe(false);
    expect(nextLevel(progress)).toBe(1);
  });

  it('opens the next level on a win or a skip', () => {
    expect(isOpen(addWin(emptyProgress(), 1, 1), 2)).toBe(true);
    const skipped = addSkip(emptyProgress(), 1);
    expect(isOpen(skipped, 2)).toBe(true);
    expect(nextLevel(skipped)).toBe(2);
  });

  it('keeps the best stars', () => {
    const progress = addWin(addWin(emptyProgress(), 1, 3), 1, 1);
    expect(progress.stars[1]).toBe(3);
    expect(totalStars(progress)).toBe(3);
  });

  it('opens a bonus level only once its hidden target is found', () => {
    expect(isOpen(emptyProgress(), 31)).toBe(false);
    expect(isOpen(addFound(emptyProgress(), 31), 31)).toBe(true);
  });

  it('points at nothing when everything is done', () => {
    let progress = emptyProgress();
    for (let id = 1; id <= 30; id += 1) progress = addWin(progress, id, 1);
    expect(nextLevel(progress)).toBeNull();
  });

  it('survives junk from storage', () => {
    expect(cleanProgress('junk')).toEqual(emptyProgress());
    expect(cleanProgress({ stars: { 1: 9, 2: 'x', 900: 2 }, skipped: [3, 'x', 99], found: [31, 1] })).toEqual({
      stars: { 1: 3 },
      skipped: [3],
      found: [31],
    });
  });
});
