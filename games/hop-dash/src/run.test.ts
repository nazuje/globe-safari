import { describe, expect, it } from 'vitest';
import { idlePlayer, playOut, routePlayer } from './bots.ts';
import { gap, jellies, mushroom, run as ground } from './pieces.ts';
import { advance, createRun, isOnGround, press, release, step, type Run } from './run.ts';
import { testLevel } from './testLevel.ts';
import { DIFFICULTIES, STEP } from './tuning.ts';

function stepFor(run: Run, seconds: number): void {
  for (let i = 0; i < seconds / STEP; i++) step(run);
}

function stepUntil(run: Run, done: (run: Run) => boolean): void {
  for (let i = 0; i < 12000 && !done(run); i++) step(run);
  expect(done(run)).toBe(true);
}

function peakOfJump(run: Run, hold: number): number {
  const start = run.y;
  press(run);
  let peak = start;
  for (let i = 0; i < 200; i++) {
    if (i * STEP >= hold) release(run);
    step(run);
    peak = Math.max(peak, run.y);
    if (i > 10 && isOnGround(run)) break;
  }
  return peak - start;
}

const runningStart = (pieces = [ground(2000)]): Run => {
  const run = createRun(testLevel(pieces));
  stepFor(run, 0.6);
  return run;
};

describe('the jump', () => {
  it('jumps from a tap and comes down again', () => {
    const run = runningStart();
    press(run);
    release(run);
    step(run);
    expect(run.on).toBe(-1);
    stepUntil(run, isOnGround);
    expect(run.jumps).toBe(0);
  });

  it('jumps higher the longer the finger is held, with a short tap still a proper hop', () => {
    const quick = peakOfJump(runningStart(), 0);
    const held = peakOfJump(runningStart(), 0.4);
    expect(quick).toBeGreaterThan(85);
    expect(held).toBeGreaterThan(quick + 30);
  });

  it('allows a second jump in the air, with a spin, and no third', () => {
    const run = runningStart();
    press(run);
    stepFor(run, 0.2);
    press(run);
    step(run);
    expect(run.jumps).toBe(2);
    expect(run.spin).toBeGreaterThan(0);
    const speed = run.vy;
    stepFor(run, 0.1);
    press(run);
    step(run);
    expect(run.vy).toBeLessThan(speed);
    expect(run.jumps).toBe(2);
  });

  it('still jumps just after running off an edge', () => {
    const run = createRun(testLevel([ground(300), gap(160)]));
    const edge = run.level.lands[0]!.to;
    stepUntil(run, (r) => r.x > edge);
    stepFor(run, DIFFICULTIES.fast.coyote / 2);
    expect(run.on).toBe(-1);
    press(run);
    step(run);
    expect(run.jumps).toBe(1);
  });

  it('treats a late tap after the edge as the double jump', () => {
    const run = createRun(testLevel([ground(300), gap(160)]));
    const edge = run.level.lands[0]!.to;
    stepUntil(run, (r) => r.x > edge);
    stepFor(run, DIFFICULTIES.fast.coyote + 0.05);
    press(run);
    step(run);
    expect(run.jumps).toBe(2);
  });

  it('remembers a tap just before landing', () => {
    const run = runningStart();
    press(run);
    release(run);
    stepUntil(run, (r) => r.vy < -300 && r.y - (r.level.lands[0]?.hs[0] ?? 0) < 28);
    press(run);
    release(run);
    // That tap is the double jump: use it up first so the next tap has to wait for the ground.
    step(run);
    stepUntil(run, (r) => r.vy < -300 && r.y < 28);
    press(run);
    release(run);
    stepUntil(run, (r) => r.jumps === 1);
    expect(run.vy).toBeGreaterThan(0);
  });
});

describe('fixed time step', () => {
  function playAt(framesPerSecond: number): { x: number; y: number; score: number } {
    const run = createRun(testLevel([ground(500, 'stars'), gap(100), ground(500, 'stars')]));
    const tapEvery = Math.round(framesPerSecond * 1.5);
    for (let frame = 1; frame <= framesPerSecond * 8; frame++) {
      advance(run, 1 / framesPerSecond);
      // Taps land at the same moments whatever the frame rate.
      if (frame % tapEvery === 0) {
        press(run);
        release(run);
      }
    }
    return { x: run.x, y: run.y, score: run.score };
  }

  it('plays the same at 30, 60 and 144 frames a second', () => {
    const at60 = playAt(60);
    for (const other of [playAt(30), playAt(144)]) {
      expect(other.score).toBe(at60.score);
      expect(Math.abs(other.x - at60.x)).toBeLessThan(3);
      expect(Math.abs(other.y - at60.y)).toBeLessThan(3);
    }
  });

  it('ignores how the time is cut up', () => {
    const one = createRun(testLevel([ground(800)]));
    const two = createRun(testLevel([ground(800)]));
    advance(one, 2);
    for (let i = 0; i < 200; i++) advance(two, 0.01);
    expect(Math.abs(one.x - two.x)).toBeLessThan(1);
  });
});

