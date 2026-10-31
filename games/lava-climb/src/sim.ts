import { cell, lavaAt, moverAt, rockAt, ROCK_SIZE, type Level } from './level.ts';
import { BELT_LEFT, BELT_RIGHT, CRUMBLE, GRIP, ICE, PAD, SPIKE_DOWN, SPIKE_LEFT, SPIKE_RIGHT, SPIKE_UP, isSolid, isSpike, isSurface } from './tiles.ts';
import { COLS, DT, HERO_H, HERO_W, RULES, TILE, type Rules } from './tuning.ts';

export interface Input {
  dir: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
}

export const NO_INPUT: Input = { dir: 0, jump: false, dash: false };

export type Phase = 'ready' | 'climbing' | 'singed' | 'won';
export type Cause = 'lava' | 'spike' | 'rock';

export const FX_JUMP = 1;
export const FX_WALL = 2;
export const FX_DASH = 4;
export const FX_LAND = 8;
export const FX_BOUNCE = 16;
export const FX_GEM = 32;
export const FX_SECRET = 64;
export const FX_CRUMBLE = 128;

/** One try at a level. Plain numbers only, so a copy is a true copy. */
export interface Run {
  phase: Phase;
  cause: Cause | null;
  tick: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  ground: boolean;
  onIce: boolean;
  belt: number;
  mover: number;
  coyote: number;
  buffer: number;
  dashBuffer: number;
  jumpWas: boolean;
  dashWas: boolean;
  rising: boolean;
  /** The side of a grip wall in reach, and how long a kick from it still counts after leaving. */
  wall: -1 | 0 | 1;
  wallGrace: number;
  graceSide: -1 | 0 | 1;
  sliding: boolean;
  /** You can't kick off the same wall twice in a row, which keeps tower walls from being ladders. */
  lastWall: -1 | 0 | 1;
  lock: number;
  dashLeft: number;
  dashDir: 1 | -1;
  dashReady: boolean;
  /** For each crumbling tile, the tick it was stepped on, or 0. */
  crumbled: number[];
  gems: number;
  secret: boolean;
  /** Tick by tick, a bit for each thing that happened. */
  fx: number;
  /** Planner only. A landing or a near miss this close to the edge is not a route worth trusting. */
  risky: boolean;
}

export function newRun(level: Level): Run {
  return {
    phase: 'ready',
    cause: null,
    tick: 0,
    x: level.start.x,
    y: level.start.y,
    vx: 0,
    vy: 0,
    facing: 1,
    ground: true,
    onIce: false,
    belt: 0,
    mover: -1,
    coyote: 0,
    buffer: 0,
    dashBuffer: 0,
    jumpWas: false,
    dashWas: false,
    rising: false,
    wall: 0,
    wallGrace: 0,
    graceSide: 0,
    sliding: false,
    lastWall: 0,
    lock: 0,
    dashLeft: 0,
    dashDir: 1,
    dashReady: true,
    crumbled: new Array<number>(level.crumbleCount).fill(0),
    gems: 0,
    secret: false,
    fx: 0,
    risky: false,
  };
}

export const copyRun = (run: Run): Run => ({ ...run, crumbled: run.crumbled.slice() });

function crumbleGone(run: Run, index: number, rules: Rules): boolean {
  const stepped = run.crumbled[index]!;
  if (stepped === 0) return false;
  const age = run.tick - stepped;
  return age >= rules.crumbleHold && age < rules.crumbleHold + rules.crumbleBack;
}

function surfaceAt(level: Level, run: Run, col: number, row: number, rules: Rules): boolean {
  const tile = cell(level, col, row);
  if (!isSurface(tile)) return false;
  if (tile !== CRUMBLE) return true;
  return !crumbleGone(run, level.crumbleIndex[row * COLS + col]!, rules);
}

const approach = (value: number, target: number, step: number): number => (value < target ? Math.min(value + step, target) : Math.max(value - step, target));

function steerSideways(run: Run, input: Input, rules: Rules): void {
  if (run.dashLeft > 0) {
    run.dashLeft -= 1;
    run.vx = rules.dashSpeed * run.dashDir;
    run.vy = 0;
    if (run.dashLeft === 0) run.vx = rules.run * run.dashDir;
    return;
  }
  if (run.lock > 0) {
    run.lock -= 1;
    return;
  }
  const target = input.dir * rules.run;
  const grip = run.ground && run.onIce ? (input.dir === 0 ? rules.iceBrake : rules.iceAccel) : run.ground ? (input.dir === 0 ? rules.groundBrake : rules.groundAccel) : rules.airAccel;
  run.vx = approach(run.vx, target, grip * DT);
}

