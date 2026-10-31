import { describe, expect, it } from 'vitest';
import { addSinge, addSkip, addWin, cleanProgress, emptyProgress, totalStars } from './save.ts';

describe('progress', () => {
  it('survives anything left in storage', () => {
    expect(cleanProgress('nope', 3)).toEqual(emptyProgress(3));
    const clean = cleanProgress({ stars: [9, 'x'], open: 99, singes: -4, secrets: [1, 1, 7, 'a'], best: [NaN, 3] }, 3);
    expect(clean).toEqual({ stars: [3, 0, 0], best: [0, 3, 0], open: 3, singes: 0, secrets: [1] });
  });

  it('keeps the best and opens the next level', () => {
    let saved = addWin(emptyProgress(3), { index: 0, stars: 3, seconds: 30, secret: false });
    saved = addWin(saved, { index: 0, stars: 1, seconds: 50, secret: true });
    expect(saved.stars[0]).toBe(3);
    expect(saved.best[0]).toBe(30);
    expect(saved.open).toBe(2);
    expect(saved.secrets).toEqual([0]);
    expect(totalStars(saved)).toBe(3);
  });

  it('never loses a finished level to a singe and opens the next on a skip', () => {
    const saved = addSinge(addSkip(addWin(emptyProgress(3), { index: 0, stars: 2, seconds: 30, secret: false }), 1));
    expect(saved).toMatchObject({ open: 3, singes: 1 });
    expect(saved.stars).toEqual([2, 0, 0]);
    expect(addSkip(saved, 2).open).toBe(3);
  });
});