describe('falling', () => {
  it('never ends the run: a helper carries the runner past the gap and sets them down', () => {
    const level = testLevel([ground(200), gap(170)]);
    const run = createRun(level);
    stepUntil(run, (r) => r.scoop !== null);
    expect(run.rescues).toBe(1);
    const scoop = run.scoop!;
    expect(scoop.toX).toBeGreaterThan(level.lands[1]!.from);
    stepUntil(run, (r) => r.scoop === null);
    stepUntil(run, isOnGround);
    expect(run.x).toBeGreaterThan(level.lands[1]!.from);
  });

  it('takes turns between the stork and the cloud', () => {
    const run = createRun(testLevel([ground(200), gap(170), ground(300), gap(170)]));
    const helpers: string[] = [];
    while (!run.finished) {
      step(run);
      if (run.scoop && helpers.at(-1) !== run.scoop.helper) helpers.push(run.scoop.helper);
    }
    expect(helpers).toEqual(['stork', 'cloud']);
  });

  it('lands a clipped ledge rather than dropping the child in', () => {
    const level = testLevel([ground(200), gap(120)]);
    const run = createRun(level);
    const far = level.lands[1]!.from;
    stepUntil(run, (r) => r.x > 250);
    run.x = far - 1;
    run.y = -12;
    run.vy = -40;
    run.on = -1;
    stepFor(run, 0.05);
    expect(run.on).toBe(-2);
    expect(run.y).toBeCloseTo(0, 0);
  });
});

describe('creatures and springs', () => {
  it('bounces off a jelly from above with a score and no tumble', () => {
    const level = testLevel([ground(200), jellies(1)]);
    const result = playOut(level, routePlayer(level, false));
    expect(result.jellyBounces).toBe(1);
    expect(result.tumbles).toBe(0);
    expect(result.rescues).toBe(0);
  });

  it('tumbles from the side, loses a moment of speed and carries on', () => {
    const level = testLevel([ground(200), jellies(1)]);
    const run = createRun(level);
    stepUntil(run, (r) => r.tumble > 0);
    const slowed = run.speed;
    expect(run.tumbles).toBe(1);
    expect(slowed).toBeLessThan(DIFFICULTIES.fast.speed * 0.6);
    const score = run.score;
    stepFor(run, 2);
    expect(run.tumble).toBe(0);
    expect(run.speed).toBeGreaterThan(DIFFICULTIES.fast.speed * 0.9);
    expect(run.score).toBeGreaterThanOrEqual(score);
    expect(playOut(level, idlePlayer).finished).toBe(true);
  });

  it('never tumbles twice on the same jelly', () => {
    const level = testLevel([ground(200), jellies(1)]);
    expect(playOut(level, idlePlayer).tumbles).toBe(1);
  });

  it('throws the runner high off a mushroom, with a double jump still to use', () => {
    const run = createRun(testLevel([ground(200), mushroom()]));
    stepUntil(run, (r) => r.padLock > 0);
    expect(run.vy).toBeGreaterThan(800);
    expect(run.jumps).toBe(1);
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      step(run);
      peak = Math.max(peak, run.y);
    }
    expect(peak).toBeGreaterThan(190);
  });
});

describe('easy mode', () => {
  it('jumps every gap for a child who does nothing', () => {
    const level = testLevel(
      [ground(300), gap(100, { easy: true }), ground(300), gap(150, { easy: true }), ground(300), gap(200, { easy: true })],
      'easy',
    );
    const result = playOut(level, idlePlayer);
    expect(result.rescues).toBe(0);
  });

  it('makes its own hop too low for the stars above a gap', () => {
    const level = testLevel([ground(300), gap(150, { easy: true })], 'easy');
    const run = createRun(level);
    let highest = 0;
    while (!run.finished) {
      step(run);
      if (run.x > 400) highest = Math.max(highest, run.y);
    }
    expect(highest).toBeLessThan(45);
    expect(run.collected).toBe(0);
  });

  it('leaves the jump to the child when they tap in time', () => {
    const level = testLevel([ground(300), gap(100, { easy: true })], 'easy');
    const run = createRun(level);
    const edge = level.lands[0]!.to;
    stepUntil(run, (r) => r.x > edge - 60);
    press(run);
    release(run);
    step(run);
    expect(run.skim).toBe(0);
    expect(run.jumps).toBe(1);
  });

  it('fills in gaps not marked for Easy', () => {
    const pieces = [ground(300), gap(160)];
    expect(testLevel(pieces, 'easy').lands).toHaveLength(1);
    expect(testLevel(pieces, 'fast').lands).toHaveLength(2);
  });
});

describe('the end of a level', () => {
  it('finishes, stops, and ignores taps from then on', () => {
    const run = createRun(testLevel([ground(200)]));
    stepUntil(run, (r) => r.finished);
    press(run);
    stepFor(run, 3);
    expect(run.speed).toBeLessThan(10);
    expect(run.jumps).toBe(0);
  });

  it('ends on solid ground, with no fall after the flag', () => {
    const run = createRun(testLevel([ground(200)], 'turbo'));
    stepUntil(run, (r) => r.finished);
    stepFor(run, 4);
    expect(run.on).toBe(-2);
    expect(run.rescues).toBe(0);
  });

  it('speeds up towards the flag', () => {
    const level = testLevel([ground(4000)]);
    const run = createRun(level);
    stepFor(run, 1);
    const early = run.speed;
    stepUntil(run, (r) => r.x > level.flagX - 100);
    expect(run.speed).toBeGreaterThan(early * 1.15);
  });
});