function tryJump(level: Level, run: Run, rules: Rules): void {
  if (run.buffer === 0) return;
  if (run.ground || run.coyote > 0) {
    run.vy = -rules.jump;
    run.ground = false;
    run.mover = -1;
    run.coyote = 0;
    run.buffer = 0;
    run.rising = true;
    run.fx |= FX_JUMP;
    return;
  }
  const side = run.wall !== 0 ? run.wall : run.wallGrace > 0 ? run.graceSide : 0;
  if (!level.walls || side === 0 || side === run.lastWall) return;
  run.vx = -side * rules.wallKickX;
  run.vy = -rules.wallKickY;
  run.lock = rules.wallLock;
  run.lastWall = side;
  run.facing = side === 1 ? -1 : 1;
  run.wallGrace = 0;
  run.buffer = 0;
  run.rising = true;
  run.dashReady = true;
  run.dashLeft = 0;
  run.fx |= FX_WALL;
}

function fall(run: Run, input: Input, rules: Rules): void {
  run.sliding = false;
  if (run.dashLeft > 0) return;
  const hang = input.jump && Math.abs(run.vy) < rules.hangSpeed ? rules.hangScale : 1;
  run.vy = Math.min(run.vy + (run.vy < 0 ? rules.gravityUp : rules.gravityDown) * hang * DT, rules.maxFall);
  if (run.wall !== 0 && run.vy > 0 && input.dir === run.wall && run.wall !== run.lastWall) {
    run.vy = Math.min(run.vy, rules.wallSlide);
    run.sliding = true;
  }
}

function rideMover(level: Level, run: Run): void {
  const mover = level.movers[run.mover];
  if (!mover) return;
  const was = moverAt(mover, run.tick - 1);
  const now = moverAt(mover, run.tick);
  moveSideways(level, run, now.x - was.x);
  run.y += now.y - was.y;
}

function moveSideways(level: Level, run: Run, by: number): void {
  if (by === 0) return;
  const next = run.x + by;
  const col = Math.floor((by > 0 ? next + HERO_W : next) / TILE);
  const top = Math.floor(run.y / TILE);
  const bottom = Math.floor((run.y + HERO_H - 0.01) / TILE);
  for (let row = top; row <= bottom; row += 1) {
    if (!isSolid(cell(level, col, row))) continue;
    run.x = by > 0 ? col * TILE - HERO_W : (col + 1) * TILE;
    if (run.dashLeft > 0) run.dashLeft = 0;
    run.vx = 0;
    return;
  }
  run.x = next;
}

const solidAbove = (level: Level, x: number, row: number): boolean => {
  for (let col = Math.floor(x / TILE); col <= Math.floor((x + HERO_W - 0.01) / TILE); col += 1) {
    if (isSolid(cell(level, col, row))) return true;
  }
  return false;
};

function moveUp(level: Level, run: Run, next: number, rules: Rules): void {
  const row = Math.floor(next / TILE);
  if (!solidAbove(level, run.x, row)) {
    run.y = next;
    return;
  }
  for (const nudge of [rules.cornerNudge, -rules.cornerNudge]) {
    if (!solidAbove(level, run.x + nudge, row) && !solidAbove(level, run.x + nudge, Math.floor(run.y / TILE))) {
      run.x += nudge > 0 ? Math.min(1.5, nudge) : Math.max(-1.5, nudge);
      run.y = next;
      return;
    }
  }
  run.y = (row + 1) * TILE;
  run.vy = 0;
  run.rising = false;
}

/** The planner refuses a landing on the last few units of a ledge, or a miss by that little. */
function edgeIsClose(level: Level, run: Run, row: number, rules: Rules): boolean {
  const pad = rules.feetPad;
  let overlap = 0;
  let near = false;
  for (let col = Math.floor((run.x - pad) / TILE); col <= Math.floor((run.x + HERO_W + pad) / TILE); col += 1) {
    if (!surfaceAt(level, run, col, row, rules)) continue;
    const left = col * TILE;
    overlap += Math.max(0, Math.min(left + TILE, run.x + HERO_W) - Math.max(left, run.x));
    near = true;
  }
  return near && overlap < pad;
}

