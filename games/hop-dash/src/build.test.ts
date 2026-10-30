import { describe, expect, it } from 'vitest';
import { buildLevel } from './build.ts';
import { spaced } from './flight.ts';
import { groundAt, safeSpot, type Level } from './level.ts';
import { LEVELS } from './levels.ts';
import { run as ground, gap, hill } from './pieces.ts';
import { testLevel } from './testLevel.ts';
import { DIFFICULTIES, DIFFICULTY_IDS } from './tuning.ts';
import { WORLD_IDS } from './worlds.ts';

const ALL: { id: string; level: Level }[] = LEVELS.flatMap((plan) =>
  DIFFICULTY_IDS.map((difficulty) => ({ id: `${plan.id} ${difficulty}`, level: buildLevel(plan, DIFFICULTIES[difficulty]) })),
);

describe('ground', () => {
  it('knows the height of a hill and that a gap has none', () => {
    const level = testLevel([ground(100), hill(80, 400), gap(120), ground(100)]);
    const hillStart = 520;
    expect(groundAt(level, hillStart + 200)).toBeCloseTo(80, 0);
    expect(groundAt(level, hillStart + 460)).toBeNull();
  });
});

describe('spaced', () => {
  it('lays points evenly along a path', () => {
    const line = Array.from({ length: 101 }, (_, i) => ({ x: i, y: 0 }));
    const points = spaced(line, 10, 0, 0);
    expect(points).toHaveLength(11);
    expect(Math.abs(points[5]!.x - 50)).toBeLessThanOrEqual(1);
  });
});

describe('the twelve levels', () => {
  it('has two levels in each of the six worlds', () => {
    expect(LEVELS).toHaveLength(12);
    for (const world of WORLD_IDS) expect(LEVELS.filter((plan) => plan.world === world)).toHaveLength(2);
  });

  it('ends each world, and only the end of a world, in the bouncy castle', () => {
    LEVELS.forEach((plan, index) => expect(plan.castle).toBe(index % 2 === 1));
  });

  it('hides some treasure and some rocket boots, but not everywhere', () => {
    const secrets = LEVELS.filter((plan) => plan.pieces.some((piece) => piece.kind === 'secret'));
    expect(secrets.length).toBeGreaterThanOrEqual(6);
    expect(secrets.length).toBeLessThan(LEVELS.length);
    for (const plan of LEVELS) expect(plan.treasure !== null).toBe(plan.pieces.some((piece) => piece.kind === 'secret'));
    expect(LEVELS.filter((plan) => plan.pieces.some((piece) => piece.kind === 'boots')).length).toBeGreaterThanOrEqual(4);
  });

  it('has fewer gaps on Easy', () => {
    for (const plan of LEVELS) {
      const easy = buildLevel(plan, DIFFICULTIES.easy).lands.length;
      expect(easy).toBeLessThan(buildLevel(plan, DIFFICULTIES.fast).lands.length);
    }
  });

  it.each(ALL)('$id is built soundly', ({ level }) => {
    // Levels start safely, and a child gets a moment before anything happens.
    expect(level.lands[0]!.to).toBeGreaterThan(400);
    expect(level.route[0]!.x).toBeGreaterThan(300);
    // Things are in running order, so drawing and collecting can stop early.
    level.items.forEach((item, i) => {
      if (i > 0) expect(item.x).toBeGreaterThanOrEqual(level.items[i - 1]!.x);
    });
    expect(level.countable).toBeGreaterThan(50);
    expect(groundAt(level, level.flagX)).not.toBeNull();
    expect(groundAt(level, level.endX)).not.toBeNull();
    for (const jelly of level.jellies) expect(groundAt(level, jelly.x)).toBeCloseTo(jelly.y, 0);
    for (const pad of level.pads) expect(groundAt(level, pad.x)).toBeCloseTo(pad.y, 0);
    for (const to of level.rocketTo) expect(groundAt(level, to)).not.toBeNull();
    for (let i = 1; i < level.lands.length; i++) expect(level.lands[i]!.from).toBeGreaterThan(level.lands[i - 1]!.to);
  });

  it.each(ALL)('$id keeps everything that counts out of reach of a runner on the ground', ({ level }) => {
    for (const item of level.items) {
      if (item.extra) continue;
      const ground = groundAt(level, item.x);
      if (ground !== null) expect(item.y - (ground + 23)).toBeGreaterThan(level.tuning.reach);
    }
  });

  it.each(ALL.filter(({ level }) => level.treasure))('$id shows the way to its treasure with a rising clue', ({ level }) => {
    expect(level.clues).toHaveLength(1);
    const clue = level.clues[0]!;
    const golden = level.pads.find((pad) => pad.golden)!;
    const cloud = level.platforms.find((platform) => platform.kind === 'cloud')!;
    expect(clue.path.length).toBeGreaterThan(8);
    expect(clue.path[0]!.x).toBeLessThan(golden.x + 80);
    expect(clue.path.at(-1)!.y).toBeGreaterThan(cloud.y - 8);
    expect(clue.tapY).toBeGreaterThan(golden.y + 100);
  });

  it.each(ALL)('$id always has somewhere safe to put a fallen runner', ({ level }) => {
    for (const land of level.lands.slice(0, -1)) {
      const spot = safeSpot(level, land.to + 5);
      expect(groundAt(level, spot)).not.toBeNull();
      expect(spot).toBeGreaterThan(land.to);
    }
  });
});
