import { describe, expect, it } from 'vitest';
import {
  bonusUnlocked,
  cleanBest,
  CRASHES_FOR_BONUS,
  ballSize,
  BALLS_PER_TURN,
  hasFallen,
  isDown,
  isBigCrash,
  recordBest,
  starGoals,
  starsFor,
  tableHalf,
  throwPower,
} from './scoring.ts';

describe('stars', () => {
  it('gives more stars for more fallen blocks and never fewer', () => {
    let last = 0;
    for (let fallen = 0; fallen <= 60; fallen += 1) {
      const stars = starsFor(fallen, 30, 'easy');
      expect(stars).toBeGreaterThanOrEqual(last);
      last = stars;
    }
    expect(starsFor(0, 30, 'easy')).toBe(0);
    expect(starsFor(60, 30, 'easy')).toBe(3);
  });

  it('asks for more on Tricky', () => {
    const easy = starGoals(40, 'easy');
    const tricky = starGoals(40, 'tricky');
    easy.forEach((goal, index) => expect(tricky[index]).toBeGreaterThan(goal));
  });

  it('is kinder to sturdy levels', () => {
    expect(starGoals(30, 'easy', true)[2]).toBeLessThan(starGoals(30, 'easy')[2]);
  });

  it('has three different goals on every level size', () => {
    for (const total of [12, 20, 60]) expect(new Set(starGoals(total, 'easy', true)).size).toBe(3);
  });
});

describe('the table', () => {
  it('leaves more room on Tricky, so blocks are harder to knock off', () => {
    expect(tableHalf(5, 'tricky')).toBeGreaterThan(tableHalf(5, 'easy'));
  });

  it('is never tiny', () => {
    expect(tableHalf(0.5, 'easy')).toBeGreaterThanOrEqual(3);
  });
});

describe('falling', () => {
  it('counts a block that has dropped below the tabletop', () => {
    expect(hasFallen(0.5)).toBe(false);
    expect(hasFallen(-1)).toBe(true);
  });
});

describe('what counts as down', () => {
  const still = { moved: 0.05, tipped: 0.02, height: 2 };

  it('leaves a block that barely shifted standing', () => {
    expect(isDown(still)).toBe(false);
  });

  it('counts a block off the table, toppled or shoved aside', () => {
    expect(isDown({ ...still, height: -2 })).toBe(true);
    expect(isDown({ ...still, tipped: 0.9 })).toBe(true);
    expect(isDown({ ...still, moved: 1.5 })).toBe(true);
  });
});

describe('throws', () => {
  it('gets stronger through a turn', () => {
    expect(throwPower(1)).toBeGreaterThan(throwPower(0));
    expect(throwPower(2)).toBeGreaterThan(throwPower(1));
    expect(throwPower(5)).toBeGreaterThan(throwPower(4));
    expect(throwPower(9)).toBe(throwPower(5));
  });

  it('saves the big ball for last', () => {
    expect(ballSize(0)).toBe(1);
    expect(ballSize(BALLS_PER_TURN - 1)).toBeGreaterThan(1);
  });

  it('calls a crash big only when a real share falls', () => {
    expect(isBigCrash(20, 40)).toBe(true);
    expect(isBigCrash(9, 40)).toBe(false);
    expect(isBigCrash(5, 10)).toBe(false);
  });

  it('opens the secret level after enough crashes', () => {
    expect(bonusUnlocked(CRASHES_FOR_BONUS - 1)).toBe(false);
    expect(bonusUnlocked(CRASHES_FOR_BONUS)).toBe(true);
  });
});

describe('personal bests', () => {
  it('keeps the better result', () => {
    const first = recordBest({}, 'tower:easy', 1, 5);
    expect(first.isNew).toBe(true);
    const worse = recordBest(first.best, 'tower:easy', 0, 2);
    expect(worse.isNew).toBe(false);
    expect(worse.best['tower:easy']).toEqual({ stars: 1, fallen: 5 });
    expect(recordBest(worse.best, 'tower:easy', 3, 9).best['tower:easy']).toEqual({ stars: 3, fallen: 9 });
  });

  it('stays quiet about a score of nothing', () => {
    const result = recordBest({}, 'tower:easy', 0, 0);
    expect(result.isNew).toBe(false);
    expect(result.best).toEqual({});
  });

  it('survives bad saved data', () => {
    expect(cleanBest('nonsense')).toEqual({});
    expect(cleanBest({ a: { stars: 9, fallen: -2 } })).toEqual({ a: { stars: 3, fallen: 0 } });
  });
});
