import { rayLength, type Grid, type Point } from './grid.ts';
import { LONGEST_REACH } from './tuning.ts';
import type { Camera, Laser, Sensor } from './level.ts';

// Hazards are pure clocks: given the time, each says what it's doing. That makes their
// rhythm easy to read, to test and to draw, and the same at any frame rate.

const inCycle = (t: number, period: number, offset: number): number => (t + offset) % period;

export type SensorState = 'off' | 'warn' | 'on';

export function sensorState(sensor: Sensor, t: number): SensorState {
  const at = inCycle(t, sensor.period, sensor.offset);
  if (at < sensor.on) return 'on';
  return at > sensor.period - sensor.warn ? 'warn' : 'off';
}

const SWING = 0.18;
const smooth = (x: number): number => x * x * (3 - 2 * x);

/** -1 to 1. A camera swings across quickly, then stays looking to one side, which gives a child time to dash. */
function sweepSide(at: number): number {
  if (at < SWING) return -1 + 2 * smooth(at / SWING);
  if (at < 0.5) return 1;
  if (at < 0.5 + SWING) return 1 - 2 * smooth((at - 0.5) / SWING);
  return -1;
}

export const cameraFacing = (camera: Camera, t: number): number =>
  camera.aim + camera.sweep * sweepSide(inCycle(t, camera.period, camera.offset) / camera.period);

/** How charged a laser is, 0 to 1. It always reaches 1 just before it fires. */
export function laserCharge(laser: Laser, t: number): number {
  const untilFire = laser.period - inCycle(t, laser.period, laser.offset);
  return untilFire > laser.charge ? 0 : 1 - untilFire / laser.charge;
}

/** How far along its path a bolt has got, or null when none is in the air. */
export function boltDistance(laser: Laser, t: number): number | null {
  if (laser.kind !== 'bolt') return null;
  const flown = inCycle(t, laser.period, laser.offset) * laser.speed;
  return flown <= laser.range ? flown : null;
}

export function boltSpot(laser: Laser, flown: number): Point {
  return { x: laser.from.x + Math.cos(laser.aim) * flown, y: laser.from.y + Math.sin(laser.aim) * flown };
}

export interface Beam {
  angle: number;
  length: number;
}

/** The sweeping beam right now, or null between sweeps. */
export function sweepBeam(laser: Laser, grid: Grid, t: number): Beam | null {
  if (laser.kind !== 'sweep') return null;
  const at = inCycle(t, laser.period, laser.offset);
  if (at >= laser.on) return null;
  const angle = laser.aim - laser.sweep + (2 * laser.sweep * at) / laser.on;
  return { angle, length: rayLength(grid, laser.from, angle, LONGEST_REACH) };
}

/** How far a point is from a beam, as a line that starts at `from` and stops at its length. */
export function gapToBeam(from: Point, { angle, length }: Beam, point: Point): number {
  const alongX = Math.cos(angle);
  const alongY = Math.sin(angle);
  const dx = point.x - from.x;
  const dy = point.y - from.y;
  const along = Math.max(0, Math.min(length, dx * alongX + dy * alongY));
  return Math.hypot(dx - alongX * along, dy - alongY * along);
}
