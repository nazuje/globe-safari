import { distance, inView, slide, tileOf, type Point } from './grid.ts';
import { boltDistance, boltSpot, cameraFacing, gapToBeam, sensorState, sweepBeam } from './hazards.ts';
import type { Level } from './level.ts';
import { newRobot, stepRobot, type Robot, type Surroundings } from './robots.ts';
import { BEAM_HIT, BOLT_HIT, BOX_S, DISCO_S, PLAYER_RADIUS, PLAYER_SPEED, SEEN_GRACE_S, STEP_S, STILL_AFTER_S } from './tuning.ts';

export type Cause = 'robot' | 'camera' | 'sensor' | 'laser';

export type RunEvent =
  | { type: 'noticed' }
  | { type: 'gave-up' }
  | { type: 'seen' }
  | { type: 'shot'; laser: number }
  | { type: 'box' }
  | { type: 'disco' }
  | { type: 'treasure' }
  | { type: 'checkpoint' }
  | { type: 'wait' }
  | { type: 'go' }
  | { type: 'won' }
  | { type: 'lost'; cause: Cause };

export interface Checkpoint {
  spot: Point;
  elapsed: number;
  noticed: boolean;
  /** How far along the safe route it is. */
  leg?: number;
}

export interface Run {
  level: Level;
  /** The hazards' clock. It restarts with each try. */
  t: number;
  /** The clock for the time star, kept across a checkpoint. */
  elapsed: number;
  spare: number;
  phase: 'play' | 'won' | 'lost';
  cause: Cause | null;
  x: number;
  y: number;
  facing: number;
  stillFor: number;
  moving: boolean;
  robots: Robot[];
  /** How long a camera has had the player in its cone. */
  seenFor: number;
  /** Any robot has noticed the player on this escape. */
  noticed: boolean;
  boxLeft: number;
  boxesTaken: number;
  discoLeft: number;
  discoUsed: boolean;
  hasTreasure: boolean;
  checkpoint: Checkpoint | null;
  /** The next stop on the safe route. Past the last one, the trail runs to the exit. */
  leg: number;
  /** The wait sign the player is standing at, or -1. */
  atSign: number;
  guideIn: number;
  waitedFor: number;
  goFor: number;
  events: RunEvent[];
}

/** The way the player wants to run, as a unit vector, or null to stand still. */
export type Steer = Point | null;

export function newRun(level: Level, checkpoint: Checkpoint | null = null, hasTreasure = false): Run {
  const { x, y } = checkpoint?.spot ?? level.start;
  return {
    level,
    t: 0,
    elapsed: checkpoint?.elapsed ?? 0,
    spare: 0,
    phase: 'play',
    cause: null,
    x,
    y,
    facing: 0,
    stillFor: STILL_AFTER_S,
    moving: false,
    robots: level.robots.map((plan) => newRobot(plan, level)),
    seenFor: 0,
    noticed: checkpoint?.noticed ?? false,
    boxLeft: 0,
    boxesTaken: 0,
    discoLeft: 0,
    discoUsed: false,
    hasTreasure,
    checkpoint,
    leg: checkpoint?.leg ?? 0,
    atSign: -1,
    guideIn: 0,
    waitedFor: 0,
    goFor: 0,
    events: [],
  };
}

/** Straight back in: from the checkpoint if one was reached, otherwise from the start. Found treasure stays found. */
export const retryRun = (run: Run, level: Level = run.level): Run => newRun(level, run.checkpoint, run.hasTreasure);

function lose(run: Run, cause: Cause): void {
  if (run.phase !== 'play') return;
  run.phase = 'lost';
  run.cause = cause;
  run.events.push({ type: 'lost', cause });
}

function movePlayer(run: Run, steer: Steer, seconds: number): void {
  run.moving = steer !== null;
  if (!steer) {
    run.stillFor += seconds;
    return;
  }
  run.stillFor = 0;
  run.facing = Math.atan2(steer.y, steer.x);
  const reach = PLAYER_SPEED * seconds;
  const moved = slide(run.level.grid, run, steer.x * reach, steer.y * reach, PLAYER_RADIUS);
  run.x = moved.x;
  run.y = moved.y;
}

/** A checkpoint only counts when it's nearer the exit than the one already reached. */
function isFurther(run: Run, spot: Point): boolean {
  const { grid, exitSteps } = run.level;
  const stepsLeft = (where: Point): number => exitSteps[tileOf(grid, where)] ?? 0;
  return !run.checkpoint || stepsLeft(spot) < stepsLeft(run.checkpoint.spot);
}

