import { dangerHits, stepDanger, type Danger, type Kind } from './dangers.ts';
import { ARENA_RADIUS, LEAP_BOOST, LEAP_SECONDS, PLAYER_RADIUS, PLAYER_SPEED } from './tuning.ts';
import { leapHeight, moveToward, newRun, pressLeap, stepRun, STANDING, type Input, type Mode, type Run } from './run.ts';
import type { Stage } from './stages.ts';

/**
 * Three players the difficulty is proved with. They see what a person sees and
 * nothing more: the same small picture e2e/bots.mjs reads from the real game.
 * Not imported by the game itself.
 */
const LOOK_AHEAD = 2.1;
const LOOK_STEP = 1 / 30;
/** Keeps a jumpable danger out of the sums for now, because the leap is ready for when it arrives. */
const LEAP_LATER_AFTER = 0.3;
/** Plays safe about a leap's height, so a bot never lands a moment too early. */
const HEIGHT_CAUTION = 0.72;
const LOW_KINDS: readonly Kind[] = ['ring', 'beam'];
const DIRECTIONS = 16;
const SAFETY = 0.55;
/** A beam's far end moves further than this between looks, so it must not slip through the sums. */
const FAST_TIP = 0.5;
const CIRCLE_RADIUS = 7;
const CIRCLE_SPEED = 0.95;
const LEAP_COST = 20;
const CHANGE_COST = 0.6;
const EDGE_COST = 2.2;
const TREAT_REACH = 8;
const TREAT_PULL = 1;

export interface Sight {
  x: number;
  z: number;
  /** Seconds into a leap, or 0. */
  air: number;
  ready: boolean;
  dangers: readonly Danger[];
  pickups: readonly { x: number; z: number }[];
}

export interface Choice {
  /** Direction to run, or 0,0 to stand. */
  moveX: number;
  moveZ: number;
  leap: boolean;
}

interface Option extends Choice {
  cost: number;
}

/** Where every danger except slime will be at each look-ahead step. Slime goes wherever we go, so each option plays it out itself. */
function foresee(sight: Sight): Danger[][] {
  const moving = sight.dangers.filter(({ kind }) => kind !== 'slime').map((danger) => ({ ...danger }));
  const frames: Danger[][] = [];
  const steps = Math.round(LOOK_AHEAD / LOOK_STEP);
  for (let step = 0; step < steps; step += 1) {
    for (const danger of moving) stepDanger(danger, LOOK_STEP, sight);
    frames.push(moving.map((danger) => ({ ...danger })));
  }
  return frames;
}

function costOf(sight: Sight, frames: readonly Danger[][], option: Choice): number {
  let x = sight.x;
  let z = sight.z;
  let air = sight.air || (option.leap ? 0.001 : 0);
  let cost = option.leap ? LEAP_COST : 0;
  const slimes = sight.dangers.filter(({ kind }) => kind === 'slime').map((danger) => ({ ...danger }));
  const canLeapLater = sight.ready && !option.leap;
  for (const [step, frame] of frames.entries()) {
    const flying = air > 0;
    const speed = flying ? PLAYER_SPEED * LEAP_BOOST : PLAYER_SPEED;
    x += option.moveX * speed * LOOK_STEP;
    z += option.moveZ * speed * LOOK_STEP;
    const out = Math.hypot(x, z);
    if (out > ARENA_RADIUS - PLAYER_RADIUS) {
      x *= (ARENA_RADIUS - PLAYER_RADIUS) / out;
      z *= (ARENA_RADIUS - PLAYER_RADIUS) / out;
    }
    if (flying) air = air + LOOK_STEP >= LEAP_SECONDS ? 0 : air + LOOK_STEP;
    const height = leapHeight(air) * HEIGHT_CAUTION;
    const soon = 1 - step / frames.length;
    const leapLater = canLeapLater && step * LOOK_STEP > LEAP_LATER_AFTER;
    for (const slime of slimes) {
      stepDanger(slime, LOOK_STEP, { x, z });
      if (dangerHits(slime, x, z, height)) cost += 100 * (0.3 + soon);
      else if (dangerHits(slime, x, z, height, PLAYER_RADIUS + SAFETY)) cost += 12 * (0.2 + soon);
    }
    for (const danger of frame) {
      if (leapLater && LOW_KINDS.includes(danger.kind)) continue;
      const reach = danger.kind === 'beam' ? PLAYER_RADIUS + FAST_TIP : PLAYER_RADIUS;
      if (dangerHits(danger, x, z, height, reach)) cost += 100 * (0.3 + soon);
      else if (dangerHits(danger, x, z, height, reach + SAFETY)) cost += 12 * (0.2 + soon);
    }
  }
  const edge = Math.hypot(x, z) / ARENA_RADIUS;
  const treat = Math.min(...sight.pickups.map((pickup) => Math.hypot(pickup.x - x, pickup.z - z)), TREAT_REACH);
  return cost + edge * edge * EDGE_COST * 4 + treat * TREAT_PULL;
}

const apart = (a: Choice, b: { moveX: number; moveZ: number }): number => Math.hypot(a.moveX - b.moveX, a.moveZ - b.moveZ);

/** Tries running every way, with and without a leap, and takes the safest. */
export function skilledChoice(sight: Sight, last: { moveX: number; moveZ: number } = STANDING): Choice {
  const frames = foresee(sight);
  const options: Choice[] = [{ moveX: 0, moveZ: 0, leap: false }];
  for (let turn = 0; turn < DIRECTIONS; turn += 1) {
    const angle = (turn / DIRECTIONS) * Math.PI * 2;
    options.push({ moveX: Math.cos(angle), moveZ: Math.sin(angle), leap: false });
  }
  if (sight.ready) {
    for (const option of options.slice()) options.push({ ...option, leap: true });
  }
  let best: Option = { moveX: 0, moveZ: 0, leap: false, cost: Infinity };
  for (const option of options) {
    const cost = costOf(sight, frames, option) + apart(option, last) * CHANGE_COST;
    if (cost < best.cost) best = { ...option, cost };
  }
  return best;
}

/** Runs round and round without ever looking. */
export function carelessMove(seconds: number, player: { x: number; z: number }): Input {
  const angle = seconds * CIRCLE_SPEED;
  return moveToward(player, Math.cos(angle) * CIRCLE_RADIUS, Math.sin(angle) * CIRCLE_RADIUS);
}

export type BotName = 'skilled' | 'careless' | 'idle';

function sightOf(run: Run): Sight {
  const { player } = run;
  return { x: player.x, z: player.z, air: player.air, ready: player.recharge <= 0 && player.air === 0, dangers: run.dangers, pickups: run.pickups };
}

export interface BotResult {
  survived: number;
  phase: Run['phase'];
  hits: number;
}

const THINK_SECONDS = 0.05;

/** Plays one run in simulation. It decides on a beat, as the real bot does, not every step. */
export function playBot(name: BotName, mode: Mode, stage: Stage | null, seed: number, limit = 900): BotResult {
  const run = newRun(mode, stage, seed);
  let input: Input = STANDING;
  while (run.phase === 'play' && run.clock < limit) {
    if (name === 'skilled') {
      const choice = skilledChoice(sightOf(run), input);
      input = { moveX: choice.moveX, moveZ: choice.moveZ };
      if (choice.leap) pressLeap(run);
    } else if (name === 'careless') {
      input = carelessMove(run.clock, run.player);
    }
    stepRun(run, input, THINK_SECONDS);
    run.events.length = 0;
  }
  return { survived: run.clock, phase: run.phase, hits: run.hits };
}
