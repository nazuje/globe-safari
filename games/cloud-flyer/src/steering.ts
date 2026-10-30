import { clamp, MAX_U, MAX_V } from './course.ts';
import type { Steer } from './flight.ts';

/** The keys push as far as a finger near the edge of the screen. */
const KEY_REACH = 0.85;

export interface Span {
  /** The flyer's reach for a finger at the very edge of the screen. */
  u: number;
  v: number;
  /** Where the flyer rests on screen, from -1 to 1. It sits a little below the middle. */
  restY: number;
}

/** Turns a spot on screen, from -1 to 1 each way with up negative, into where the flyer should glide. */
export function steerFromScreen(x: number, y: number, span: Span): { u: number; v: number } {
  return {
    u: clamp(x * span.u, -MAX_U, MAX_U),
    v: clamp((span.restY - y) * span.v, -MAX_V, MAX_V),
  };
}

/** The other way round: the spot on screen, from -1 to 1, where a finger sends the flyer to this place. */
export function screenFromSteer(u: number, v: number, span: Span): { x: number; y: number } {
  return { x: u / span.u, y: span.restY - v / span.v };
}

export interface Keys {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export const NO_KEYS: Keys = { left: false, right: false, up: false, down: false };

export function steerFromKeys(keys: Keys): Steer {
  const x = Number(keys.right) - Number(keys.left);
  const y = Number(keys.up) - Number(keys.down);
  if (x === 0 && y === 0) return null;
  return { u: x * KEY_REACH * MAX_U, v: y * KEY_REACH * MAX_V };
}

export const KEY_NAMES: Record<string, keyof Keys> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
};