function collect(run: Run): void {
  const { level } = run;
  const touching = (spot: Point): boolean => distance(run, spot) < 0.55;
  level.boxes.forEach((spot, index) => {
    const taken = (run.boxesTaken & (1 << index)) !== 0;
    if (taken || !touching(spot)) return;
    run.boxesTaken |= 1 << index;
    run.boxLeft = BOX_S;
    run.events.push({ type: 'box' });
  });
  if (level.disco && !run.discoUsed && touching(level.disco)) {
    run.discoUsed = true;
    run.discoLeft = DISCO_S;
    run.events.push({ type: 'disco' });
  }
  if (level.treasure && !run.hasTreasure && touching(level.treasure)) {
    run.hasTreasure = true;
    run.events.push({ type: 'treasure' });
  }
  for (const spot of level.checkpoints) {
    if (!touching(spot) || !isFurther(run, spot)) continue;
    run.checkpoint = { spot, elapsed: run.elapsed, noticed: run.noticed, leg: run.leg };
    run.events.push({ type: 'checkpoint' });
  }
}

function moveRobots(run: Run, seconds: number): void {
  const world: Surroundings = {
    level: run.level,
    player: run,
    still: run.stillFor >= STILL_AFTER_S,
    boxed: run.boxLeft > 0,
    discoOn: run.discoLeft > 0,
  };
  for (const robot of run.robots) {
    const news = stepRobot(robot, world, seconds);
    if (news.noticed) {
      run.noticed = true;
      run.events.push({ type: 'noticed' });
    }
    if (news.gaveUp) run.events.push({ type: 'gave-up' });
    if (news.caught) lose(run, 'robot');
  }
}

function watchCameras(run: Run, seconds: number): void {
  const { level } = run;
  const seen = level.cameras.some((camera) =>
    inView(level.grid, { from: camera.from, facing: cameraFacing(camera, run.t), half: camera.half, range: camera.range }, run),
  );
  if (!seen) {
    run.seenFor = 0;
    return;
  }
  if (run.seenFor === 0) run.events.push({ type: 'seen' });
  run.seenFor += seconds;
  if (run.seenFor >= SEEN_GRACE_S) lose(run, 'camera');
}

function checkSensors(run: Run): void {
  const tile = tileOf(run.level.grid, run);
  const onPlate = run.level.sensors.some((sensor) => sensor.tiles.includes(tile) && sensorState(sensor, run.t) === 'on');
  if (onPlate) lose(run, 'sensor');
}

function checkLasers(run: Run, before: number): void {
  const { level } = run;
  level.lasers.forEach((laser, index) => {
    const flown = boltDistance(laser, run.t);
    if (flown !== null && (boltDistance(laser, before) ?? Infinity) > flown) run.events.push({ type: 'shot', laser: index });
    if (flown !== null && distance(boltSpot(laser, flown), run) < BOLT_HIT) lose(run, 'laser');
    const beam = sweepBeam(laser, level.grid, run.t);
    if (beam && gapToBeam(laser.from, beam, run) < BEAM_HIT) lose(run, 'laser');
  });
}

/** One small slice of the game. Tests and bots can pick a coarser slice than the screen does. */
export function tick(run: Run, steer: Steer, seconds: number): void {
  if (run.phase !== 'play') return;
  const before = run.t;
  run.t += seconds;
  run.elapsed += seconds;
  run.boxLeft = Math.max(0, run.boxLeft - seconds);
  run.discoLeft = Math.max(0, run.discoLeft - seconds);
  movePlayer(run, steer, seconds);
  collect(run);
  if (tileOf(run.level.grid, run) === run.level.exitTile) {
    run.phase = 'won';
    run.events.push({ type: 'won' });
    return;
  }
  moveRobots(run, seconds);
  watchCameras(run, seconds);
  checkSensors(run);
  checkLasers(run, before);
}

/** Moves the game on by any amount of real time, in equal slices, so every frame rate plays the same. */
export function stepRun(run: Run, steer: Steer, seconds: number): void {
  run.spare += seconds;
  while (run.spare >= STEP_S && run.phase === 'play') {
    run.spare -= STEP_S;
    tick(run, steer, STEP_S);
  }
}

/** Everything a bot needs to try something out without touching the real run. */
export function copyRun(run: Run, level: Level = run.level, robots: Robot[] = run.robots): Run {
  return { ...run, level, robots: robots.map((robot) => ({ ...robot })), events: [] };
}

/** One star for getting out, one for doing it in good time and one for never being noticed. A helped win earns the first only. */
export function runStars(run: Run): number {
  if (run.phase !== 'won') return 0;
  if (run.level.help > 0) return 1;
  return 1 + (run.elapsed <= run.level.par ? 1 : 0) + (run.noticed ? 0 : 1);
}
