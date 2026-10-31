import { describe, expect, it } from 'vitest';
import { buildLevel, type LevelData } from './level.ts';
import { newRun, retryRun, runStars, stepRun, tick, type Run, type Steer } from './run.ts';
import { BOX_S, SEEN_GRACE_S, STEP_S, TUNING, type Setting } from './tuning.ts';

const EAST = { x: 1, y: 0 };
const WEST = { x: -1, y: 0 };

function runOf(data: Omit<LevelData, 'idea' | 'theme'>, setting: Setting = 'easy'): Run {
  return newRun(buildLevel({ idea: 'mix', theme: 'cyan', ...data }, 1, setting));
}

function play(run: Run, seconds: number, steer: Steer = null): void {
  for (let left = seconds; left > 0 && run.phase === 'play'; left -= STEP_S) tick(run, steer, STEP_S);
}

const corridor = (...lines: string[]): { map: string[] } => ({ map: ['#'.repeat(lines[0]?.length ?? 0), ...lines, '#'.repeat(lines[0]?.length ?? 0)] });

describe('winning', () => {
  it('wins on reaching the exit', () => {
    const run = runOf(corridor('#S   E#'));
    play(run, 3, EAST);
    expect(run.phase).toBe('won');
    expect(run.events).toContainEqual({ type: 'won' });
  });

  it('gives a star for escaping, for time and for never being noticed', () => {
    const run = runOf(corridor('#S   E#'));
    play(run, 3, EAST);
    expect(runStars(run)).toBe(3);
    expect(runStars({ ...run, noticed: true })).toBe(2);
    expect(runStars({ ...run, noticed: true, elapsed: 9999 })).toBe(1);
    expect(runStars({ ...run, phase: 'play' })).toBe(0);
  });
});

describe('robots', () => {
  const lane = { ...corridor('#S     a      b#', '############# #', '#E            #'), robots: [{ route: 'ba' }] };

  it('patrols its route and comes back', () => {
    const run = runOf({ ...corridor('#S########a    b#', '# E#############'), robots: [{ route: 'ab' }] });
    const seen = new Set<number>();
    for (let step = 0; step < 20 / STEP_S; step += 1) {
      tick(run, null, STEP_S);
      seen.add(Math.round(run.robots[0]?.x ?? 0));
    }
    expect(seen.has(11)).toBe(true);
    expect(seen.has(15)).toBe(true);
    expect(run.robots[0]?.mode).toBe('patrol');
  });

  it('notices a moving player in its cone and raises the alarm', () => {
    const run = runOf(lane);
    run.robots[0]!.x = 6.5;
    run.robots[0]!.facing = Math.PI;
    run.robots[0]!.goal = { x: 6.5, y: 1.5 };
    run.x = 4.5;
    play(run, 0.1, { x: 0.01, y: 0 });
    expect(run.robots[0]?.mode).toBe('alert');
    expect(run.noticed).toBe(true);
    expect(run.events).toContainEqual({ type: 'noticed' });
  });

  it('misses a player who stands still further down its cone', () => {
    const run = runOf(lane);
    run.robots[0]!.x = 6.5;
    run.robots[0]!.facing = Math.PI;
    run.robots[0]!.goal = { x: 6.5, y: 1.5 };
    run.x = 4;
    play(run, STEP_S * 2);
    expect(run.robots[0]?.mode).toBe('patrol');
  });

  it('does not see through a wall', () => {
    const run = runOf({ ...corridor('#S     a      b#', '###############', '#E            #'), robots: [{ route: 'ba' }] });
    run.x = 8.5;
    run.y = 3.5;
    play(run, 8);
    expect(run.noticed).toBe(false);
  });

  it('chases, and catching the player is a loss', () => {
    const run = runOf(lane);
    run.robots[0]!.x = 6.5;
    run.robots[0]!.facing = Math.PI;
    run.robots[0]!.goal = { x: 6.5, y: 1.5 };
    run.x = 4.5;
    run.stillFor = 0;
    play(run, 6, { x: 0, y: -0.01 });
    expect(run.phase).toBe('lost');
    expect(run.cause).toBe('robot');
  });

  it.each(['easy', 'hard'] as const)('is outrun on %s: a player who keeps going is never caught', (setting) => {
    expect(TUNING[setting].chase).toBeLessThan(3);
  });

  it('loses the player after enough time out of sight, then goes back to patrol', () => {
    const run = runOf({ ...corridor('#S a        b###', '##### #########', '#             #', '###############', '#            E#'), robots: [{ route: 'ba' }] });
    const robot = run.robots[0]!;
    robot.x = 4.5;
    robot.facing = Math.PI;
    robot.goal = { x: 4.5, y: 1.5 };
    robot.mode = 'chase';
    robot.lastSeen = robot.plan.loop[0] ?? 0;
    run.x = 12.5;
    run.y = 3.5;
    run.stillFor = 1;
    play(run, TUNING.easy.loseAfter + 0.3);
    expect(['confused', 'chase']).toContain(robot.mode);
    run.x = 2.5;
    run.y = 5.5;
    play(run, 12);
    expect(['patrol', 'return']).toContain(robot.mode);
    expect(run.phase).toBe('play');
  });

  it('never gives up while it can still see the player', () => {
    const run = runOf({ ...corridor('#S a                 b#', '# #####################', '#E                    #'), robots: [{ route: 'ba' }] });
    const robot = run.robots[0]!;
    robot.mode = 'chase';
    robot.lastSeen = robot.plan.loop[0] ?? 0;
    robot.x = 3.5;
    robot.goal = { x: 3.5, y: 1.5 };
    run.x = 6.5;
    play(run, TUNING.easy.loseAfter + 1, EAST);
    expect(robot.mode).toBe('chase');
  });
});

