import { fly, launchAt, launchDouble, launchJump, type Body } from './flight.ts';
import {
  groundAt,
  jellyTop,
  jellyX,
  landAfter,
  landEnd,
  platformX,
  platformY,
  railHeight,
  safeSpot,
  type Level,
} from './level.ts';
import {
  CASTLE_SPEED,
  DROP_HEIGHT,
  DROP_SAFE,
  JELLY_HEIGHT,
  JELLY_WIDTH,
  LEDGE_FORGIVENESS,
  PAD_HEIGHT,
  PAD_REACH,
  RAIL_HEIGHT,
  ROCKET_SPEED,
  RUNNER_HEIGHT,
  RUNNER_WIDTH,
  SCOOP_CARRY,
  SCOOP_LIFT,
  SCOOP_SWOOP,
  SCORE,
  SPEED_EASE,
  SPIN_SECONDS,
  SPRING_SPEED,
  STEP,
  STOMP_SPEED,
  TUMBLE_LOCK,
  TUMBLE_SAFE,
  TUMBLE_SECONDS,
  TUMBLE_SPEED,
} from './tuning.ts';

const IN_AIR = -1;
const ON_LAND = -2;
const ASSIST_LOOK_SECONDS = 0.075;
const ASSIST_DOUBLE_LOOK_SECONDS = 0.14;
const ASSIST_DOUBLE_ABOVE_RIM = 8;
/** The assisted hop stays this low, under the star arcs, so it clears a gap and collects nothing. */
const SKIM_HEIGHT = 36;
const SKIM_CLEARANCE = 30;
const SKIM_LANDING_ROOM = 34;
const SKIM_SHORTEST = 0.35;
const SKIM_LEAST_SPEED = 90;
const PAD_LOCK_SECONDS = 0.25;
const ROCKET_RISE = 7;
const SQUISH_SECONDS = 0.55;
const RUN_OUT_SECONDS_TO_STOP = 3.2;

export type Helper = 'stork' | 'cloud';

export type RunEvent =
  | { type: 'jump' | 'skim' | 'double' | 'spring' | 'bounce' | 'tumble' | 'fall' | 'drop' | 'rocket' | 'rocketEnd' | 'flag' | 'finish'; x: number; y: number }
  | { type: 'land'; x: number; y: number; impact: number }
  | { type: 'jelly'; x: number; y: number; index: number }
  | { type: 'scoop'; x: number; y: number; helper: Helper }
  | { type: 'item'; x: number; y: number; index: number };

interface Scoop {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
  helper: Helper;
}

export interface Run extends Body {
  level: Level;
  time: number;
  x: number;
  speed: number;
  /** IN_AIR, ON_LAND, or the index of the platform underfoot. */
  on: number;
  jumps: number;
  coyote: number;
  buffer: number;
  pressed: boolean;
  held: boolean;
  /** Gravity of the low hop the game makes on Easy, or 0 in an ordinary jump. */
  skim: number;
  /** Seconds left of the spin in a double jump. */
  spin: number;
  tumble: number;
  safe: number;
  padLock: number;
  rocketTo: number | null;
  scoop: Scoop | null;
  /** When each jelly was last bounced on, as seconds left of its squish. */
  squish: number[];
  /** When each pad was last used, as seconds since, for drawing. */
  padAge: number[];
  got: Uint8Array;
  firstItem: number;
  score: number;
  collected: number;
  jellyBounces: number;
  doubles: number;
  rescues: number;
  tumbles: number;
  foundTreasure: boolean;
  flagged: boolean;
  finished: boolean;
  carry: number;
  events: RunEvent[];
}