function landOnTiles(level: Level, run: Run, next: number, rules: Rules): boolean {
  const before = run.y + HERO_H;
  const after = next + HERO_H;
  const row = Math.floor(after / TILE);
  const top = row * TILE;
  if (before > top + 0.01) return false;
  if (rules.feetPad > 0 && !run.ground && edgeIsClose(level, run, row, rules)) run.risky = true;
  let landed = false;
  let best = 0;
  for (let col = Math.floor(run.x / TILE); col <= Math.floor((run.x + HERO_W - 0.01) / TILE); col += 1) {
    if (!surfaceAt(level, run, col, row, rules)) continue;
    landed = true;
    const tile = cell(level, col, row);
    best = Math.max(best, tile);
    if (tile === CRUMBLE) stepOnCrumble(level, run, row * COLS + col);
  }
  if (!landed) return false;
  run.y = top - HERO_H;
  settle(run, best, rules);
  return true;
}

function stepOnCrumble(level: Level, run: Run, at: number): void {
  const index = level.crumbleIndex[at]!;
  const stepped = run.crumbled[index]!;
  if (stepped === 0) {
    run.crumbled[index] = run.tick;
    run.fx |= FX_CRUMBLE;
  }
}

function settle(run: Run, tile: number, rules: Rules): void {
  if (!run.ground && run.vy > 60) run.fx |= FX_LAND;
  run.ground = true;
  run.vy = 0;
  run.rising = false;
  run.onIce = tile === ICE;
  run.belt = tile === BELT_LEFT ? -rules.beltSpeed : tile === BELT_RIGHT ? rules.beltSpeed : 0;
  if (tile === PAD) {
    run.ground = false;
    run.vy = -rules.bounce;
    run.dashReady = true;
    run.lastWall = 0;
    run.fx |= FX_BOUNCE;
  }
}

function landOnMover(level: Level, run: Run, next: number, riding: number, rules: Rules): boolean {
  const feet = next + HERO_H;
  for (let index = 0; index < level.movers.length; index += 1) {
    const mover = level.movers[index]!;
    const now = moverAt(mover, run.tick);
    const pad = rules.feetPad;
    const overlap = Math.min(now.x + mover.w, run.x + HERO_W) - Math.max(now.x, run.x);
    if (overlap <= -pad - 0.01 || run.y + HERO_H > now.y + 4 || feet < now.y) continue;
    if (pad > 0 && riding !== index && overlap < pad) run.risky = true;
    if (overlap <= 0) continue;
    run.y = now.y - HERO_H;
    settle(run, 0, rules);
    run.mover = index;
    return true;
  }
  return false;
}

function moveVertically(level: Level, run: Run, rules: Rules): void {
  const next = run.y + run.vy * DT;
  const riding = run.mover;
  const wasGround = run.ground;
  run.mover = -1;
  if (run.vy < 0) {
    run.ground = false;
    moveUp(level, run, next, rules);
    return;
  }
  if (!landOnMover(level, run, next, riding, rules) && !landOnTiles(level, run, next, rules)) {
    run.y = next;
    run.ground = false;
    run.onIce = false;
    run.belt = 0;
    if (wasGround) run.coyote = rules.coyote;
  }
  if (run.ground) {
    run.dashReady = true;
    run.lastWall = 0;
  }
}

function touchWalls(level: Level, run: Run, rules: Rules): void {
  run.wall = 0;
  if (run.ground) {
    run.wallGrace = 0;
    return;
  }
  const row = Math.floor((run.y + HERO_H / 2) / TILE);
  const leftCol = Math.floor((run.x - 1.5) / TILE);
  const rightCol = Math.floor((run.x + HERO_W + 1.5) / TILE);
  if (cell(level, leftCol, row) === GRIP) run.wall = -1;
  else if (cell(level, rightCol, row) === GRIP) run.wall = 1;
  if (run.wall !== 0 && level.walls) {
    if (run.lastWall !== 0 && run.wall !== run.lastWall) run.lastWall = 0;
    if (run.wall !== run.lastWall) {
      run.wallGrace = rules.wallGrace;
      run.graceSide = run.wall;
      run.dashReady = true;
    }
  } else if (run.wallGrace > 0) run.wallGrace -= 1;
}

const overlaps = (run: Run, x: number, y: number, w: number, h: number, pad: number): boolean =>
  run.x < x + w + pad && run.x + HERO_W > x - pad && run.y < y + h + pad && run.y + HERO_H > y - pad;

function spikeBox(tile: number, inset: number): { x: number; y: number; w: number; h: number } {
  if (tile === SPIKE_UP) return { x: inset, y: inset + 2, w: TILE - 2 * inset, h: TILE - inset - 2 };
  if (tile === SPIKE_DOWN) return { x: inset, y: 0, w: TILE - 2 * inset, h: TILE - inset - 2 };
  if (tile === SPIKE_RIGHT) return { x: 0, y: inset, w: TILE - inset - 2, h: TILE - 2 * inset };
  if (tile === SPIKE_LEFT) return { x: inset + 2, y: inset, w: TILE - inset - 2, h: TILE - 2 * inset };
  return { x: 0, y: 0, w: 0, h: 0 };
}

