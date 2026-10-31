import { describe, expect, it } from 'vitest';
import { playCareless, playChild, playHandsOff, playSkilled } from './bots.ts';
import { distance, tileCentre, tileOf } from './grid.ts';
import { buildLevel, helpFor, namedMarks, withHelp, type Level, type LevelData } from './level.ts';
import { LEVELS } from './levels.ts';
import { newRun, runStars } from './run.ts';
import { LONGEST_REACH, SETTINGS, VIEW_RADIUS } from './tuning.ts';

const everyLevel = LEVELS.flatMap((data, index) => SETTINGS.map((setting) => ({ data, id: index + 1, setting, level: buildLevel(data, index + 1, setting) })));
const named = (name: string): boolean => /[a-z0-9]/.test(name);

function usedNames(data: LevelData): Set<string> {
  return new Set([
    ...(data.robots ?? []).flatMap(({ route }) => [...route]),
    ...(data.cameras ?? []).map(({ at }) => at),
    ...(data.sensors ?? []).map(({ plate }) => plate),
    ...(data.lasers ?? []).map(({ at }) => at),
    ...(data.guide ?? []).map((name) => name.replace('+', '')),
  ]);
}

describe('the levels', () => {
  it('has about twelve, growing bigger', () => {
    expect(LEVELS).toHaveLength(12);
    const size = ({ map }: LevelData): number => map.length * (map[0]?.length ?? 0);
    expect(size(LEVELS[11]!)).toBeGreaterThan(size(LEVELS[0]!) * 3);
  });

  it('adds ideas one at a time', () => {
    expect(LEVELS.slice(0, 5).map(({ idea }) => idea)).toEqual(['maze', 'robot', 'camera', 'sensor', 'laser']);
    expect(LEVELS[0]?.robots).toBeUndefined();
    expect(LEVELS[1]?.robots).toHaveLength(1);
    expect(LEVELS[2]?.robots).toBeUndefined();
    expect(LEVELS[3]?.cameras).toBeUndefined();
    expect(LEVELS[4]?.sensors).toBeUndefined();
  });

  it('has the rare surprises somewhere', () => {
    const marks = LEVELS.map(({ map }) => map.join(''));
    expect(marks.filter((map) => map.includes('H')).length).toBeGreaterThanOrEqual(3);
    expect(marks.filter((map) => map.includes('B')).length).toBeGreaterThanOrEqual(2);
    expect(marks.filter((map) => map.includes('D')).length).toBeGreaterThanOrEqual(2);
    expect(marks.filter((map) => map.includes('C')).length).toBeGreaterThanOrEqual(2);
  });

  it.each(LEVELS.map((data, index) => ({ data, id: index + 1 })))('level $id: lines are one width and every name is used', ({ data }) => {
    const widths = new Set(data.map.map((line) => line.length));
    expect(widths.size).toBe(1);
    const used = usedNames(data);
    expect(namedMarks(data.map).filter(named).filter((name) => !used.has(name))).toEqual([]);
  });

  it.each(everyLevel)('level $id on $setting: every floor tile can be reached', ({ level }) => {
    const { grid, exitSteps } = level;
    const lost = [...grid.cells.keys()].filter((tile) => grid.cells[tile] !== 1 && (exitSteps[tile] ?? -1) < 0);
    expect(lost).toEqual([]);
  });
});

describe('nothing can reach the player from off screen', () => {
  const hazardReach = (level: Level): number[] => [
    level.tuning.noticeRange,
    ...level.cameras.map(({ range }) => range),
    ...level.lasers.map(({ range }) => range),
  ];

  it.each(everyLevel)('level $id on $setting: all reach is shorter than the view', ({ level }) => {
    for (const reach of hazardReach(level)) expect(reach).toBeLessThanOrEqual(LONGEST_REACH);
    expect(LONGEST_REACH).toBeLessThan(VIEW_RADIUS);
  });

  it.each(everyLevel)('level $id on $setting: the start and each checkpoint are safe to stand on', ({ level }) => {
    expect(playHandsOff(newRun(level), 40).run.phase).toBe('play');
    for (const spot of level.checkpoints) {
      const run = newRun(level, { spot, elapsed: 0, noticed: false });
      expect(playHandsOff(run, 40).run.phase).toBe('play');
    }
  });

  it.each(everyLevel)('level $id on $setting: a sensor plate is off long enough to cross', ({ level }) => {
    for (const { tiles, period, on, warn } of level.sensors) {
      expect(period - on).toBeGreaterThan(tiles.length / 3 + 0.4);
      expect(warn).toBeGreaterThan(0.4);
    }
  });
});

