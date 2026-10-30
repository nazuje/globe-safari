/** Things on the road. Distances are in lane widths, so the course fits any screen. */
export type ObstacleKind = 'cow' | 'puddle' | 'hay' | 'duck' | 'cone';
export type ItemKind = 'star' | 'treat' | 'obstacle' | 'ramp' | 'ufo' | 'giant';
export type SpeedId = 'slow' | 'fast' | 'super';
export type Rng = () => number;

export interface Item {
  kind: ItemKind;
  /** 0, 1 or 2. Ramps, UFOs and giant stars ignore it. */
  lane: number;
  /** Distance from the start line. */
  at: number;
  /** A treat's emoji or an obstacle's kind. */
  art: string;
}

interface SpeedPlan {
  /** Lane widths per second. */
  cruise: number;
  /** How long a clear run takes, before any bonks or boosts. */
  seconds: number;
  /** Seconds of empty road between groups of things. */
  rest: number;
  /** How likely a group holds an obstacle. */
  obstacles: number;
  /** Whether two lanes can be blocked at once. The third is always free. */
  doubles: boolean;
}

export const SPEEDS: Record<SpeedId, SpeedPlan> = {
  slow: { cruise: 2, seconds: 54, rest: 1.1, obstacles: 0.34, doubles: false },
  fast: { cruise: 3.2, seconds: 52, rest: 0.9, obstacles: 0.42, doubles: true },
  super: { cruise: 4.8, seconds: 50, rest: 0.75, obstacles: 0.48, doubles: true },
};

export const SPEED_IDS: readonly SpeedId[] = ['slow', 'fast', 'super'];
export const LANES = 3;

export const TREATS = ['🍩', '🍪', '🍎', '🍓', '🍦', '🧁', '🍌', '🍉'];

export const RAMP_CHANCE = 0.45;
export const UFO_CHANCE = 0.4;
/** How long a rainbow flight lasts, and how much faster it goes. */
export const FLIGHT_SECONDS = 4;
export const FLIGHT_BOOST = 1.6;

/** Empty road after the start, so nothing arrives while a child is still looking for the arrows. */
const START_CLEAR = 7;
const FINISH_CLEAR = 5;

function pick<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)] ?? list[0]!;
}

function pickLane(rng: Rng): number {
  return Math.floor(rng() * LANES) % LANES;
}

interface Group {
  items: Item[];
  /** Road the group takes up. */
  length: number;
}

function star(lane: number, at: number): Item {
  return { kind: 'star', lane, at, art: '⭐' };
}

function starLine(at: number, gap: number, rng: Rng): Group {
  const lane = pickLane(rng);
  const count = 3 + Math.floor(rng() * 3);
  const items = Array.from({ length: count }, (_, i) => star(lane, at + i * gap));
  return { items, length: (count - 1) * gap };
}

/** Stars that hop from lane to lane, so following them is a little game of its own. */
function starZigzag(at: number, gap: number, rng: Rng): Group {
  const items: Item[] = [];
  let lane = pickLane(rng);
  let step = lane === 2 ? -1 : 1;
  for (let i = 0; i < 6; i++) {
    items.push(star(lane, at + i * gap));
    if (i % 2 === 1) {
      if (lane + step < 0 || lane + step >= LANES) step = -step;
      lane += step;
    }
  }
  return { items, length: 5 * gap };
}

function treat(at: number, rng: Rng): Group {
  return { items: [{ kind: 'treat', lane: pickLane(rng), at, art: pick(TREATS, rng) }], length: 0 };
}

/** Obstacles in some lanes, with a star or a treat showing the way through the free one. */
function obstacleGroup(at: number, plan: SpeedPlan, obstacles: readonly ObstacleKind[], rng: Rng): Group {
  const free = pickLane(rng);
  const blocked = [0, 1, 2].filter((lane) => lane !== free);
  const lanes = plan.doubles && rng() < 0.4 ? blocked : [pick(blocked, rng)];
  const items: Item[] = lanes.map((lane) => ({ kind: 'obstacle', lane, at, art: pick(obstacles, rng) }));
  items.push(rng() < 0.3 ? { kind: 'treat', lane: free, at, art: pick(TREATS, rng) } : star(free, at));
  return { items, length: 0 };
}

function nextGroup(at: number, plan: SpeedPlan, obstacles: readonly ObstacleKind[], rng: Rng): Group {
  if (rng() < plan.obstacles) return obstacleGroup(at, plan, obstacles, rng);
  const gap = Math.max(0.9, plan.cruise * 0.3);
  const roll = rng();
  if (roll < 0.45) return starLine(at, gap, rng);
  if (roll < 0.75) return starZigzag(at, gap, rng);
  return treat(at, rng);
}

function flightLength(plan: SpeedPlan): number {
  return plan.cruise * FLIGHT_BOOST * FLIGHT_SECONDS;
}

/**
 * The surprises are decided first, so the rest of the course can leave them room.
 * A ramp spans the whole road and a UFO comes to you, so nobody can miss one.
 */
function surprises(length: number, rng: Rng): Item[] {
  const items: Item[] = [];
  const wantRamp = rng() < RAMP_CHANCE;
  const wantUfo = rng() < UFO_CHANCE;
  const rampAt = length * (0.3 + rng() * 0.35);
  const ufoShift = 0.15 + rng() * 0.1;
  if (wantRamp) items.push({ kind: 'ramp', lane: 1, at: rampAt, art: 'ramp' });
  if (wantUfo) {
    // Well clear of any flight, in whichever half of the race has more room.
    const at = rampAt > length * 0.5 ? length * ufoShift : length * (0.75 + ufoShift * 0.4);
    items.push({ kind: 'ufo', lane: 1, at, art: '🛸' });
  }
  return items;
}

/** Lays out one race. Every choice comes from `rng`, so a test can replay a course exactly. */
export function generateCourse(speed: SpeedId, obstacles: readonly ObstacleKind[], rng: Rng): { length: number; items: Item[] } {
  const plan = SPEEDS[speed];
  const length = plan.cruise * plan.seconds;
  const special = surprises(length, rng);
  const ramp = special.find((item) => item.kind === 'ramp');

  const items: Item[] = [...special];
  let at = START_CLEAR;
  while (at < length - FINISH_CLEAR) {
    const group = nextGroup(at, plan, obstacles, rng);
    items.push(...group.items.filter((item) => item.at < length - FINISH_CLEAR));
    at += group.length + plan.rest * plan.cruise;
  }

  const clear = ramp ? { from: ramp.at - 2, to: ramp.at + flightLength(plan) } : null;
  const kept = items.filter(
    (item) => item.kind === 'ramp' || item.kind === 'ufo' || !clear || item.at < clear.from || item.at > clear.to,
  );
  return { length, items: kept.sort((a, b) => a.at - b.at) };
}
