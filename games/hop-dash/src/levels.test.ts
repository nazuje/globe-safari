import { describe, expect, it } from 'vitest';
import { carefulPlayer, idlePlayer, keenPlayer, masherPlayer, playOut, routePlayer, skilledPlayer, steadyPlayer, type Result } from './bots.ts';
import { buildLevel } from './build.ts';
import type { Level } from './level.ts';
import { LEVELS } from './levels.ts';
import { press, release } from './run.ts';
import { DIFFICULTIES, DIFFICULTY_IDS, STEP, type DifficultyId } from './tuning.ts';

interface Case {
  id: string;
  difficulty: DifficultyId;
  level: Level;
}

const ALL: Case[] = LEVELS.flatMap((plan) =>
  DIFFICULTY_IDS.map((difficulty) => ({ id: `${plan.id} ${difficulty}`, difficulty, level: buildLevel(plan, DIFFICULTIES[difficulty]) })),
);
const EASY = ALL.filter((one) => one.difficulty === 'easy');

describe('every level, played by simulated children', () => {
  it.each(ALL)('$id can be run cleanly in 45 to 75 seconds for three stars', ({ level }) => {
    const result = playOut(level, routePlayer(level, false));
    expect(result.finished).toBe(true);
    expect(result.rescues).toBe(0);
    expect(result.tumbles).toBe(0);
    expect(result.stars).toBe(3);
    expect(result.flagSeconds).toBeGreaterThanOrEqual(45);
    expect(result.flagSeconds).toBeLessThanOrEqual(75);
  });

  it.each(ALL.filter(({ level }) => level.treasure))('$id has a reachable hidden treasure', ({ level }) => {
    const result = playOut(level, routePlayer(level, true));
    expect(result.foundTreasure).toBe(true);
    expect(result.rescues).toBe(0);
  });

  it.each(ALL.filter(({ level }) => level.treasure))('$id keeps its treasure hidden from anyone not looking', ({ level }) => {
    expect(playOut(level, routePlayer(level, false)).foundTreasure).toBe(false);
    expect(playOut(level, idlePlayer).foundTreasure).toBe(false);
  });

  it.each(ALL.filter(({ level }) => level.treasure))('$id gives its treasure to a child who taps at the sparkling ring', ({ level }) => {
    // Near enough, not exactly: a tap anywhere in the ring's neighbourhood has to work.
    for (const miss of [-30, 0, 30]) {
      const tapX = level.clues[0]!.tapX + miss;
      const result = playOut(level, (run) => {
        if (run.held) release(run);
        if (run.x >= tapX && run.x < tapX + run.speed * STEP * 1.5) press(run);
      });
      expect(result.foundTreasure).toBe(true);
    }
  });

  it.each(ALL)('$id is finished by a sensible six-year-old', ({ level }) => {
    const result = playOut(level, carefulPlayer);
    expect(result.finished).toBe(true);
    expect(result.rescues).toBeLessThanOrEqual(4);
    expect(result.flagSeconds).toBeLessThanOrEqual(85);
  });

  it.each(ALL)('$id reaches the flag with no taps at all', ({ level }) => {
    const result = playOut(level, idlePlayer);
    expect(result.finished).toBe(true);
    expect(result.flagSeconds).toBeLessThanOrEqual(95);
  });

  it.each(ALL)('$id survives mashing at any speed', ({ level }) => {
    for (const [seed, taps] of [[1, 2], [2, 6], [3, 14]] as const) {
      expect(playOut(level, masherPlayer(seed, taps)).finished).toBe(true);
    }
  });

  it.each(EASY)('$id clears every gap on Easy for a child who never taps', ({ level }) => {
    expect(playOut(level, idlePlayer).rescues).toBe(0);
  });

});

const SEEDS = [1, 2, 3, 4, 5, 6];

const mean = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const randomTapping = (level: Level): Result[] =>
  SEEDS.flatMap((seed) => [2, 3, 5].map((taps) => playOut(level, masherPlayer(seed, taps))));
const skilled = (level: Level): Result[] => SEEDS.map((seed) => playOut(level, skilledPlayer(level, seed)));

describe('the taps decide the stars', () => {
  it.each(ALL)('$id: hands off finishes with one star and a small score', ({ level }) => {
    const result = playOut(level, idlePlayer);
    expect(result.finished).toBe(true);
    expect(result.stars).toBe(1);
    expect(result.score).toBeLessThan(playOut(level, routePlayer(level, false)).score * 0.25);
  });

  it.each(ALL)('$id: skilled beats random tapping beats hands off', ({ level }) => {
    const idle = playOut(level, idlePlayer);
    const random = randomTapping(level);
    const good = skilled(level);
    const randomScore = mean(random.map((result) => result.score));
    expect(randomScore).toBeGreaterThan(idle.score * 1.8);
    expect(mean(good.map((result) => result.score))).toBeGreaterThan(randomScore * 1.15);
    expect(mean(random.map((result) => result.stars))).toBeGreaterThan(idle.stars);
    expect(mean(good.map((result) => result.stars))).toBeGreaterThan(mean(random.map((result) => result.stars)));
  });

  it.each(ALL)('$id: even loose tapping clearly beats hands off', ({ level }) => {
    const idle = playOut(level, idlePlayer);
    for (const seconds of [0.7, 1, 1.5]) {
      const steady = playOut(level, steadyPlayer(seconds));
      expect(steady.score).toBeGreaterThan(idle.score * 1.6);
      expect(steady.collected).toBeGreaterThan(idle.collected + 15);
    }
  });

  it.each(ALL)('$id: good play earns three stars, and a keen first go at least two', ({ level }) => {
    const threes = skilled(level).filter((result) => result.stars === 3).length;
    expect(threes).toBeGreaterThanOrEqual(SEEDS.length - 1);
    expect(playOut(level, keenPlayer).stars).toBeGreaterThanOrEqual(2);
  });

  it('keeps three stars rare for random tapping', () => {
    const results = ALL.flatMap(({ level }) => randomTapping(level));
    expect(results.filter((result) => result.stars === 3).length / results.length).toBeLessThan(0.15);
  });
});
