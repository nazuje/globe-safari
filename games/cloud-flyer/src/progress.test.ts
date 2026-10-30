import { describe, expect, it } from 'vitest';
import { addLanding, cleanProgress, trailFor } from './progress.ts';

describe('cleanProgress', () => {
  it('survives anything left in storage', () => {
    for (const saved of [null, 5, 'x', [], { stars: 'lots', best: 9, found: 'whale' }]) {
      expect(cleanProgress(saved)).toEqual(cleanProgress(undefined));
    }
    expect(cleanProgress({ stars: 4.7, found: ['whale', 'dragon'] })).toMatchObject({ stars: 4, found: ['whale'] });
  });
});

describe('addLanding', () => {
  const landing = { stars: 2, score: 300, levelId: 'easy' as const, surprises: [] };

  it('does not call the first flight a new best', () => {
    const first = addLanding(cleanProgress(null), landing);
    expect(first.newBest).toBe(false);
    expect(first.progress.best.easy).toBe(300);
    expect(addLanding(first.progress, { ...landing, score: 301 }).newBest).toBe(true);
    expect(addLanding(first.progress, { ...landing, score: 200 }).progress.best.easy).toBe(300);
  });

  it('keeps level bests apart', () => {
    const first = addLanding(cleanProgress(null), landing).progress;
    expect(addLanding(first, { ...landing, levelId: 'wild', score: 90 }).progress.best).toMatchObject({ easy: 300, wild: 90 });
  });

  it('remembers surprises, and tracks the wait for the next one', () => {
    const none = addLanding(cleanProgress(null), landing).progress;
    expect(none.flightsSinceSurprise).toBe(1);
    const found = addLanding(none, { ...landing, surprises: ['whale'] });
    expect(found.newFinds).toEqual(['whale']);
    expect(found.progress.flightsSinceSurprise).toBe(0);
    expect(addLanding(found.progress, { ...landing, surprises: ['whale'] }).newFinds).toEqual([]);
  });

  it('announces a new trail as stars add up', () => {
    expect(trailFor(0)).toBe(0);
    expect(trailFor(6)).toBe(1);
    const nearly = cleanProgress({ stars: 5 });
    expect(addLanding(nearly, landing).newTrail).toBe(true);
    expect(addLanding(cleanProgress({ stars: 1 }), landing).newTrail).toBe(false);
  });
});
