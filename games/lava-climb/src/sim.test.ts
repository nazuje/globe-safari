import { describe, expect, it } from 'vitest';
import { lavaAt, rockAt, moverAt } from './level.ts';
import { copyRun, newRun, step, type Input, type Run } from './sim.ts';
import { testLevel } from './testLevel.ts';
import { HERO_H, RULES, TICKS_PER_SECOND, TILE } from './tuning.ts';
import type { Level } from './level.ts';

const FLOOR = '##############';
const AIR = '..............';
const open = (rows: number): string[] => [...new Array<string>(rows).fill(AIR), FLOOR];

const hold = (input: Partial<Input>): Input => ({ dir: 0, jump: false, dash: false, ...input });

function play(level: Level, run: Run, input: Partial<Input>, ticks: number): void {
  for (let tick = 0; tick < ticks; tick += 1) step(level, run, hold(input));
}

function peakOf(level: Level, jumpTicks: number): number {
  const run = newRun(level);
  const start = run.y;
  let peak = run.y;
  for (let tick = 0; tick < 200; tick += 1) {
    step(level, run, hold({ jump: tick < jumpTicks }));
    peak = Math.min(peak, run.y);
  }
  return start - peak;
}

describe('jumping', () => {
  it('waits for the first press before the clock starts', () => {
    const level = testLevel(open(8), { lavaSpeed: 20 });
    const run = newRun(level);
    play(level, run, {}, 300);
    expect(run.tick).toBe(0);
    expect(run.phase).toBe('ready');
    play(level, run, { dir: 1 }, 10);
    expect(run.tick).toBe(10);
  });

  it('goes higher the longer jump is held', () => {
    const level = testLevel(open(10));
    const tap = peakOf(level, 3);
    const long = peakOf(level, 100);
    expect(long).toBeGreaterThan(tap * 2);
    expect(long).toBeGreaterThan(3 * TILE);
    expect(long).toBeLessThan(4 * TILE);
  });

  it('still jumps just after running off an edge', () => {
    const level = testLevel(['..............', '..............', '..............', '..............', '#####.........', '..............', '..............', '..............', FLOOR]);
    const start = newRun(level);
    start.x = 4 * TILE;
    start.y = 4 * TILE - HERO_H;
    const run = copyRun(start);
    while (run.ground) step(level, run, hold({ dir: 1 }));
    play(level, run, { dir: 1 }, RULES.coyote - 3);
    expect(run.ground).toBe(false);
    step(level, run, hold({ dir: 1, jump: true }));
    expect(run.vy).toBeLessThan(-300);
    const late = copyRun(start);
    while (late.ground) step(level, late, hold({ dir: 1 }));
    play(level, late, { dir: 1 }, RULES.coyote + 3);
    step(level, late, hold({ dir: 1, jump: true }));
    expect(late.vy).toBeGreaterThan(0);
  });

  it('remembers a jump pressed just before landing', () => {
    const level = testLevel(open(8));
    const run = newRun(level);
    play(level, run, { jump: true }, 40);
    play(level, run, {}, 1);
    while (run.y + HERO_H + run.vy / TICKS_PER_SECOND * (RULES.buffer - 4) < level.start.y + HERO_H) step(level, run, hold({}));
    step(level, run, hold({ jump: true }));
    let jumped = false;
    for (let tick = 0; tick < RULES.buffer; tick += 1) {
      step(level, run, hold({ jump: true }));
      if (run.ground === false && run.vy < -300) jumped = true;
    }
    expect(jumped).toBe(true);
  });

  it('passes up through a ledge and stands on it', () => {
    const level = testLevel(['..............', '..............', '..............', '==============', '..............', '..............', FLOOR]);
    const run = newRun(level);
    play(level, run, { jump: true }, 70);
    play(level, run, {}, 60);
    expect(run.ground).toBe(true);
    expect(run.y + HERO_H).toBeCloseTo(3 * TILE, 3);
  });
});

