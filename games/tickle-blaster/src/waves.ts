import type { KindId } from './kinds.ts';
import { levelById, SPEEDS, type LevelId, type PatternId, type SpeedId } from './levels.ts';

export type Rng = () => number;

/** A place on the screen: 0 to 1 across and 0 to 1 down, so patterns fit any screen. */
export interface Point {
  u: number;
  v: number;
}

export interface Spawn {
  at: number;
  pattern: PatternId;
  slot: number;
  side: 1 | -1;
  seconds: number;
  kind: KindId;
  tickles: number;
  /** The part of the screen this wave keeps to, so a parked ship only meets some of them. */
  center: number;
  width: number;
  /** Moments along its path to drop a goo bubble. */
  goo: number[];
}

export interface Surprises {
  golden: number | null;
  cat: number | null;
  sneeze: boolean;
}

export const WAVES = 9;
const FIRST_WAVE = 1.2;
const WAVE_GAP = 4.6;
const PATH_SECONDS = 6.4;
const BASE_COUNT = 6;
const GROWTH = 5;
const CHAIN_GAP = 0.42;
/** Aliens never fly lower than this, so the ship's space stays free. */
export const LOWEST = 0.72;
const OFF = -0.14;
const LANE_WIDTH = 0.42;
const LANE_SIDES = [0.22, 0.78];
const LANE_JITTER = 0.04;
/** A side wave stays this far from the middle of the screen, whatever its path, so a parked ship can't reach it. */
const LANE_CLEARANCE = 0.14;

const GOLDEN_CHANCE = 0.3;
const CAT_CHANCE = 0.25;
const SNEEZE_CHANCE = 0.4;
const SURPRISE_FROM = 11;
const SURPRISE_SPAN = 30;
const GOLDEN_SECONDS = 3.2;
const SNEEZE_SECONDS = 3.4;

const TAU = Math.PI * 2;