describe('cameras', () => {
  const hall = { map: ['#########', '#S  1   #', '#       #', '#       #', '#      E#', '#########'].map((line) => line), cameras: [{ at: '1', aim: 'S' as const, sweep: 0, period: 6 }] };

  it('flashes a warning, then ends the run after the short grace', () => {
    const run = runOf(hall);
    run.x = 4.5;
    run.y = 3.5;
    play(run, SEEN_GRACE_S * 0.5);
    expect(run.phase).toBe('play');
    expect(run.events).toContainEqual({ type: 'seen' });
    play(run, SEEN_GRACE_S);
    expect(run.phase).toBe('lost');
    expect(run.cause).toBe('camera');
  });

  it('forgives a child who steps out in time', () => {
    const run = runOf(hall);
    run.x = 4.5;
    run.y = 3.5;
    play(run, SEEN_GRACE_S * 0.6);
    run.x = 1.5;
    play(run, 1);
    expect(run.phase).toBe('play');
    expect(run.seenFor).toBe(0);
  });

  it('cannot see past a wall', () => {
    const run = runOf({ map: ['#########', '#   1   #', '#  ###  #', '#   a   #', '#S     E#', '#########'], cameras: [{ at: '1', aim: 'S', sweep: 0, period: 6 }] });
    run.x = 4.5;
    run.y = 3.5;
    play(run, 2);
    expect(run.phase).toBe('play');
  });
});

describe('sensors', () => {
  const plate = { ...corridor('#S a E#'), sensors: [{ plate: 'a', period: 4, on: 2, offset: 4.6 }] };

  it('loses on an active plate', () => {
    const run = runOf(plate);
    run.x = 3.5;
    play(run, 1);
    expect(run.phase).toBe('lost');
    expect(run.cause).toBe('sensor');
  });

  it('is safe on a sleeping plate', () => {
    const run = runOf({ ...corridor('#S a E#'), sensors: [{ plate: 'a', period: 4, on: 1, offset: 2 }] });
    run.x = 3.5;
    play(run, 1);
    expect(run.phase).toBe('play');
  });
});

describe('lasers', () => {
  const gun = { map: ['#########', '1 a     #', '#S     E#', '#########'], lasers: [{ at: '1', aim: 'E' as const, kind: 'bolt' as const, period: 3 }] };

  it('a bolt hits a player in its path', () => {
    const run = runOf(gun);
    run.x = 3.5;
    run.y = 1.5;
    play(run, 5);
    expect(run.phase).toBe('lost');
    expect(run.cause).toBe('laser');
  });

  it('a bolt misses a player in the next lane', () => {
    const run = runOf(gun);
    play(run, 8);
    expect(run.phase).toBe('play');
  });

  it('a sweeping beam hits what it crosses', () => {
    const run = runOf({ map: ['#######', '#     #', '#  a  #', '#S   E#', '###1###'], lasers: [{ at: '1', aim: 'N', kind: 'sweep', period: 4, sweep: 70, on: 2 }] });
    run.x = 3.5;
    run.y = 2.5;
    play(run, 3);
    expect(run.cause).toBe('laser');
  });
});