describe('walls', () => {
  const shaft = ['W............W', 'W............W', 'W............W', 'W............W', 'W............W', 'W............W', 'W............W', 'W............W', 'W............W', FLOOR];

  function onWall(level: Level): Run {
    const run = newRun(level);
    run.x = TILE + 2;
    run.y = 5 * TILE;
    run.ground = false;
    return run;
  }

  it('kicks off rough rock only when the level allows it', () => {
    const on = testLevel(shaft, { walls: true });
    const run = onWall(on);
    play(on, run, { dir: -1 }, 4);
    step(on, run, hold({ dir: -1, jump: true }));
    expect(run.vx).toBeGreaterThan(100);
    expect(run.vy).toBeLessThan(-300);
    const off = testLevel(shaft);
    const plain = onWall(off);
    play(off, plain, { dir: -1 }, 4);
    step(off, plain, hold({ dir: -1, jump: true }));
    expect(plain.vy).toBeGreaterThan(-100);
  });

  it('slides slowly while pressing into the wall', () => {
    const level = testLevel(shaft, { walls: true });
    const run = onWall(level);
    play(level, run, { dir: -1 }, 50);
    expect(run.vy).toBeLessThanOrEqual(RULES.wallSlide);
  });

  it('will not let a single wall be climbed like a ladder', () => {
    const level = testLevel(shaft, { walls: true });
    const run = onWall(level);
    play(level, run, { dir: -1 }, 4);
    step(level, run, hold({ dir: -1, jump: true }));
    play(level, run, { dir: -1 }, 26);
    step(level, run, hold({ dir: -1 }));
    const speedBefore = run.vy;
    step(level, run, hold({ dir: -1, jump: true }));
    expect(run.vy).toBeGreaterThanOrEqual(speedBefore);
  });
});

describe('dash', () => {
  it('shoots sideways in the air and only once before landing', () => {
    const level = testLevel(open(10), { dash: true });
    const run = newRun(level);
    play(level, run, { jump: true }, 20);
    const from = run.x;
    const heightBefore = run.y;
    step(level, run, hold({ dir: 1, jump: true, dash: true }));
    play(level, run, { dir: 1, jump: true, dash: true }, RULES.dashTicks - 2);
    expect(run.x - from).toBeGreaterThan(40);
    expect(run.y).toBeCloseTo(heightBefore, 0);
    play(level, run, { dir: 1, jump: true }, 2);
    expect(run.dashReady).toBe(false);
    step(level, run, hold({ dir: 1, jump: true, dash: true }));
    expect(run.dashLeft).toBe(0);
  });

  it('does nothing on the ground', () => {
    const level = testLevel(open(5), { dash: true });
    const run = newRun(level);
    play(level, run, { dash: true }, 5);
    expect(run.dashLeft).toBe(0);
    expect(run.dashReady).toBe(true);
  });
});

describe('surfaces', () => {
  it('slides on ice long after a stop on rock', () => {
    const slideOf = (row: string): number => {
      const level = testLevel(['..............', '..............', row]);
      const run = newRun(level);
      run.x = TILE * 1.5;
      run.y = 2 * TILE - HERO_H;
      play(level, run, { dir: 1 }, 60);
      const from = run.x;
      play(level, run, {}, 60);
      return run.x - from;
    };
    expect(slideOf('%%%%%%%%%%%%%%')).toBeGreaterThan(slideOf('==============') * 3);
  });

  it('carries the hero along a belt', () => {
    const level = testLevel(['..............', '..............', '>>>>>>>>>>>>>>']);
    const run = newRun(level);
    run.x = TILE * 2;
    run.y = 2 * TILE - HERO_H;
    run.phase = 'climbing';
    const from = run.x;
    play(level, run, {}, 60);
    expect(run.x - from).toBeGreaterThan(20);
  });

  it('lets a crumbling ledge hold, fall and come back', () => {
    const level = testLevel(['..............', '..............', '~~~~~~~~~~~~~~', AIR, AIR, FLOOR]);
    const run = newRun(level);
    run.y = 2 * TILE - HERO_H;
    run.phase = 'climbing';
    play(level, run, {}, RULES.crumbleHold - 5);
    expect(run.ground).toBe(true);
    play(level, run, {}, 20);
    expect(run.ground).toBe(false);
    play(level, run, {}, RULES.crumbleBack);
    expect(run.crumbled.every((tick) => tick >= 0)).toBe(true);
  });

  it('throws the hero high off a pad', () => {
    const level = testLevel(['..............', '..............', '..............', 'BBBBBBBBBBBBBB', FLOOR]);
    const run = newRun(level);
    run.y = 3 * TILE - HERO_H - 4;
    run.phase = 'climbing';
    run.ground = false;
    let fastest = 0;
    for (let tick = 0; tick < 30; tick += 1) {
      step(level, run, hold({}));
      fastest = Math.min(fastest, run.vy);
    }
    expect(fastest).toBeLessThan(-RULES.jump);
  });

  it('carries a rider on a moving platform', () => {
    const level = testLevel(['..............', '..............', '.....mmm......', AIR, FLOOR], { moves: [{ dx: 3, dy: 0, period: 4, phase: 0 }] });
    const run = newRun(level);
    run.x = 6.5 * TILE;
    run.y = 2 * TILE - HERO_H - 1;
    run.ground = false;
    run.phase = 'climbing';
    play(level, run, {}, 120);
    expect(run.mover).toBe(0);
    const mover = moverAt(level.movers[0]!, run.tick);
    expect(run.y + HERO_H).toBeCloseTo(mover.y, 3);
    expect(run.x).toBeGreaterThan(7 * TILE);
  });
});

