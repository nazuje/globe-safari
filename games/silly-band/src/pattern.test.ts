import { describe, expect, it } from 'vitest';
import { LOOP_STEPS } from './music.ts';
import { Loop, loopPosition, takeProgress } from './pattern.ts';

const PLAYERS = ['frog', 'cat'];

describe('the loop', () => {
  it('is eight bars of sixteen steps', () => {
    expect(LOOP_STEPS).toBe(128);
  });

  it('wraps any step into the loop', () => {
    expect(loopPosition(0)).toBe(0);
    expect(loopPosition(130)).toBe(2);
    expect(loopPosition(-1)).toBe(127);
  });

  it('plays a note back on the same step of every pass', () => {
    const loop = new Loop();
    loop.add(133, 'cat', 4);
    expect(loop.at(5)).toEqual([{ pos: 5, player: 'cat', degree: 4 }]);
    expect(loop.at(5 + LOOP_STEPS * 7)).toHaveLength(1);
    expect(loop.at(6)).toEqual([]);
  });

  it('lets a player hold one note per step, so layers cannot pile up', () => {
    const loop = new Loop();
    loop.add(3, 'cat', 1);
    loop.add(3, 'cat', 2);
    loop.add(3, 'frog', 0);
    expect(loop.size).toBe(2);
    expect(loop.at(3).find((note) => note.player === 'cat')?.degree).toBe(2);
  });

  it('never grows past one note per player per step', () => {
    const loop = new Loop();
    for (let step = 0; step < LOOP_STEPS * 5; step++) for (const player of PLAYERS) loop.add(step, player, step);
    expect(loop.size).toBe(LOOP_STEPS * PLAYERS.length);
  });

  it('clears', () => {
    const loop = new Loop();
    loop.add(3, 'cat', 1);
    loop.clear();
    expect(loop.size).toBe(0);
  });

  it('saves and loads', () => {
    const loop = new Loop();
    loop.add(3, 'cat', 1);
    loop.add(90, 'frog', 3);
    expect(Loop.load(JSON.parse(JSON.stringify(loop.save())), PLAYERS).notes()).toEqual(loop.notes());
  });

  it('drops nonsense from storage', () => {
    expect(Loop.load('nope', PLAYERS).size).toBe(0);
    expect(Loop.load([[1, 'cat', 2], [1.5, 'cat', 2], [2, 'wolf', 2], [3, 'frog'], 'x'], PLAYERS).size).toBe(1);
  });
});

describe('a take', () => {
  it('fills from 0 to 1 and stops there', () => {
    expect(takeProgress(32, 32)).toBe(0);
    expect(takeProgress(32, 32 + 64)).toBe(0.5);
    expect(takeProgress(32, 400)).toBe(1);
    expect(takeProgress(32, 20)).toBe(0);
  });
});