export function createRun(level: Level): Run {
  return {
    level,
    time: 0,
    x: 40,
    y: groundAt(level, 40) ?? 0,
    vy: 0,
    float: 0,
    floated: 0,
    speed: 0,
    on: ON_LAND,
    jumps: 0,
    coyote: 0,
    buffer: 0,
    pressed: false,
    held: false,
    skim: 0,
    spin: 0,
    tumble: 0,
    safe: 0,
    padLock: 0,
    rocketTo: null,
    scoop: null,
    squish: level.jellies.map(() => 0),
    padAge: level.pads.map(() => 9),
    got: new Uint8Array(level.items.length),
    firstItem: 0,
    score: 0,
    collected: 0,
    jellyBounces: 0,
    doubles: 0,
    rescues: 0,
    tumbles: 0,
    foundTreasure: false,
    flagged: false,
    finished: false,
    carry: 0,
    events: [],
  };
}

/** A finger came down. The jump happens on the next step. */
export function press(run: Run): void {
  run.pressed = true;
  run.held = true;
}

export function release(run: Run): void {
  run.held = false;
}

export const isOnGround = (run: Run): boolean => run.on !== IN_AIR && run.scoop === null && run.rocketTo === null;

/** How fast the level wants the runner to go here: it speeds up on the way to the flag. */
export function speedAt(level: Level, x: number): number {
  const { speed, ramp } = level.tuning;
  return speed * (1 + (ramp - 1) * Math.min(1, Math.max(0, x / level.flagX)));
}

function jump(run: Run): void {
  launchJump(run, run.level.physics);
  run.skim = 0;
  run.on = IN_AIR;
  run.jumps = 1;
  run.coyote = 0;
  run.buffer = 0;
  run.events.push({ type: 'jump', x: run.x, y: run.y });
}

function doubleJump(run: Run): void {
  launchDouble(run, run.level.physics);
  run.skim = 0;
  run.jumps = 2;
  run.buffer = 0;
  run.doubles++;
  run.spin = SPIN_SECONDS;
  run.events.push({ type: 'double', x: run.x, y: run.y });
}

function tryJump(run: Run): void {
  if (run.buffer <= 0 || run.tumble > TUMBLE_SECONDS - TUMBLE_LOCK) return;
  if (run.on !== IN_AIR || run.coyote > 0) jump(run);
  else if (run.jumps < 2) doubleJump(run);
}

function edgeAhead(run: Run, look: number): boolean {
  const { level } = run;
  if (run.on >= 0) {
    const platform = level.platforms[run.on]!;
    const edge = platformX(platform, run.time) + platform.w / 2;
    return edge - run.x < look && groundAt(level, edge + 4) === null;
  }
  const end = landEnd(level, run.x);
  return end !== null && end - run.x < look;
}

function willLandOnPlatform(run: Run, ahead: number): boolean {
  return run.level.platforms.some((platform) => {
    const top = platformY(platform, run.time);
    return top <= run.y && Math.abs(ahead - platformX(platform, run.time)) < platform.w / 2;
  });
}

/** On Easy the game quietly saves a jump the child didn't make. A tap in time always comes first. */
function assist(run: Run): void {
  if (run.tumble > TUMBLE_SECONDS - TUMBLE_LOCK || run.finished) return;
  if (run.on !== IN_AIR) {
    if (edgeAhead(run, run.speed * ASSIST_LOOK_SECONDS + 4)) skim(run, 1);
    return;
  }
  if (run.skim > 0 || run.vy >= 0 || run.coyote > 0 || run.jumps >= 2) return;
  if (groundAt(run.level, run.x) !== null) return;
  if (willLandOnPlatform(run, run.x + run.speed * ASSIST_DOUBLE_LOOK_SECONDS)) return;
  const next = landAfter(run.level, run.x);
  if (next && run.y + run.vy * ASSIST_DOUBLE_LOOK_SECONDS < next.hs[0]! + ASSIST_DOUBLE_ABOVE_RIM) skim(run, 2);
}

/** The next thing to land on past a gap: a platform in the gap if there is one, or the far side. */
function landingAhead(run: Run): { x: number; y: number } | null {
  const { level } = run;
  const next = landAfter(level, run.x);
  if (!next) return null;
  let best = { x: next.from + SKIM_LANDING_ROOM, y: next.hs[0]! };
  for (const platform of level.platforms) {
    const middle = platformX(platform, run.time);
    const near = middle - platform.w / 2;
    if (near <= run.x + 20 || near >= best.x || groundAt(level, middle) !== null) continue;
    best = { x: middle, y: platformY(platform, run.time) };
  }
  return best;
}