function hitSpike(level: Level, run: Run, rules: Rules): boolean {
  const pad = rules.hazardPad;
  for (let row = Math.floor((run.y - pad) / TILE); row <= Math.floor((run.y + HERO_H + pad) / TILE); row += 1) {
    for (let col = Math.floor((run.x - pad) / TILE); col <= Math.floor((run.x + HERO_W + pad) / TILE); col += 1) {
      const tile = cell(level, col, row);
      if (!isSpike(tile)) continue;
      const box = spikeBox(tile, rules.spikeInset);
      if (overlaps(run, col * TILE + box.x, row * TILE + box.y, box.w, box.h, pad)) return true;
    }
  }
  return false;
}

function hitRock(level: Level, run: Run, rules: Rules): boolean {
  for (const dropper of level.droppers) {
    const rock = rockAt(dropper, run.tick);
    if (rock.falling && overlaps(run, dropper.x + 1, rock.y + 1, ROCK_SIZE - 2, ROCK_SIZE - 2, rules.hazardPad)) return true;
  }
  return false;
}

function singe(run: Run, cause: Cause): void {
  run.phase = 'singed';
  run.cause = cause;
  run.vx = 0;
  run.vy = 0;
}

function collect(level: Level, run: Run): void {
  level.gems.forEach((gem, index) => {
    if (run.gems & (1 << index)) return;
    if (!overlaps(run, gem.x - 7, gem.y - 7, 14, 14, 2)) return;
    run.gems |= 1 << index;
    run.fx |= gem.secret ? FX_SECRET : FX_GEM;
    if (gem.secret) run.secret = true;
  });
}

function checkEnds(level: Level, run: Run, rules: Rules): void {
  const { exit } = level;
  if (hitSpike(level, run, rules)) singe(run, 'spike');
  else if (hitRock(level, run, rules)) singe(run, 'rock');
  else if (run.y + HERO_H + rules.lavaPad > lavaAt(level, run.tick) + rules.lavaDip) singe(run, 'lava');
  else if (overlaps(run, exit.x, exit.y, exit.w, exit.h, 0)) run.phase = 'won';
}

function readButtons(run: Run, input: Input, rules: Rules): void {
  if (input.jump && !run.jumpWas) run.buffer = rules.buffer;
  else if (run.buffer > 0) run.buffer -= 1;
  if (input.dash && !run.dashWas) run.dashBuffer = rules.buffer;
  else if (run.dashBuffer > 0) run.dashBuffer -= 1;
  run.jumpWas = input.jump;
  run.dashWas = input.dash;
  if (input.dir !== 0 && run.lock === 0) run.facing = input.dir;
}

function cutJump(run: Run, input: Input, rules: Rules): void {
  if (input.jump || !run.rising) return;
  run.rising = false;
  if (run.vy < 0) run.vy *= rules.cut;
}

function startDash(level: Level, run: Run, input: Input, rules: Rules): void {
  if (!level.dash || run.dashBuffer === 0 || run.ground || run.coyote > 0 || !run.dashReady || run.dashLeft > 0) return;
  run.dashBuffer = 0;
  run.dashReady = false;
  run.dashLeft = rules.dashTicks;
  run.dashDir = input.dir !== 0 ? input.dir : run.facing;
  run.facing = run.dashDir;
  run.lock = 0;
  run.vy = 0;
  run.rising = false;
  run.fx |= FX_DASH;
}

/** Plays one tick. The whole game is this function called 120 times a second, on any screen. */
export function step(level: Level, run: Run, input: Input, rules: Rules = RULES): void {
  run.fx = 0;
  if (run.phase === 'ready') {
    if (input.dir === 0 && !input.jump && !input.dash) return;
    run.phase = 'climbing';
  }
  if (run.phase !== 'climbing') return;
  run.tick += 1;
  readButtons(run, input, rules);
  cutJump(run, input, rules);
  if (run.coyote > 0 && !run.ground) run.coyote -= 1;
  rideMover(level, run);
  tryJump(level, run, rules);
  startDash(level, run, input, rules);
  steerSideways(run, input, rules);
  fall(run, input, rules);
  moveSideways(level, run, (run.vx + (run.ground ? run.belt : 0)) * DT);
  moveVertically(level, run, rules);
  touchWalls(level, run, rules);
  collect(level, run);
  checkEnds(level, run, rules);
}
