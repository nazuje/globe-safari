import type { Collection, Rng } from './collection.ts';

export type BubbleKind = 'plain' | 'tiny' | 'mini' | 'giant' | 'rainbow' | 'sleepy' | 'golden' | 'toot';

interface KindSpec {
  /** Radius, as a share of the screen's bubble unit. */
  size: number;
  /** Rising speed, as a share of a plain bubble's. */
  speed: number;
}

export const KINDS: Record<BubbleKind, KindSpec> = {
  plain: { size: 1, speed: 1 },
  tiny: { size: 0.66, speed: 2.1 },
  mini: { size: 0.55, speed: 1.3 },
  giant: { size: 1.9, speed: 0.55 },
  rainbow: { size: 1.15, speed: 0.85 },
  sleepy: { size: 1.1, speed: 0.6 },
  golden: { size: 1.1, speed: 0.7 },
  toot: { size: 1, speed: 1 },
};

/** Taps a giant bubble takes before it lets go. */
export const GIANT_TAPS = 4;

/**
 * The wilder bubbles arrive one at a time, each as soon as this many friends have been
 * popped, so a first game has something new every half minute or so.
 */
export const DEBUTS: readonly { kind: BubbleKind; after: number }[] = [
  { kind: 'sleepy', after: 5 },
  { kind: 'giant', after: 10 },
  { kind: 'rainbow', after: 16 },
  { kind: 'toot', after: 24 },
  { kind: 'golden', after: 32 },
];

const CHANCES: readonly { kind: BubbleKind; chance: number }[] = [
  { kind: 'sleepy', chance: 0.07 },
  { kind: 'giant', chance: 0.05 },
  { kind: 'rainbow', chance: 0.03 },
  { kind: 'toot', chance: 0.035 },
  { kind: 'golden', chance: 0.016 },
];

const TINY_CHANCE = 0.24;
const SHOWPIECES = new Set<BubbleKind>(['giant', 'rainbow', 'golden', 'toot']);

/** Giant, rainbow, golden and toot bubbles are events, so only one floats at a time. */
export function isShowpiece(kind: BubbleKind): boolean {
  return SHOWPIECES.has(kind);
}

/** Bubbles that come from the bottom on their own, unlike the minis in a shower or rain. */
export function chooseKind(collection: Collection, showpieceOut: boolean, rng: Rng): BubbleKind {
  const debut = DEBUTS[collection.debuts];
  if (debut && collection.pops >= debut.after && !(showpieceOut && isShowpiece(debut.kind))) {
    collection.debuts += 1;
    return debut.kind;
  }
  const seen = new Set(DEBUTS.slice(0, collection.debuts).map((entry) => entry.kind));
  let roll = rng();
  for (const { kind, chance } of CHANCES) {
    roll -= chance;
    if (roll < 0) return seen.has(kind) && !(showpieceOut && isShowpiece(kind)) ? kind : 'plain';
  }
  return roll < TINY_CHANCE ? 'tiny' : 'plain';
}

/** The size that keeps every bubble comfortably tappable, from a small phone to a big screen. */
export function bubbleUnit(width: number, height: number): number {
  return Math.min(64, Math.max(46, Math.min(width, height) / 8));
}

/** How many bubbles float at once: enough to feel busy, few enough for an old tablet. */
export function bubbleTarget(width: number, height: number, unit: number, slow: boolean): number {
  const fits = Math.floor((width * height) / (unit * unit * 13));
  return Math.max(4, Math.min(12, fits) - (slow ? 3 : 0));
}

export interface Round {
  alive: boolean;
  x: number;
  y: number;
  r: number;
}

/** Fingers are bigger than they think, so a tap just outside a bubble still counts. */
export const HIT_PADDING = 16;

/** The bubble under a tap, or the nearest one when bubbles overlap. */
export function findHit<T extends Round>(bubbles: readonly T[], x: number, y: number, canHit: (bubble: T) => boolean): T | null {
  let best: T | null = null;
  let bestGap = HIT_PADDING;
  for (const bubble of bubbles) {
    if (!bubble.alive || !canHit(bubble)) continue;
    const gap = Math.hypot(bubble.x - x, bubble.y - y) - bubble.r;
    if (gap <= bestGap) {
      best = bubble;
      bestGap = gap;
    }
  }
  return best;
}