/**
 * A low hop exactly as long as the gap, under the arc of stars. It keeps a child
 * who didn't tap running, while every reward stays with the child who did.
 */
function skim(run: Run, jumps: number): void {
  const landing = landingAhead(run);
  if (!landing) return;
  const seconds = Math.max(SKIM_SHORTEST, (landing.x - run.x) / Math.max(SKIM_LEAST_SPEED, run.speed));
  const rise = landing.y - run.y;
  const height = Math.max(SKIM_HEIGHT, rise + SKIM_CLEARANCE);
  run.vy = (4 * height) / seconds;
  run.skim = (2 * (run.vy * seconds - rise)) / seconds ** 2;
  run.float = 0;
  run.on = IN_AIR;
  run.jumps = jumps;
  run.coyote = 0;
  run.buffer = 0;
  run.events.push({ type: 'skim', x: run.x, y: run.y });
}

function targetSpeed(run: Run): number {
  if (run.finished) return 0;
  const speed = speedAt(run.level, run.x);
  if (run.rocketTo !== null) return speed * ROCKET_SPEED;
  return run.tumble > 0 ? speed * TUMBLE_SPEED : speed;
}

function ease(run: Run): void {
  const rate = run.finished ? RUN_OUT_SECONDS_TO_STOP : SPEED_EASE;
  run.speed += (targetSpeed(run) - run.speed) * (1 - Math.exp(-rate * STEP));
}

function land(run: Run, on: number): void {
  const impact = -run.vy;
  run.on = on;
  run.vy = 0;
  run.jumps = 0;
  run.skim = 0;
  run.spin = 0;
  run.float = 0;
  run.events.push({ type: 'land', x: run.x, y: run.y, impact });
}

function inBouncy(run: Run): boolean {
  return run.level.bouncy.some((span) => run.x >= span.from && run.x <= span.to);
}

function castleBounce(run: Run): void {
  launchAt(run, CASTLE_SPEED, run.level.physics);
  run.skim = 0;
  run.on = IN_AIR;
  run.jumps = 1;
  run.spin = 0;
  run.events.push({ type: 'bounce', x: run.x, y: run.y });
}

function followSurface(run: Run): void {
  const { level } = run;
  if (run.on === ON_LAND) {
    const height = groundAt(level, run.x);
    if (height === null) {
      run.on = IN_AIR;
      run.coyote = level.tuning.coyote;
      return;
    }
    run.y = height;
    if (inBouncy(run)) castleBounce(run);
    return;
  }
  const platform = level.platforms[run.on]!;
  const centre = platformX(platform, run.time);
  if (Math.abs(run.x - centre) > platform.w / 2 + RUNNER_WIDTH / 3) {
    run.on = IN_AIR;
    run.coyote = level.tuning.coyote;
    return;
  }
  run.y = platformY(platform, run.time);
}

function landOnPlatform(run: Run, fromY: number): boolean {
  if (run.vy > 0) return false;
  const { platforms } = run.level;
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i]!;
    const top = platformY(platform, run.time);
    if (run.y > top || fromY < top - 6) continue;
    if (Math.abs(run.x - platformX(platform, run.time)) > platform.w / 2 + RUNNER_WIDTH / 3) continue;
    run.y = top;
    land(run, i);
    return true;
  }
  return false;
}

function startScoop(run: Run): void {
  const { level } = run;
  const toX = safeSpot(level, run.x);
  run.scoop = {
    fromX: run.x,
    fromY: run.y,
    toX,
    toY: (groundAt(level, toX) ?? 0) + DROP_HEIGHT,
    age: 0,
    helper: run.rescues % 2 === 0 ? 'stork' : 'cloud',
  };
  run.rescues++;
  run.vy = 0;
  run.skim = 0;
  run.tumble = 0;
  run.events.push({ type: 'scoop', x: run.x, y: run.y, helper: run.scoop.helper });
}