/** Rises smoothly from 0 to 1 in the first fifth, stays, and falls back in the last fifth. */
function plateau(p: number): number {
  const edge = Math.min(1, Math.min(p, 1 - p) / 0.2);
  return edge * edge * (3 - 2 * edge);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function keepToSide(u: number, center: number): number {
  if (center < 0.5) return Math.min(u, 0.5 - LANE_CLEARANCE);
  return center > 0.5 ? Math.max(u, 0.5 + LANE_CLEARANCE) : u;
}

/**
 * Writes a point along a path. `p` runs from 0 to 1, and `side` mirrors it left to right.
 * `center` and `width` squeeze the whole path into one part of the screen.
 */
export function pathPoint(pattern: PatternId, p: number, slot: number, side: 1 | -1, out: Point, center = 0.5, width = 1): void {
  let u = 0.5;
  let v = 0;
  const hold = plateau(p);
  switch (pattern) {
    case 'swoop':
      u = -0.14 + 1.28 * p;
      v = OFF + 0.76 * Math.sin(Math.PI * p) + 0.05 * Math.sin(3 * Math.PI * p);
      break;
    case 'zigzag':
      u = 0.5 + 0.4 * Math.sin(p * TAU * 2) * hold;
      v = OFF + 0.8 * Math.sin(Math.PI * p);
      break;
    case 'vee': {
      const tip = Math.abs(slot - 0.5);
      u = 0.5 + (slot - 0.5) * 0.76 + 0.07 * Math.sin(p * TAU * 1.5) * hold;
      v = OFF - tip * 0.3 + hold * 0.62;
      break;
    }
    case 'curtain': {
      const row = slot < 0.5 ? 0 : 1;
      const across = row === 0 ? slot * 2 : (slot - 0.5) * 2;
      u = 0.5 + (across - 0.5) * 0.7 + 0.1 * Math.sin(p * TAU * 1.5 + row * Math.PI) * hold;
      v = OFF - row * 0.1 + hold * (0.5 + row * 0.14);
      break;
    }
    case 'ring': {
      const angle = slot * TAU + p * TAU * 1.5;
      u = mix(0.5, 0.5 + 0.34 * Math.cos(angle), hold);
      v = mix(OFF, 0.32 + 0.22 * Math.sin(angle), hold);
      break;
    }
    case 'dive':
      u = -0.14 + 1.28 * p + 0.12 * Math.sin(p * TAU * 2) * hold;
      v = OFF + 0.84 * Math.sin(Math.PI * p) ** 2;
      break;
    case 'figure8': {
      const turn = p * TAU * 1.5 + slot;
      u = mix(0.5, 0.5 + 0.38 * Math.sin(turn), hold);
      v = mix(OFF, 0.34 + 0.2 * Math.sin(turn * 2), hold);
      break;
    }
    case 'spiral': {
      const radius = 0.34 * Math.sin(Math.PI * p);
      const angle = p * TAU * 2 + slot * TAU;
      u = 0.5 + radius * Math.cos(angle);
      v = mix(OFF, 0.34, hold) + radius * 0.7 * Math.sin(angle);
      break;
    }
    case 'zip':
      u = -0.14 + 1.28 * p;
      v = 0.22 + 0.1 * Math.sin(p * TAU * 3);
      break;
    case 'sneeze':
      u = 0.5 + (slot - 0.5) * 1.5 * Math.sqrt(p);
      v = 0.3 + 0.32 * Math.sin(Math.PI * Math.min(1, p * 1.4)) - 0.5 * p * p;
      break;
  }
  const across = center + ((side > 0 ? u : 1 - u) - 0.5) * width;
  out.u = keepToSide(across, center);
  out.v = v;
}

/** Whether a pattern is a chain, one after another, or a formation that arrives together. */
function chained(pattern: PatternId): boolean {
  return pattern === 'swoop' || pattern === 'dive' || pattern === 'zigzag';
}

function kindFor(waveIndex: number, kinds: readonly [KindId, KindId]): KindId {
  return kinds[waveIndex % 2];
}

export function waveTime(index: number): number {
  return FIRST_WAVE + index * WAVE_GAP;
}

/**
 * The first wave comes down the middle, so a child tickles someone straight away.
 * After that waves take turns on the left and right, and the ship has to go to them.
 */
function laneFor(index: number, firstSide: number, rng: Rng): number {
  if (index === 0) return 0.5;
  return LANE_SIDES[(index + firstSide) % 2] + (rng() - 0.5) * LANE_JITTER;
}

function waveSpawns(levelId: LevelId, speedId: SpeedId, index: number, side: 1 | -1, center: number, extra: number, rng: Rng): Spawn[] {
  const level = levelById(levelId);
  const speed = SPEEDS[speedId];
  const excitement = index / (WAVES - 1);
  const pattern = level.patterns[index];
  const count = Math.round((BASE_COUNT + GROWTH * excitement) * speed.crowd) - extra;
  const seconds = PATH_SECONDS / (speed.pace * (1 + 0.3 * excitement));
  const start = waveTime(index);
  const spawns: Spawn[] = [];
  for (let i = 0; i < count; i++) {
    const silly = rng() < speed.silly;
    const tough = index >= 4 && rng() < speed.tough;
    const goo = [0.3 + rng() * 0.2];
    if (speedId === 'wild' && rng() < 0.5) goo.push(0.55 + rng() * 0.15);
    spawns.push({
      at: start + (chained(pattern) ? (i * CHAIN_GAP) / speed.pace : 0),
      pattern,
      slot: count === 1 ? 0.5 : i / (count - 1),
      side,
      seconds,
      kind: silly ? 'goober' : kindFor(index + (i % 3 === 2 ? 1 : 0), level.kinds),
      tickles: tough ? 2 : 1,
      center,
      width: LANE_WIDTH,
      goo: silly ? goo : [],
    });
  }
  return spawns;
}

/** Every alien a level sends, in time order. Waves grow busier and quicker toward the boss. */
export function planWaves(levelId: LevelId, speedId: SpeedId, rng: Rng): Spawn[] {
  const spawns: Spawn[] = [];
  const firstSide = rng() < 0.5 ? 0 : 1;
  for (let index = 0; index < WAVES; index++) {
    const side: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const finale = index === WAVES - 1;
    const center = laneFor(index, firstSide, rng);
    spawns.push(...waveSpawns(levelId, speedId, index, side, center, finale ? 3 : 0, rng));
    if (finale) spawns.push(...waveSpawns(levelId, speedId, index, side === 1 ? -1 : 1, 1 - center, 3, rng));
  }
  return spawns.sort((a, b) => a.at - b.at);
}

export function planSurprises(rng: Rng): Surprises {
  const golden = rng() < GOLDEN_CHANCE ? SURPRISE_FROM + rng() * SURPRISE_SPAN : null;
  const cat = rng() < CAT_CHANCE ? SURPRISE_FROM + rng() * SURPRISE_SPAN : null;
  return { golden, cat, sneeze: rng() < SNEEZE_CHANCE };
}

export function goldenSpawn(at: number, side: 1 | -1): Spawn {
  return { at, pattern: 'zip', slot: 0.5, side, seconds: GOLDEN_SECONDS, kind: 'goldie', tickles: 1, center: 0.5, width: 1, goo: [] };
}

/** The little ones a boss sneezes out. They fly from its nose, so they start on screen. */
export function sneezeSpawns(at: number, count: number): Spawn[] {
  return Array.from({ length: count }, (_, i) => ({
    at,
    pattern: 'sneeze',
    slot: count === 1 ? 0.5 : i / (count - 1),
    side: 1,
    seconds: SNEEZE_SECONDS,
    kind: 'achoo',
    tickles: 1,
    center: 0.5,
    width: 1,
    goo: [],
  }));
}
