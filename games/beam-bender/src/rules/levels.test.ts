import { describe, expect, it } from 'vitest';
import { boardFor, BONUS_LEVELS, LEVELS, levelById, MAIN_LEVELS, WORLDS, type Level } from './levels.ts';
import { startPlay, tapPiece } from './play.ts';
import { analyse, solve, Space, type Analysis } from './solver.ts';

const MOST_COLUMNS_ON_A_PHONE = 5;
const MOST_ROWS_ON_A_PHONE = 5;
const LAST_WORLD_BLIND_CHANCE = 1e-3;
const SLOW = 120_000;

const results = new Map<number, Analysis>();
const resultFor = (level: Level): Analysis => {
  const known = results.get(level.id);
  if (known) return known;
  const made = analyse(boardFor(level), level.limit);
  results.set(level.id, made);
  return made;
};
const average = (values: number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;
const inWorld = (world: string): Level[] => LEVELS.filter((level) => level.world === world);
const worldAverage = (world: string, pick: (result: Analysis) => number): number => average(inWorld(world).map((level) => pick(resultFor(level))));

describe('the level data', () => {
  it('has about 30 levels plus 3 bonus levels, numbered in order', () => {
    expect(MAIN_LEVELS).toHaveLength(30);
    expect(BONUS_LEVELS).toHaveLength(3);
    expect(LEVELS.map(({ id }) => id)).toEqual(LEVELS.map((_, index) => index + 1));
  });

  it('fits a phone', () => {
    for (const level of LEVELS) {
      const board = boardFor(level);
      expect(board.width).toBeLessThanOrEqual(MOST_COLUMNS_ON_A_PHONE);
      expect(board.height).toBeLessThanOrEqual(MOST_ROWS_ON_A_PHONE);
    }
  });

  it('adds one idea per world', () => {
    const uses = (world: string, check: (level: Level) => boolean): boolean => inWorld(world).every(check);
    expect(uses('blocks', (level) => boardFor(level).walls.length > 0)).toBe(true);
    expect(uses('splitters', (level) => boardFor(level).pieces.some(({ kind }) => kind === 'splitter'))).toBe(true);
    expect(uses('colors', (level) => boardFor(level).targets.some(({ color }) => color !== 'white'))).toBe(true);
    expect(uses('double', (level) => boardFor(level).pieces.some(({ kind }) => kind === 'double'))).toBe(true);
    expect(uses('switches', (level) => boardFor(level).blocks.length > 0)).toBe(true);
    expect(uses('portals', (level) => boardFor(level).portals.length > 0)).toBe(true);
    expect(uses('mix', (level) => boardFor(level).portals.length > 0)).toBe(true);
  });

  it('points hidden targets at bonus levels', () => {
    const openers = LEVELS.filter(({ unlocks }) => unlocks !== undefined);
    expect(openers.map(({ unlocks }) => unlocks)).toEqual(BONUS_LEVELS.map(({ id }) => id));
    for (const { unlocks, rows } of openers) {
      expect(levelById(unlocks as number)).toBeDefined();
      expect(rows.join(' ')).toContain('?');
    }
  });
});

describe('the solver proves every level', () => {
  it.each(LEVELS.map((level) => [level.id, level] as const))('level %i is winnable at par, within its limit', (_, level) => {
    const board = boardFor(level);
    const solution = solve(board);
    expect(solution?.moves).toBe(level.par);
    expect(level.par).toBeLessThanOrEqual(level.limit);
    let play = startPlay(board, level);
    expect(play.status).toBe('playing');
    expect(play.trace.lit).not.toBe((1 << board.targets.length) - 1);
    for (const tap of solution?.taps ?? []) play = tapPiece(play, tap);
    expect(play.status).toBe('won');
    expect(play.moves).toBe(level.par);
  }, SLOW);

  it('agrees with the real game on every state it steps through', () => {
    for (const level of LEVELS) {
      const board = boardFor(level);
      const space = new Space(board);
      let play = startPlay(board, level);
      let state = space.startState();
      // A fixed walk that tries every piece in turn, without ever being random.
      for (let step = 0; step < level.limit - 1 && play.status === 'playing'; step += 1) {
        const piece = (step * 3 + level.id) % board.pieces.length;
        play = tapPiece(play, piece);
        state = space.next(state, piece);
        expect(state).toBe(space.encode(play.frame));
        expect(space.won(state)).toBe(play.status === 'won');
      }
    }
  });

  it('can still find the way from the middle of a try', () => {
    const level = levelById(29) as Level;
    const board = boardFor(level);
    let play = startPlay(board, level);
    const taps = solve(board)?.taps ?? [];
    for (const tap of taps.slice(0, 5)) play = tapPiece(play, tap);
    expect(solve(board, play.frame, level.limit - play.moves)?.moves).toBe(level.par - 5);
  });

  it('gives up when there are too few moves left', () => {
    const level = levelById(30) as Level;
    expect(solve(boardFor(level), undefined, level.par - 1)).toBeNull();
  });

  it('can reach every hidden target and still win within the limit', () => {
    for (const level of LEVELS.filter(({ unlocks }) => unlocks !== undefined)) expect(resultFor(level).secretWithin).toBe(true);
  }, SLOW);
});

describe('the staircase', () => {
  it('starts with 1 or 2 moves', () => {
    expect(MAIN_LEVELS.slice(0, 3).map(({ par }) => par)).toEqual([1, 1, 2]);
  });

  it('ends with about 15 moves or more', () => {
    for (const level of inWorld('mix')) expect(level.par).toBeGreaterThanOrEqual(15);
  });

  it('needs more moves in every world than in the one before', () => {
    const moves = WORLDS.map((world) => worldAverage(world, ({ minMoves }) => minMoves));
    expect([...moves].sort((a, b) => a - b)).toEqual(moves);
    expect(new Set(moves).size).toBe(moves.length);
  }, SLOW);

  it('has more wrong first moves late on than early on', () => {
    const wrong = WORLDS.map((world) => worldAverage(world, ({ wrongFirst }) => wrongFirst));
    expect(average(wrong.slice(-3))).toBeGreaterThan(average(wrong.slice(0, 3)));
    expect(wrong.at(-1)).toBe(Math.max(...wrong));
    for (const level of inWorld('mix')) expect(resultFor(level).wrongFirst).toBeGreaterThanOrEqual(2);
  }, SLOW);

  it('rewards blind tapping early and never in the last world', () => {
    expect(average(inWorld('mirrors').map((level) => resultFor(level).blindChance))).toBeGreaterThan(0.3);
    for (const level of inWorld('mix')) expect(resultFor(level).blindChance).toBeLessThan(LAST_WORLD_BLIND_CHANCE);
  }, SLOW);

  it('leaves a chance of a disco on a few levels only', () => {
    const count = LEVELS.filter((level) => resultFor(level).discoPossible).length;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(LEVELS.length / 4);
  }, SLOW);
});