describe('every level can be won with only what is on screen', () => {
  it.each(everyLevel)('level $id on $setting: the skilled bot gets out first try', ({ level }) => {
    const { run } = playSkilled(newRun(level));
    expect(run.cause).toBeNull();
    expect(run.phase).toBe('won');
    expect(runStars(run)).toBeGreaterThanOrEqual(2);
  });

  it.each(everyLevel.filter(({ level }) => level.checkpoints.length > 0))('level $id on $setting: it can also win from each checkpoint', ({ level }) => {
    for (const spot of level.checkpoints) {
      const { run } = playSkilled(newRun(level, { spot, elapsed: 0, noticed: false }));
      expect(run.phase).toBe('won');
    }
  });
});

describe('a child following the trail and the signs', () => {
  it.each(everyLevel.filter(({ setting }) => setting === 'easy'))('level $id: wins on Easy within 5 tries', ({ level }) => {
    const { firstWin } = playChild(level, 5);
    expect(firstWin).toBeGreaterThan(0);
  });

  // Measured against a bot playing the real game by touch and sight, which is the true judge.
  it.each(everyLevel.filter(({ setting }) => setting === 'easy'))('level $id: wins at least 4 games in 10, with help', ({ level }) => {
    expect(playChild(level, 10, 2).wins).toBeGreaterThanOrEqual(4);
  });

  it('level 2 is a lesson, so it almost always works out', () => {
    const level = buildLevel(LEVELS[1]!, 2, 'easy');
    for (const seed of [1, 2, 3, 4]) expect(playChild(level, 10, seed).wins).toBeGreaterThanOrEqual(8);
  });

  it.each(everyLevel)('level $id on $setting: every wait sign is safe to stand at', ({ level }) => {
    for (const { spot, sign } of level.stops) {
      if (sign) expect(playHandsOff(newRun(level, { spot, elapsed: 0, noticed: false }), 40).run.phase).toBe('play');
    }
  });
});

describe('help after repeated losses', () => {
  const level = buildLevel(LEVELS[9]!, 10, 'hard');

  it('starts after three losses and grows after five', () => {
    expect([0, 2, 3, 4, 5, 9].map(helpFor)).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('slows robots and narrows every cone', () => {
    const helped = withHelp(level, 1);
    expect(helped.tuning.patrol).toBeLessThan(level.tuning.patrol);
    expect(helped.tuning.chase).toBeLessThan(level.tuning.chase);
    expect(helped.tuning.noticeHalf).toBeLessThan(level.tuning.noticeHalf);
    expect(helped.cameras[0]!.half).toBeLessThan(level.cameras[0]!.half);
    expect(helped.checkpoints).toHaveLength(0);
  });

  it('adds checkpoints at the wait signs on any setting', () => {
    expect(withHelp(level, 2).checkpoints.length).toBeGreaterThan(0);
  });

  it('leaves the level alone with no help', () => {
    expect(withHelp(level, 0)).toBe(level);
  });

  it('caps a helped win at 1 star', () => {
    const run = newRun(withHelp(level, 1));
    expect(runStars({ ...run, phase: 'won' })).toBe(1);
    expect(runStars({ ...newRun(level), phase: 'won' })).toBe(3);
  });
});

describe('playing beats not playing', () => {
  it.each(everyLevel)('level $id on $setting: hands off never wins', ({ level }) => {
    const { run } = playHandsOff(newRun(level));
    expect(run.phase).not.toBe('won');
    expect(runStars(run)).toBe(0);
  });

  it.each(SETTINGS)('%s: a careless runner earns fewer stars overall than a skilled one', (setting) => {
    const levels = everyLevel.filter((entry) => entry.setting === setting);
    const stars = (play: typeof playSkilled): number => levels.reduce((sum, { level }) => sum + runStars(play(newRun(level)).run), 0);
    expect(stars(playCareless)).toBeLessThan(stars(playSkilled) / 2);
  });

  it('carelessness actually gets a player caught on most hazard levels', () => {
    const losses = everyLevel.filter(({ data, level }) => data.idea !== 'maze' && playCareless(newRun(level)).run.phase === 'lost');
    expect(losses.length).toBeGreaterThan(16);
  });
});

describe('the trail', () => {
  it.each(everyLevel)('level $id on $setting: leads from the start to the exit', ({ level }) => {
    expect(level.exitSteps[tileOf(level.grid, level.start)]).toBeGreaterThan(0);
    expect(distance(tileCentre(level.grid, level.exitTile), level.exit)).toBe(0);
  });
});
