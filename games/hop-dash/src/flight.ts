import {
  APEX_BAND,
  APEX_GRAVITY,
  DOUBLE_SPEED,
  FALL_GRAVITY,
  FLOAT_GRAVITY,
  FLOAT_LEAST,
  FLOAT_SECONDS,
  GRAVITY,
  JUMP_SPEED,
  MOST_FALL_SPEED,
  STEP,
  type WorldPhysics,
} from './tuning.ts';

/** What gravity needs to know about something in the air. Height goes up. */
export interface Body {
  y: number;
  vy: number;
  /** Seconds of float left in this jump. */
  float: number;
  /** Seconds since the jump began. */
  floated: number;
}

export function launchJump(body: Body, physics: WorldPhysics): void {
  body.vy = JUMP_SPEED * physics.jump;
  body.float = FLOAT_SECONDS;
  body.floated = 0;
}

export function launchDouble(body: Body, physics: WorldPhysics): void {
  body.vy = DOUBLE_SPEED * physics.jump;
  body.float = 0;
}

/** A launch that isn't a jump: a spring, a jelly, a bouncy floor. */
export function launchAt(body: Body, speed: number, physics: WorldPhysics): void {
  body.vy = speed * physics.jump;
  body.float = 0;
}

function gravityShare(body: Body): number {
  if (body.float > 0 && body.vy > 0) return FLOAT_GRAVITY;
  if (Math.abs(body.vy) < APEX_BAND) return APEX_GRAVITY;
  return body.vy < 0 ? FALL_GRAVITY : 1;
}

/** One step of flight. Both the real runner and the level builder use this, so the star arcs are real jumps. */
export function fly(body: Body, held: boolean, physics: WorldPhysics): void {
  if (body.float > 0) {
    body.floated += STEP;
    body.float = held || body.floated < FLOAT_LEAST ? body.float - STEP : 0;
  }
  body.vy = Math.max(body.vy - GRAVITY * physics.gravity * gravityShare(body) * STEP, -MOST_FALL_SPEED);
  body.y += body.vy * STEP;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface FlightPlan {
  x: number;
  y: number;
  physics: WorldPhysics;
  speedAt: (x: number) => number;
  /** How long the finger stays down. */
  hold: number;
  /** Launch with this upward speed instead of a jump, for springs and jellies. */
  launch?: number;
  /** Taps a second jump at the top of the flight. */
  double?: boolean;
  stop: (x: number, y: number, vy: number) => boolean;
}

export interface Flight {
  path: PathPoint[];
  /** Where the second tap happens. */
  doubleX: number | null;
  peak: number;
  landed: boolean;
}

const LONGEST_FLIGHT_STEPS = 600;
const DOUBLE_WHEN_RISING_BELOW = 60;

/** Plays out a whole jump without a runner, tap by tap, exactly as the runner would fly it. */
export function planFlight(plan: FlightPlan): Flight {
  const body: Body = { y: plan.y, vy: 0, float: 0, floated: 0 };
  if (plan.launch === undefined) launchJump(body, plan.physics);
  else body.vy = plan.launch;
  let x = plan.x;
  let peak = body.y;
  let doubleX: number | null = null;
  const path: PathPoint[] = [{ x, y: body.y }];
  for (let step = 0; step < LONGEST_FLIGHT_STEPS; step++) {
    if (plan.double && doubleX === null && body.vy < DOUBLE_WHEN_RISING_BELOW) {
      launchDouble(body, plan.physics);
      doubleX = x;
    }
    fly(body, step * STEP < plan.hold, plan.physics);
    x += plan.speedAt(x) * STEP;
    peak = Math.max(peak, body.y);
    path.push({ x, y: body.y });
    if (plan.stop(x, body.y, body.vy)) return { path, doubleX, peak, landed: true };
  }
  return { path, doubleX, peak, landed: false };
}

/** Points along a path, evenly spaced, for laying out a trail of stars. */
export function spaced(path: readonly PathPoint[], gap: number, skipStart: number, skipEnd: number): PathPoint[] {
  let total = 0;
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    total += Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(total);
  }
  const usable = total - skipStart - skipEnd;
  if (usable <= 0) return [];
  const count = Math.max(1, Math.round(usable / gap));
  const placed: PathPoint[] = [];
  let at = 0;
  for (let i = 0; i <= count; i++) {
    const wanted = skipStart + (usable * i) / count;
    while (at < path.length - 1 && lengths[at + 1]! < wanted) at++;
    placed.push(path[at]!);
  }
  return placed;
}