function flyAndLand(run: Run, fromX: number, fromY: number): void {
  const { level } = run;
  if (run.skim > 0) {
    run.vy -= run.skim * STEP;
    run.y += run.vy * STEP;
  } else {
    fly(run, run.held, level.physics);
  }
  const height = groundAt(level, run.x);
  if (height !== null && run.y <= height) {
    if (fromY >= height - LEDGE_FORGIVENESS) {
      run.y = height;
      land(run, ON_LAND);
      if (inBouncy(run)) castleBounce(run);
      return;
    }
    // Below the rim of a gap: the far wall stops the runner, and the fall carries on.
    run.x = fromX;
  }
  if (landOnPlatform(run, fromY)) return;
  if (run.y < level.pitY) startScoop(run);
}

function touchPads(run: Run): void {
  if (run.padLock > 0 || run.vy > 0) return;
  const { pads } = run.level;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i]!;
    if (Math.abs(run.x - pad.x) > PAD_REACH) continue;
    if (run.y < pad.y - 4 || run.y > pad.y + PAD_HEIGHT) continue;
    launchAt(run, SPRING_SPEED, run.level.physics);
    run.skim = 0;
    run.on = IN_AIR;
    run.jumps = 1;
    run.coyote = 0;
    run.spin = 0;
    run.padLock = PAD_LOCK_SECONDS;
    run.padAge[i] = 0;
    run.events.push({ type: 'spring', x: pad.x, y: pad.y });
    return;
  }
}

function touchJellies(run: Run): void {
  const { jellies } = run.level;
  for (let i = 0; i < jellies.length; i++) {
    const jelly = jellies[i]!;
    const x = jellyX(jelly, run.time);
    if (Math.abs(run.x - x) > (JELLY_WIDTH + RUNNER_WIDTH) / 2) continue;
    const top = jellyTop(jelly);
    if (run.y > top || run.y + RUNNER_HEIGHT < jelly.y) continue;
    if (run.vy < 0 && run.y > top - JELLY_HEIGHT * 0.65) {
      launchAt(run, STOMP_SPEED, run.level.physics);
      run.skim = 0;
      run.on = IN_AIR;
      run.jumps = 1;
      run.spin = 0;
      run.y = top;
      run.squish[i] = SQUISH_SECONDS;
      run.jellyBounces++;
      run.score += SCORE.jelly;
      run.events.push({ type: 'jelly', x, y: top, index: i });
      return;
    }
    if (run.safe > 0) continue;
    run.tumble = TUMBLE_SECONDS;
    run.safe = TUMBLE_SAFE;
    run.speed *= TUMBLE_SPEED;
    run.squish[i] = SQUISH_SECONDS;
    run.tumbles++;
    run.events.push({ type: 'tumble', x: run.x, y: run.y });
    return;
  }
}

function collect(run: Run): void {
  const { items, tuning } = run.level;
  const reach = run.rocketTo === null ? tuning.reach : tuning.reach * 1.5;
  const middle = run.y + RUNNER_HEIGHT / 2;
  while (run.firstItem < items.length && items[run.firstItem]!.x < run.x - reach) run.firstItem++;
  for (let i = run.firstItem; i < items.length; i++) {
    const item = items[i]!;
    if (item.x > run.x + reach) break;
    if (run.got[i] || Math.hypot(item.x - run.x, item.y - middle) > reach) continue;
    run.got[i] = 1;
    if (!item.extra) run.collected++;
    run.score += SCORE[item.kind];
    if (item.kind === 'chest') run.foundTreasure = true;
    if (item.kind === 'boots') startRocket(run, item.x);
    run.events.push({ type: 'item', x: item.x, y: item.y, index: i });
  }
}

function startRocket(run: Run, x: number): void {
  const to = run.level.rocketTo.find((end) => end > x);
  if (to === undefined) return;
  run.rocketTo = to;
  run.on = IN_AIR;
  run.vy = 0;
  run.skim = 0;
  run.jumps = 1;
  run.tumble = 0;
  run.events.push({ type: 'rocket', x: run.x, y: run.y });
}

