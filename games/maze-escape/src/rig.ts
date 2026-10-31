// The follow camera as plain trigonometry: how far back it sits so that the same floor always shows.
import { VIEW_RADIUS } from './tuning.ts';

const degrees = (value: number): number => (value * Math.PI) / 180;

/** The angle above the floor. High enough to read corridors, tilted enough to feel like a toy. */
export const TILT = degrees(66);
export const WALL_HEIGHT = 0.42;

/** How much floor a wall hides behind it. It must stay smaller than the player's radius. */
export const wallShadow = (height: number = WALL_HEIGHT): number => height / Math.tan(TILT);

/** Where a floor spot lands on screen, -1 to 1, seen from `distance` away with the player in the middle. */
export function projected(x: number, z: number, distance: number, fovDegrees: number, aspect: number): { x: number; y: number } {
  const lens = Math.tan(degrees(fovDegrees) / 2);
  const depth = distance - z * Math.cos(TILT);
  return { x: x / (depth * lens * aspect), y: (-z * Math.sin(TILT)) / (depth * lens) };
}

/** The nearest the camera can sit with VIEW_RADIUS tiles showing on every side, whatever the screen's shape. */
export function fitDistance(fovDegrees: number, aspect: number, radius: number = VIEW_RADIUS): number {
  const lens = Math.tan(degrees(fovDegrees) / 2);
  const margin = 0.93;
  const tall = radius * Math.cos(TILT) + (radius * Math.sin(TILT)) / (lens * margin);
  const wide = radius / (lens * aspect * margin);
  return Math.max(tall, wide);
}

/** How much floor shows either side of the middle of the screen, roughly. */
export function reachOnScreen(distance: number, fovDegrees: number, aspect: number): { x: number; z: number } {
  const lens = Math.tan(degrees(fovDegrees) / 2);
  return { x: distance * lens * aspect, z: (distance * lens) / Math.sin(TILT) };
}

/**
 * Where the camera looks. A tall screen shows far more than the view radius, so instead of sitting on
 * the player it slides to keep the maze filling the screen, but never so far that the radius is lost.
 */
export function framed(player: number, size: number, reach: number, mostBehind = Infinity): number {
  const spare = Math.max(0, reach * 0.72 - VIEW_RADIUS);
  const wanted = size <= 2 * reach ? size / 2 : Math.max(reach, Math.min(size - reach, player));
  return Math.max(player - Math.min(spare, mostBehind), Math.min(player + spare, wanted));
}

/** A player low on a tilted screen is nearer the lens, which narrows the view, so they may only sit a little below the middle. */
export const MOST_BELOW_MIDDLE = 1.6;

