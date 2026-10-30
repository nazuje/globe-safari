import type { Tuning, WorldPhysics } from './tuning.ts';
import { JELLY_HEIGHT } from './tuning.ts';
import type { WorldId } from './worlds.ts';

export type ItemKind = 'star' | 'carrot' | 'boots' | 'chest';

export interface Item {
  x: number;
  y: number;
  kind: ItemKind;
  /** Bonus things don't count towards a level's stars, so nothing hidden is ever needed. */
  extra: boolean;
}

/** A stretch of solid ground. Between lands are gaps. */
export interface Land {
  from: number;
  to: number;
  /** Heights at each corner of the ground's outline. */
  xs: number[];
  hs: number[];
}

export interface Platform {
  x: number;
  /** The top of the platform. You can jump up through it and land on it. */
  y: number;
  w: number;
  moveX: number;
  moveY: number;
  period: number;
  kind: 'stone' | 'mover' | 'cloud';
}

export interface Pad {
  x: number;
  y: number;
  /** The mushroom that leads to the hidden high path. */
  golden: boolean;
}

/** The wordless clue to a hidden path: sparkles rising from the golden mushroom. */
export interface Clue {
  path: { x: number; y: number }[];
  /** Where the second tap goes. A pulsing ring marks it. */
  tapX: number;
  tapY: number;
}

export interface Jelly {
  x: number;
  y: number;
  patrol: number;
  period: number;
}

/** A place in the bonus castle where the floor bounces. */
export interface Span {
  from: number;
  to: number;
}

/** One planned tap of the route the level was designed around. */
export interface RouteTap {
  x: number;
  hold: number;
  /** Only taken by someone going for the hidden high path. */
  secret: boolean;
}

export interface Decor {
  x: number;
  y: number;
  art: string;
  size: number;
}

export interface Level {
  id: string;
  world: WorldId;
  physics: WorldPhysics;
  tuning: Tuning;
  lands: Land[];
  platforms: Platform[];
  pads: Pad[];
  clues: Clue[];
  jellies: Jelly[];
  items: Item[];
  decor: Decor[];
  route: RouteTap[];
  bouncy: Span[];
  rocketTo: number[];
  flagX: number;
  endX: number;
  /** Stars and carrots that count towards the level's stars. */
  countable: number;
  /** Below this height the runner has fallen and gets scooped up. */
  pitY: number;
  treasure: string | null;
  castle: boolean;
}

/** All that's needed to ask about the ground, which is also there while a level is still being built. */
type Ground = Pick<Level, 'lands'>;

function landIndexAt(level: Ground, x: number): number {
  let low = 0;
  let high = level.lands.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const land = level.lands[middle]!;
    if (x < land.from) high = middle - 1;
    else if (x > land.to) low = middle + 1;
    else return middle;
  }
  return -1 - low;
}

/** The ground's height here, or null over a gap. */
export function groundAt(level: Ground, x: number): number | null {
  const index = landIndexAt(level, x);
  if (index < 0) return null;
  const { xs, hs } = level.lands[index]!;
  let low = 0;
  let high = xs.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (xs[middle]! <= x) low = middle;
    else high = middle - 1;
  }
  const from = xs[low]!;
  const to = xs[low + 1]!;
  const share = to > from ? (x - from) / (to - from) : 0;
  return hs[low]! + (hs[low + 1]! - hs[low]!) * share;
}

/** The next land that starts after x, for looking across a gap. */
export function landAfter(level: Ground, x: number): Land | null {
  const index = landIndexAt(level, x);
  const next = index < 0 ? -1 - index : index + 1;
  return level.lands[next] ?? null;
}

/** Where the land under x ends, or null when x is over a gap. */
export function landEnd(level: Ground, x: number): number | null {
  const index = landIndexAt(level, x);
  return index < 0 ? null : level.lands[index]!.to;
}

export function platformX(platform: Platform, time: number): number {
  return platform.moveX === 0 ? platform.x : platform.x + platform.moveX * Math.sin((time / platform.period) * Math.PI * 2);
}

export function platformY(platform: Platform, time: number): number {
  return platform.moveY === 0 ? platform.y : platform.y + platform.moveY * Math.sin((time / platform.period) * Math.PI * 2);
}

export function jellyX(jelly: Jelly, time: number): number {
  return jelly.patrol === 0 ? jelly.x : jelly.x + jelly.patrol * Math.sin((time / jelly.period) * Math.PI * 2);
}

export const jellyTop = (jelly: Jelly): number => jelly.y + JELLY_HEIGHT;

/** How high the rocket flies: clear of everything in the next stretch of ground. */
export function railHeight(level: Ground, x: number, clearance: number): number {
  let top = -Infinity;
  for (let ahead = 0; ahead <= 200; ahead += 50) top = Math.max(top, groundAt(level, x + ahead) ?? -Infinity);
  if (top === -Infinity) top = landAfter(level, x)?.hs[0] ?? 0;
  return top + clearance;
}

/** The first safe stretch of ground ahead of x, where a fallen runner is put down. */
export function safeSpot(level: Level, x: number): number {
  for (const land of level.lands) {
    if (land.to < x + 40) continue;
    const start = Math.max(land.from + 60, x + 40);
    if (land.to - start < 90) continue;
    const near = level.jellies.some((jelly) => Math.abs(jelly.x - (start + 40)) < 110);
    return near ? Math.min(start + 150, land.to - 30) : start + 40;
  }
  return level.endX;
}