function stepRocket(run: Run): void {
  run.x += run.speed * STEP;
  const rail = railHeight(run.level, run.x, RAIL_HEIGHT);
  run.y += (rail - run.y) * (1 - Math.exp(-ROCKET_RISE * STEP));
  if (run.rocketTo !== null && run.x >= run.rocketTo) {
    run.rocketTo = null;
    run.safe = DROP_SAFE;
    run.events.push({ type: 'rocketEnd', x: run.x, y: run.y });
  }
}

function stepScoop(run: Run, scoop: Scoop): void {
  scoop.age += STEP;
  if (scoop.age < SCOOP_SWOOP) return;
  const share = Math.min(1, (scoop.age - SCOOP_SWOOP) / SCOOP_CARRY);
  const smooth = share * share * (3 - 2 * share);
  run.x = scoop.fromX + (scoop.toX - scoop.fromX) * smooth;
  run.y = scoop.fromY + (scoop.toY - scoop.fromY) * smooth + Math.sin(share * Math.PI) * SCOOP_LIFT;
  if (share < 1) return;
  run.scoop = null;
  run.on = IN_AIR;
  run.vy = 0;
  run.jumps = 0;
  run.safe = DROP_SAFE;
  run.speed = speedAt(run.level, run.x) * 0.6;
  run.events.push({ type: 'drop', x: run.x, y: run.y });
}

function stepRunning(run: Run): void {
  const fromX = run.x;
  const fromY = run.y;
  if (run.on >= 0) {
    const platform = run.level.platforms[run.on]!;
    run.x += platformX(platform, run.time) - platformX(platform, run.time - STEP);
  }
  run.x += run.speed * STEP;
  if (run.on !== IN_AIR) followSurface(run);
  if (run.on === IN_AIR) flyAndLand(run, fromX, fromY);
}

function countDown(run: Run): void {
  run.buffer = Math.max(0, run.buffer - STEP);
  run.coyote = Math.max(0, run.coyote - STEP);
  run.tumble = Math.max(0, run.tumble - STEP);
  run.safe = Math.max(0, run.safe - STEP);
  run.padLock = Math.max(0, run.padLock - STEP);
  run.spin = Math.max(0, run.spin - STEP);
  for (let i = 0; i < run.squish.length; i++) run.squish[i] = Math.max(0, run.squish[i]! - STEP);
  for (let i = 0; i < run.padAge.length; i++) run.padAge[i]! += STEP;
}

function checkEnd(run: Run): void {
  const { level } = run;
  if (!run.flagged && run.x >= level.flagX) {
    run.flagged = true;
    run.events.push({ type: 'flag', x: run.x, y: run.y });
  }
  if (!run.finished && run.x >= level.endX) {
    run.finished = true;
    run.events.push({ type: 'finish', x: run.x, y: run.y });
  }
}

/** Moves the whole game on by exactly one step. */
export function step(run: Run): void {
  run.time += STEP;
  countDown(run);
  if (run.pressed) {
    run.pressed = false;
    if (!run.finished) run.buffer = run.level.tuning.buffer;
  }
  ease(run);
  if (run.scoop) {
    stepScoop(run, run.scoop);
    return;
  }
  if (run.rocketTo !== null) {
    stepRocket(run);
    collect(run);
    checkEnd(run);
    return;
  }
  if (run.level.tuning.assist) assist(run);
  tryJump(run);
  stepRunning(run);
  if (!run.scoop) {
    touchPads(run);
    touchJellies(run);
    collect(run);
    checkEnd(run);
  }
}

/** Plays forward by however much real time passed. Any frame rate gives the same game. */
export function advance(run: Run, seconds: number): RunEvent[] {
  run.events.length = 0;
  run.carry += seconds;
  while (run.carry >= STEP) {
    run.carry -= STEP;
    step(run);
  }
  return run.events;
}
