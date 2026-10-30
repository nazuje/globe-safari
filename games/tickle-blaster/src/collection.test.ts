import { describe, expect, it } from 'vitest';
import { bestOnLevel, cleanSaved, emptySaved, friendsMet, meetFriend, recordRun } from './collection.ts';
import { FRIENDS, LOOKS } from './kinds.ts';
import { LEVELS } from './levels.ts';

describe('the saved collection', () => {
  it('has a look for everyone and every planet friend in the book', () => {
    for (const friend of FRIENDS) expect(LOOKS[friend]).toBeDefined();
    expect(new Set(FRIENDS).size).toBe(Object.keys(LOOKS).length);
    for (const level of LEVELS) {
      expect(FRIENDS).toContain(level.boss);
      for (const kind of level.kinds) expect(FRIENDS).toContain(kind);
    }
  });

  it('counts a friend, and knows the first time', () => {
    const first = meetFriend(emptySaved(), 'puff');
    expect(first.isNew).toBe(true);
    const second = meetFriend(first.saved, 'puff');
    expect(second.isNew).toBe(false);
    expect(second.saved.met.puff).toBe(2);
    expect(friendsMet(second.saved)).toBe(1);
  });

  it('keeps the best score per level and speed and the most stars per level', () => {
    let saved = recordRun(emptySaved(), { levelId: 'moon', speedId: 'easy', score: 500, stars: 3 }).saved;
    saved = recordRun(saved, { levelId: 'moon', speedId: 'easy', score: 300, stars: 1 }).saved;
    saved = recordRun(saved, { levelId: 'moon', speedId: 'wild', score: 900, stars: 2 }).saved;
    expect(saved.best['moon:easy']).toBe(500);
    expect(saved.stars.moon).toBe(3);
    expect(bestOnLevel(saved, 'moon')).toBe(900);
    expect(bestOnLevel(saved, 'ice')).toBe(0);
  });

  it('only calls it a new record when there was one to beat', () => {
    const first = recordRun(emptySaved(), { levelId: 'moon', speedId: 'easy', score: 500, stars: 2 });
    expect(first.newBest).toBe(false);
    expect(recordRun(first.saved, { levelId: 'moon', speedId: 'easy', score: 400, stars: 2 }).newBest).toBe(false);
    expect(recordRun(first.saved, { levelId: 'moon', speedId: 'easy', score: 600, stars: 2 }).newBest).toBe(true);
  });

  it('survives whatever a device has saved', () => {
    for (const junk of [null, 3, 'x', [], { best: 4, stars: null, met: 'a' }]) expect(cleanSaved(junk)).toEqual(emptySaved());
    const clean = cleanSaved({
      best: { 'moon:easy': 12.7, 'moon:nope': 5, 'mars:easy': 9, 'ice:wild': -2 },
      stars: { moon: 9, ring: 'x' },
      met: { puff: 2, alsoNobody: 4 },
    });
    expect(clean).toEqual({ best: { 'moon:easy': 12 }, stars: { moon: 3 }, met: { puff: 2 } });
  });
});
