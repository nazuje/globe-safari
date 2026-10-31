import { canSee, distance, stepDownhill, tileCentre, tileOf } from './grid.ts';
import { copyRun, tick, type Run } from './run.ts';

// The safe route: the glowing trail, and wait signs that turn to "go" when the way ahead is clear.
// A sign doesn't guess. It plays the next stretch forward several times, the way a child might walk
// it: straight away, late and slowly. It says go only if every one of those walks gets through
// unnoticed, with no robot close by, so a child who obeys is never caught for obeying.

const NEAR_STOP = 0.45;
const CHECK_EVERY_S = 0.25;
const WALK_SLICE_S = 1 / 20;
const LONGEST_WALK_S = 7;
/** Each way a child might set off: how long they take to react, and how fast they really move. */
const WALKS = [
  { late: 0.2, pace: 1 },
  { late: 0.5, pace: 0.9 },
  { late: 0.8, pace: 0.8 },
  { late: 1.1, pace: 1 },
  { late: 1.4, pace: 0.7 },
  { late: 1.7, pace: 0.9 },
];
/** A robot this near, with nothing in between, is too close to walk past. */
const ROBOT_MARGIN = 2.8;
/** A sign that says go keeps saying it for this long, so it never flickers. */
const GO_LASTS_S = 1.6;
/** A sign never traps a child for ever. After this long the trail quietly carries on, and a loss brings help. */
const LONGEST_WAIT_S = 40;

const stepsField = (run: Run, leg: number): Int16Array => run.level.stops[leg]?.steps ?? run.level.exitSteps;

/** The next tiles along the trail from where the player is, up to `most`. Empty while a sign says wait. */
export function trailTiles(run: Run, most: number): number[] {
  const { grid, stops } = run.level;
  const tiles: number[] = [];
  let tile = tileOf(grid, run);
  let leg = run.leg;
  while (tiles.length < most) {
    const stop = stops[leg];
    if (stop?.tile === tile) {
      if (stop.sign) break;
      leg += 1;
      continue;
    }
    const next = stepDownhill(grid, stepsField(run, leg), tile);
    if (next === tile) break;
    tiles.push(next);
    tile = next;
  }
  return tiles;
}

const robotTooClose = (run: Run): boolean =>
  run.robots.some((robot) => robot.mode !== 'dance' && distance(robot, run) < ROBOT_MARGIN && canSee(run.level.grid, robot, run));

function walkFrom(start: Run, leg: number, late: number, pace: number): boolean {
  const run = copyRun(start);
  run.noticed = false;
  for (let wait = late; wait > 0 && run.phase === 'play'; wait -= WALK_SLICE_S) tick(run, null, WALK_SLICE_S);
  let onLeg = leg;
  for (let walked = 0; walked < LONGEST_WALK_S; walked += WALK_SLICE_S) {
    if (run.phase === 'lost' || run.noticed || run.seenFor > 0 || robotTooClose(run)) return false;
    const { grid, stops } = run.level;
    const stop = stops[onLeg];
    const here = tileOf(grid, run);
    if (stop?.tile === here) {
      if (stop.sign) return true;
      onLeg += 1;
    }
    const to = tileCentre(grid, stepDownhill(grid, stepsField(run, onLeg), here));
    const gap = distance(to, run) || 1;
    tick(run, { x: ((to.x - run.x) / gap) * pace, y: ((to.y - run.y) / gap) * pace }, WALK_SLICE_S);
  }
  return true;
}

/** True when walking on from this sign gets through, however a child sets off. */
export const wayIsClear = (run: Run, leg: number): boolean => WALKS.every(({ late, pace }) => walkFrom(run, leg, late, pace));

function standAtSign(run: Run, sign: number): void {
  if (run.atSign === sign) return;
  run.atSign = sign;
  run.guideIn = 0;
  run.waitedFor = 0;
  run.goFor = 0;
}

function checkSign(run: Run, sign: number): void {
  if (run.goFor > 0) return;
  if (run.waitedFor >= LONGEST_WAIT_S) {
    run.leg = sign + 1;
    return;
  }
  const clear = wayIsClear(run, sign + 1);
  const was = run.leg;
  run.leg = clear ? sign + 1 : sign;
  if (!clear) return;
  run.goFor = GO_LASTS_S;
  if (was === sign) run.events.push({ type: 'go' });
}

/** Keeps the trail and the signs up to date. It's kept out of `tick` so that a sign's own walk ahead stays simple. */
export function updateGuide(run: Run, seconds: number): void {
  if (run.phase !== 'play') return;
  const { stops } = run.level;
  const stop = stops[run.leg];
  if (stop && !stop.sign && tileOf(run.level.grid, run) === stop.tile) run.leg += 1;
  const at = stops.findIndex((candidate, index) => candidate.sign && index >= run.leg - 1 && distance(candidate.spot, run) < NEAR_STOP);
  if (at === -1) {
    run.atSign = -1;
    return;
  }
  const arrived = run.atSign !== at;
  standAtSign(run, at);
  run.waitedFor += seconds;
  run.goFor = Math.max(0, run.goFor - seconds);
  run.guideIn -= seconds;
  if (run.guideIn > 0) return;
  run.guideIn = CHECK_EVERY_S;
  const waitedBefore = run.leg === at;
  checkSign(run, at);
  if (arrived && waitedBefore && run.leg === at) run.events.push({ type: 'wait' });
}

/** The way a sign faces the world right now. */
export type SignState = 'wait' | 'go';
export const signState = (run: Run, index: number): SignState => (run.leg > index ? 'go' : 'wait');