describe('losing and winning', () => {
  it('rises at a steady pace and singes on contact', () => {
    const level = testLevel(open(3), { lavaSpeed: 30 });
    expect(lavaAt(level, 120) - lavaAt(level, 240)).toBeCloseTo(30, 6);
    const run = newRun(level);
    let tick = 0;
    while (run.phase !== 'singed' && tick < 1200) {
      step(level, run, hold({ dir: tick % 2 ? 1 : -1 }));
      tick += 1;
    }
    expect(run.phase).toBe('singed');
    expect(run.cause).toBe('lava');
  });

  it('singes on spikes but forgives a near miss', () => {
    const map = (row: string): Level => testLevel(['..............', row, FLOOR]);
    const run = newRun(map('.....^........'));
    const level = map('.....^........');
    play(level, run, { dir: 1 }, 120);
    expect(run.cause).toBe('spike');
    const close = newRun(level);
    close.x = 6 * TILE - 13 + RULES.spikeInset;
    close.phase = 'climbing';
    close.y = 2 * TILE - HERO_H;
    step(level, close, hold({}));
    expect(close.phase).toBe('climbing');
  });

  it('warns before a rock falls, and the rock singes', () => {
    const level = testLevel(['#####r########', AIR, AIR, AIR, AIR, AIR, FLOOR], { drops: [{ period: 3, phase: 0 }] });
    const dropper = level.droppers[0]!;
    expect(rockAt(dropper, 60).warning).toBeGreaterThan(0);
    expect(rockAt(dropper, 60).falling).toBe(false);
    expect(rockAt(dropper, 110).falling).toBe(true);
    const run = newRun(level);
    run.x = dropper.x;
    run.phase = 'climbing';
    play(level, run, {}, 300);
    expect(run.cause).toBe('rock');
  });

  it('collects gems and wins at the door', () => {
    const level = testLevel(['..............', '..............', '......E.......', FLOOR]);
    const run = newRun(level);
    run.x = 3 * TILE;
    play(level, run, { dir: 1 }, 120);
    expect(run.phase).toBe('won');
    const gemmy = testLevel(['.....*........', '..............', FLOOR]);
    const taker = newRun(gemmy);
    taker.x = 6 * TILE;
    play(gemmy, taker, { jump: true }, 30);
    expect(taker.gems).toBe(1);
  });
});

describe('fairness of time', () => {
  it('plays the same on any screen, because it only ever moves in whole ticks', () => {
    const level = testLevel(open(8), { lavaSpeed: 5 });
    const script = (tick: number): Input => hold({ dir: tick % 90 < 45 ? 1 : -1, jump: tick % 70 < 30 });
    const playFrames = (frameTicks: number): Run => {
      const run = newRun(level);
      let tick = 0;
      while (tick < 480) {
        const input = script(tick - (tick % 12));
        for (let at = 0; at < frameTicks && tick < 480; at += 1, tick += 1) step(level, run, input);
      }
      return run;
    };
    const a = playFrames(1);
    const b = playFrames(2);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });
});
