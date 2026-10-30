import { groundAt, jellyX, landAfter, landEnd, type Level } from './level.ts';
import { runStars, type StarCount } from './rating.ts';
import { createRun, isOnGround, press, release, step, type Run } from './run.ts';
import { STEP } from './tuning.ts';

/** A simulated player: looks at the game each step and may press or lift a finger. */
export type Player = (run: Run) => void;

export interface Result {
  finished: boolean;
  seconds: number;
  /** Seconds to the flag, which is what a level's length means. */
  flagSeconds: number;
  stars: StarCount;
  collected: number;
  rescues: number;
  tumbles: number;
  jellyBounces: number;
  foundTreasure: boolean;
  score: number;
}

const GIVE_UP_SECONDS = 240;

export function playOut(level: Level, player: Player): Result {
  const run = createRun(level);
  let flagSeconds = 0;
  while (!run.finished && run.time < GIVE_UP_SECONDS) {
    player(run);
    step(run);
    if (run.flagged && flagSeconds === 0) flagSeconds = run.time;
  }
  return {
    finished: run.finished,
    seconds: run.time,
    flagSeconds,
    stars: runStars(run),
    collected: run.collected,
    rescues: run.rescues,
    tumbles: run.tumbles,
    jellyBounces: run.jellyBounces,
    foundTreasure: run.foundTreasure,
    score: run.score,
  };
}

/** Never touches the screen. */
export const idlePlayer: Player = () => undefined;

/** Taps exactly where the level was designed to be tapped. */
export function routePlayer(level: Level, secrets: boolean): Player {
  const route = level.route.filter((tap) => secrets || !tap.secret);
  let next = 0;
  let liftAt = 0;
  return (run) => {
    if (run.held && run.time >= liftAt) release(run);
    while (next < route.length && route[next]!.x <= run.x) {
      const tap = route[next]!;
      next++;
      press(run);
      liftAt = run.time + tap.hold;
    }
  };
}

/** Plays like a six-year-old who's got the idea: looks ahead, jumps gaps and jellies, saves a fall with a double jump. */
export const carefulPlayer: Player = (run) => {
  if (run.held) release(run);
  const { level, speed, x } = run;
  if (isOnGround(run)) {
    const end = landEnd(level, x);
    if (end !== null && end - x < speed * 0.1 + 6) return press(run);
    const look = speed * 0.32 + 10;
    if (level.jellies.some((jelly) => jellyX(jelly, run.time) - x > 30 && jellyX(jelly, run.time) - x < look && run.safe <= 0)) press(run);
    return;
  }
  saveAFall(run);
};

/** Looks down in mid-air and uses the second jump if the ground isn't coming. */
function saveAFall(run: Run): void {
  if (run.on !== -1 || run.vy >= 0 || run.jumps >= 2 || run.rocketTo !== null || run.scoop) return;
  const ahead = run.x + run.speed * 0.14;
  if (groundAt(run.level, ahead) !== null) return;
  const next = landAfter(run.level, ahead);
  if (next && run.y < next.hs[0]! + 40) press(run);
}

const LOOK_FOR_STARS_SECONDS = 0.12;
const STAR_IS_HIGH = 60;

function highStarAhead(run: Run): boolean {
  const { items } = run.level;
  const look = run.x + run.speed * LOOK_FOR_STARS_SECONDS;
  for (let i = run.firstItem; i < items.length; i++) {
    const item = items[i]!;
    if (item.x > look) return false;
    if (run.got[i] || item.extra || item.x < run.x + 10) continue;
    if (item.y - run.y > STAR_IS_HIGH) return true;
  }
  return false;
}

/** Plays like a keen six-year-old on a first go: everything the careful player does, and jumps for the stars it can see. */
export const keenPlayer: Player = (run) => {
  carefulPlayer(run);
  if (!run.pressed && isOnGround(run) && highStarAhead(run)) press(run);
};

const HUMAN_ERROR_SECONDS = 0.05;
const MISSED_TAP_CHANCE = 0.06;

/** Plays like a child who has got to know the level: the designed taps, a little early or late, with the odd one missed. */
export function skilledPlayer(level: Level, seed: number): Player {
  let state = seed >>> 0;
  const random = (): number => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const speed = level.tuning.speed;
  const route = level.route
    .filter((tap) => !tap.secret && random() > MISSED_TAP_CHANCE)
    .map((tap) => ({ ...tap, x: tap.x + (random() - 0.5) * 2 * HUMAN_ERROR_SECONDS * speed }))
    .sort((one, other) => one.x - other.x);
  let next = 0;
  let liftAt = 0;
  return (run) => {
    if (run.held && run.time >= liftAt) release(run);
    if (next < route.length && route[next]!.x <= run.x) {
      liftAt = run.time + route[next]!.hold;
      next++;
      press(run);
      return;
    }
    if (!run.held) saveAFall(run);
  };
}

/** Taps a steady beat without looking, like a child who likes the jumping more than the stars. */
export function steadyPlayer(secondsBetween: number): Player {
  let next = 1;
  return (run) => {
    if (run.held) release(run);
    if (run.time < next) return;
    next += secondsBetween;
    press(run);
  };
}

/** Taps at random, a few times a second, like a child mashing the screen. */
export function masherPlayer(seed: number, tapsPerSecond: number): Player {
  let state = seed >>> 0;
  return (run) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    if (run.held) release(run);
    if (state / 2 ** 32 < tapsPerSecond * STEP) press(run);
  };
}
