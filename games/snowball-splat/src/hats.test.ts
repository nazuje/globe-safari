import { describe, expect, it } from 'vitest';
import { cleanHats, GOLDEN_HAT, HAT_IDS, roundHats, type HatId } from './hats.ts';
import { cleanBests, cleanLevel, countRound, LEVELS, starsFor } from './tuning.ts';

const steady = (): number => 0.3;

describe('roundHats', () => {
  it('starts a new shelf with a couple of hats', () => {
    expect(roundHats([], steady)).toHaveLength(2);
  });

  it('brings at most two new hats a round, so the shelf takes a while', () => {
    const owned: HatId[] = ['topHat', 'bobble', 'party', 'bucket'];
    const fresh = roundHats(owned, steady).filter((hat) => !owned.includes(hat));
    expect(fresh).toHaveLength(2);
  });

  it('keeps the crown for golden snowmen', () => {
    for (let i = 0; i < 20; i++) expect(roundHats([], Math.random)).not.toContain(GOLDEN_HAT);
  });

  it('still has hats once the shelf is full', () => {
    expect(roundHats(HAT_IDS, steady).length).toBeGreaterThan(0);
  });
});

describe('saved data', () => {
  it('keeps only real hats, once each', () => {
    expect(cleanHats(['crown', 'crown', 'nope', 7])).toEqual(['crown']);
    expect(cleanHats('crown')).toEqual([]);
  });

  it('falls back to Easy', () => {
    expect(cleanLevel('hard')).toBe('hard');
    expect(cleanLevel(3)).toBe('easy');
  });

  it('cleans bests', () => {
    expect(cleanBests({ easy: 12.4, medium: 'x', hard: -2 })).toEqual({ easy: 12, medium: 0, hard: 0 });
    expect(cleanBests(null)).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});

describe('countRound', () => {
  it('counts the rounds before this one, so round two is still round number one', () => {
    expect(countRound(0)).toEqual({ before: 0, after: 1 });
    expect(countRound(1)).toEqual({ before: 1, after: 2 });
  });

  it('starts again from nonsense', () => {
    expect(countRound('lots').before).toBe(0);
    expect(countRound(-3).before).toBe(0);
  });
});

describe('starsFor', () => {
  it('counts the stars earned', () => {
    const [one, two, three] = LEVELS.easy.stars;
    expect(starsFor(one - 1, LEVELS.easy)).toBe(0);
    expect(starsFor(one, LEVELS.easy)).toBe(1);
    expect(starsFor(two, LEVELS.easy)).toBe(2);
    expect(starsFor(three, LEVELS.easy)).toBe(3);
  });
});