describe('surprises', () => {
  const lane = { ...corridor('#S B a    b E#'), robots: [{ route: 'ba' }] };

  it('a box fools robots for a few seconds', () => {
    const run = runOf(lane);
    run.x = 4;
    play(run, 0.2, EAST);
    expect(run.boxLeft).toBeGreaterThan(0);
    const robot = run.robots[0]!;
    robot.mode = 'chase';
    play(run, 0.1);
    expect(robot.mode).toBe('confused');
    expect(run.events).toContainEqual({ type: 'box' });
    run.x = robot.x;
    run.y = robot.y;
    play(run, 0.5);
    expect(run.phase).toBe('play');
    play(run, BOX_S + 8);
    expect(run.boxLeft).toBe(0);
  });

  it('a disco makes a robot dance instead of chase, then it goes back to work', () => {
    const run = runOf({ ...corridor('#S D a    b E#'), robots: [{ route: 'ab' }] });
    run.x = 3;
    const robot = run.robots[0]!;
    robot.mode = 'chase';
    play(run, 0.2, EAST);
    expect(robot.mode).toBe('dance');
    run.x = robot.x;
    play(run, 2);
    expect(run.phase).toBe('play');
    run.x = 1.5;
    play(run, 8);
    expect(robot.mode).not.toBe('dance');
    expect(run.discoUsed).toBe(true);
  });

  it('a treasure stays found after a retry', () => {
    const run = runOf(corridor('#S G E#'));
    play(run, 0.8, EAST);
    expect(run.hasTreasure).toBe(true);
    expect(retryRun(run).hasTreasure).toBe(true);
  });

  it('a hidden room is walked into through its hologram, and a robot cannot follow', () => {
    const run = runOf({ ...corridor('#GH  S a   b E#'), robots: [{ route: 'ab' }] });
    run.robots[0]!.mode = 'chase';
    play(run, 2, WEST);
    expect(run.x).toBeLessThan(2.2);
    expect(run.hasTreasure).toBe(true);
    play(run, 6);
    expect(run.phase).toBe('play');
  });
});

describe('losing costs nothing', () => {
  it('goes straight back to the start', () => {
    const run = runOf(corridor('#S a E#'));
    run.x = 3.5;
    run.phase = 'lost';
    const again = retryRun(run);
    expect(again.phase).toBe('play');
    expect(again.x).toBe(1.5);
    expect(again.t).toBe(0);
  });

  it('goes back to a checkpoint on Easy, keeping the time and notices from there', () => {
    const run = runOf(corridor('#S  C  E#'));
    play(run, 1, EAST);
    expect(run.checkpoint).not.toBeNull();
    const reached = run.checkpoint!.elapsed;
    run.noticed = true;
    run.phase = 'lost';
    const again = retryRun(run);
    expect(again.x).toBeCloseTo(4.5);
    expect(again.elapsed).toBe(reached);
    expect(again.noticed).toBe(false);
  });

  it('has no checkpoints on Hard', () => {
    const run = runOf(corridor('#S  C  E#'), 'hard');
    play(run, 1, EAST);
    expect(run.checkpoint).toBeNull();
  });

  it('stops the world when the run is over', () => {
    const run = runOf(corridor('#S a E#'));
    run.phase = 'lost';
    const at = run.t;
    stepRun(run, EAST, 1);
    expect(run.t).toBe(at);
  });
});

describe('frame rates', () => {
  function playAt(fps: number): Run {
    const run = runOf({
      map: ['###########', '#S  a    b#', '######### #', '#E        #', '###########'],
      robots: [{ route: 'ab' }],
    });
    const seconds = 1 / fps;
    for (let frame = 0; frame < 2 * fps; frame += 1) stepRun(run, EAST, seconds);
    return run;
  }

  it('plays the same at 30, 60 and 144 frames a second', () => {
    const at60 = playAt(60);
    for (const fps of [30, 144]) {
      const other = playAt(fps);
      expect(other.x).toBeCloseTo(at60.x, 1);
      expect(other.robots[0]?.x).toBeCloseTo(at60.robots[0]?.x ?? 0, 1);
    }
  });
});
