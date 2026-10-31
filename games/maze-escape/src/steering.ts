import type { Point } from './grid.ts';
import type { Steer } from './run.ts';

/** A finger this close to the character (in page pixels) means "stay", not "go". */
export const STILL_PX = 22;
/** The shortest step: a quick tap runs this long, about a third of a tile. Handy for careful moves near a laser. */
export const TAP_STEP_S = 0.12;

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const NO_KEYS: Keys = { up: false, down: false, left: false, right: false };

export const KEY_NAMES: Record<string, keyof Keys> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

const unit = (x: number, y: number): Steer => {
  const size = Math.hypot(x, y);
  return size === 0 ? null : { x: x / size, y: y / size };
};

export function steerFromKeys({ up, down, left, right }: Keys): Steer {
  return unit(Number(right) - Number(left), Number(down) - Number(up));
}

/**
 * Where a finger points, from the character. `finger` and `character` are both spots on the maze
 * floor, so a touch up the tilted screen still means straight up the maze. `gapPx` is the same
 * distance on the glass, which decides whether the finger is really pointing anywhere.
 */
export function steerFromFinger(finger: Point, character: Point, gapPx: number): Steer {
  if (gapPx < STILL_PX) return null;
  return unit(finger.x - character.x, finger.y - character.y);
}
