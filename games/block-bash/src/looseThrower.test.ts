import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels.ts';
import { playLoosely } from './looseThrower.ts';
import { BALLS_PER_TURN } from './scoring.ts';

const openLevels = LEVELS.filter((level) => !level.bonus).map((level) => [level.id, level] as const);

// A whole turn of real physics takes about two seconds of test time.
describe('a small child tapping loosely on Easy', { timeout: 30000 }, () => {
  it.each(openLevels)('%s gives a real crash, a star and a long enough turn', (_id, level) => {
    const { stars, fallen, seconds, waves, perBall } = playLoosely(level, 'easy', 3);
    expect(stars).toBeGreaterThanOrEqual(1);
    expect(fallen).toBeGreaterThanOrEqual(Math.min(level.blocks.length * 0.5, 14));
    expect(seconds).toBeGreaterThanOrEqual(28);
    expect(seconds).toBeLessThanOrEqual(90);
    expect(waves).toBeGreaterThanOrEqual(1);
    expect(perBall).toHaveLength(BALLS_PER_TURN);
  });

  it('every ball after the first still matters', () => {
    const tower = LEVELS[0];
    if (!tower) throw new Error('no levels');
    const turns = [1, 2, 3].map((seed) => playLoosely(tower, 'easy', seed, 'bowling'));
    for (const { perBall } of turns) {
      const [first = 0, ...later] = perBall;
      expect(later.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(first);
    }
    for (let ball = 1; ball < BALLS_PER_TURN; ball += 1) {
      const moved = turns.reduce((sum, { perBall }) => sum + (perBall[ball] ?? 0), 0);
      expect(moved, `ball ${ball + 1}`).toBeGreaterThan(0);
    }
  });
});
