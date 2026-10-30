import type { Vec3 } from './aim.ts';

const BASE_SECONDS = 0.3;
const SECONDS_PER_UNIT = 0.011;
const BASE_ARC = 0.7;
const ARC_PER_UNIT = 0.1;

export const flightSeconds = (distance: number): number => BASE_SECONDS + distance * SECONDS_PER_UNIT;

export const arcHeight = (distance: number): number => BASE_ARC + distance * ARC_PER_UNIT;

/** Where a throw is at `t`, from 0 at the hand to 1 exactly on the spot it was aimed at. */
export function arcPoint(from: Vec3, to: Vec3, arc: number, t: number): Vec3 {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t + arc * 4 * t * (1 - t),
    z: from.z + (to.z - from.z) * t,
  };
}
