export const LEVEL_IDS = ['easy', 'swoopy', 'wild'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

/** How far the flyer can stray from the middle of the path. */
export const MAX_U = 9;
export const MAX_V = 5.5;
/** How close a star has to be to get picked up. */
export const STAR_REACH = 3;

export interface Level {
  id: LevelId;
  speedStart: number;
  speedEnd: number;
  ringRadius: number;
  /** Extra room around a ring, so a near miss still counts. */
  forgiveness: number;
  ringGap: number;
  /**
   * How many rings stay on one side of the sky before crossing over, or 0 for
   * rings that circle the middle. Easy stays on one side at a time, so it asks
   * for nothing but a finger held to the left or the right.
   */
  ringsPerSide: number;
  /**
   * Sideways and up-down reach of the rings, at the start and the end of a flight.
   * The sideways reach is always wider than a ring, so a flyer left alone in the
   * middle flies between the rings rather than through them.
   */
  swingU: readonly [number, number];
  swingV: readonly [number, number];
  /** How far the whole path itself bends. */
  pathSwing: number;
  bumpEvery: number;
  archEvery: number;
  /** Share of rings caught unaided for 2 and 3 stars. Landing is always worth 1. */
  starShares: readonly [number, number];
  steerRate: number;
}

export const LEVELS: Record<LevelId, Level> = {
  easy: {
    id: 'easy',
    speedStart: 20,
    speedEnd: 30,
    ringRadius: 3.4,
    forgiveness: 1,
    ringGap: 36,
    ringsPerSide: 5,
    swingU: [5.8, 7.2],
    swingV: [1.4, 2.8],
    pathSwing: 10,
    bumpEvery: 210,
    archEvery: 330,
    starShares: [0.22, 0.65],
    steerRate: 3.4,
  },
  swoopy: {
    id: 'swoopy',
    speedStart: 28,
    speedEnd: 42,
    ringRadius: 2.7,
    forgiveness: 0.6,
    ringGap: 50,
    ringsPerSide: 0,
    swingU: [6.2, 7.8],
    swingV: [4.2, 4.7],
    pathSwing: 22,
    bumpEvery: 140,
    archEvery: 360,
    starShares: [0.35, 0.75],
    steerRate: 3.8,
  },
  wild: {
    id: 'wild',
    speedStart: 36,
    speedEnd: 56,
    ringRadius: 2.1,
    forgiveness: 0.4,
    ringGap: 62,
    ringsPerSide: 0,
    swingU: [6.6, 8.2],
    swingV: [3.6, 4.9],
    pathSwing: 36,
    bumpEvery: 100,
    archEvery: 400,
    starShares: [0.4, 0.8],
    steerRate: 4.4,
  },
};

export interface Ring {
  s: number;
  u: number;
  v: number;
  radius: number;
}

export interface Pickup {
  s: number;
  u: number;
  v: number;
}

export interface Arch {
  s: number;
  u: number;
  halfWidth: number;
  top: number;
}

export type BumpKind = 'cloud' | 'island';

export interface Bump {
  s: number;
  u: number;
  v: number;
  radius: number;
  kind: BumpKind;
}

export type SurpriseKind = 'tunnel' | 'whale' | 'birds';
export const SURPRISE_KINDS: readonly SurpriseKind[] = ['tunnel', 'whale', 'birds'];

export interface Surprise {
  kind: SurpriseKind;
  s: number;
}

export interface Tunnel {
  from: number;
  to: number;
}

export interface Course {
  level: Level;
  seed: number;
  length: number;
  rings: Ring[];
  stars: Pickup[];
  arches: Arch[];
  bumps: Bump[];
  surprises: Surprise[];
  tunnel: Tunnel | null;
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

/** Seconds of flying at the level's speed, before landing and any surprises. */
const CRUISE_SECONDS = 72;
const TUNNEL_LENGTH = 280;
const SURPRISE_CHANCE: Record<SurpriseKind, number> = { tunnel: 0.22, whale: 0.22, birds: 0.26 };
/** After this many flights with no surprise at all, the next one has one. */
const SURPRISE_DROUGHT = 2;
const INNER_STAR = STAR_REACH + 0.5;
const FIRST_RING_AT = 70;
const CLEAR_RUNWAY = 200;

/** A small seeded generator, so a flight can be replayed and tested. */
export function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

export const lerp = (from: number, to: number, share: number): number => from + (to - from) * share;

/** Distance covered in a cruise, given speed rising evenly with distance. */
export function courseLength(level: Level): number {
  const { speedStart: a, speedEnd: b } = level;
  return (CRUISE_SECONDS * (b - a)) / Math.log(b / a);
}

/** The middle of the sky road at distance `s`. It starts straight and bends more as the flight goes on. */
export function pathAt(level: Level, length: number, s: number, out: Point): Point {
  const growth = clamp(s / (length * 0.5), 0, 1);
  const swing = level.pathSwing * (0.35 + 0.65 * growth * growth * (3 - 2 * growth)) * clamp(s / 120, 0, 1);
  out.x = swing * (Math.sin(s / 150) + 0.4 * Math.sin(s / 61 + 1.3));
  out.y = swing * 0.28 * Math.sin(s / 112 + 0.6);
  out.z = -s;
  return out;
}

export function chooseSurprises(random: () => number, flightsSinceSurprise: number): SurpriseKind[] {
  const picked = SURPRISE_KINDS.filter((kind) => random() < SURPRISE_CHANCE[kind]).slice(0, 2);
  if (picked.length > 0 || flightsSinceSurprise < SURPRISE_DROUGHT) return picked;
  return [SURPRISE_KINDS[Math.floor(random() * SURPRISE_KINDS.length)] ?? 'whale'];
}

function placeSurprises(kinds: SurpriseKind[], length: number, random: () => number): Surprise[] {
  // Spread out so two surprises never land on top of each other, and both come before the finale.
  return kinds.map((kind, index) => {
    const start = kinds.length === 1 ? 0.3 : 0.2 + index * 0.35;
    return { kind, s: length * (start + random() * 0.15) };
  });
}

function placeTunnel(surprises: Surprise[]): Tunnel | null {
  const found = surprises.find((surprise) => surprise.kind === 'tunnel');
  return found ? { from: found.s, to: found.s + TUNNEL_LENGTH } : null;
}

/** Rings on Easy keep to one side for a few in a row, then cross over. */
function sideSpot(level: Level, share: number, ringNumber: number, phase: number, flipAt: number): { u: number; v: number } {
  const side = Math.floor((ringNumber + flipAt) / level.ringsPerSide) % 2 === 0 ? 1 : -1;
  return {
    u: side * lerp(level.swingU[0], level.swingU[1], share) * (0.9 + 0.1 * Math.sin(phase * 1.7) ** 2),
    v: lerp(level.swingV[0], level.swingV[1], share) * Math.sin(phase),
  };
}

/** Harder rings circle the middle, which asks for up and down as well. */
function orbitSpot(level: Level, share: number, phase: number): { u: number; v: number } {
  return {
    u: lerp(level.swingU[0], level.swingU[1], share) * Math.cos(phase),
    v: lerp(level.swingV[0], level.swingV[1], share) * Math.sin(phase),
  };
}

function placeRings(level: Level, length: number, tunnel: Tunnel | null, random: () => number): Ring[] {
  const rings: Ring[] = [];
  const phaseStep = level.ringsPerSide > 0 ? 0.55 : 0.75;
  const flipAt = Math.floor(random() * level.ringsPerSide * 2);
  let phase = random() * Math.PI * 2;
  let s = FIRST_RING_AT;
  while (s < length - CLEAR_RUNWAY) {
    if (tunnel && s > tunnel.from - 50 && s < tunnel.to + 50) {
      s = tunnel.to + 60;
      continue;
    }
    const share = s / length;
    const spot = level.ringsPerSide > 0 ? sideSpot(level, share, rings.length, phase, flipAt) : orbitSpot(level, share, phase);
    const reachU = MAX_U - level.ringRadius * 0.4;
    const reachV = MAX_V - 0.3;
    rings.push({ s, u: clamp(spot.u, -reachU, reachU), v: clamp(spot.v, -reachV, reachV), radius: level.ringRadius });
    phase += phaseStep + random() * 0.3;
    s += level.ringGap * (0.92 + random() * 0.16);
  }
  return rings;
}

/** Little trails of stars from one ring to the next: they show the way as well as being worth having. */
function placeStars(rings: Ring[], tunnel: Tunnel | null): Pickup[] {
  const stars: Pickup[] = [];
  for (let index = 0; index + 1 < rings.length; index += 2) {
    const from = rings[index];
    const to = rings[index + 1];
    if (!from || !to || to.s - from.s > 150) continue;
    for (const share of [0.3, 0.5, 0.7]) {
      const star = { s: lerp(from.s, to.s, share), u: lerp(from.u, to.u, share), v: lerp(from.v, to.v, share) + 0.6 };
      // Stars are for going after, so none sit where an idle flyer would drift through them.
      if (Math.hypot(star.u, star.v) > INNER_STAR) stars.push(star);
    }
  }
  // One more just out of reach of the middle, so even a small nudge towards a ring pays.
  for (let index = 0; index + 1 < rings.length; index += 1) {
    const from = rings[index];
    const to = rings[index + 1];
    if (!from || !to || to.s - from.s > 150) continue;
    const away = INNER_STAR / Math.hypot(to.u, to.v);
    stars.push({ s: lerp(from.s, to.s, 0.82), u: to.u * away, v: to.v * away });
  }
  if (tunnel) {
    const count = 14;
    for (let index = 1; index <= count; index += 1) {
      const turn = index * 0.7;
      stars.push({
        s: lerp(tunnel.from, tunnel.to, index / (count + 1)),
        u: Math.cos(turn) * 2.4,
        v: Math.sin(turn) * 2.4,
      });
    }
  }
  return stars.sort((a, b) => a.s - b.s);
}

const ARCH_HALF_WIDTH = 4.4;
/** An arch stands well to one side, with the middle of the sky outside its legs. */
const ARCH_OUT = ARCH_HALF_WIDTH + 2.2;
const ARCH_NEAR_RINGS = 4;

function placeArches(level: Level, rings: Ring[]): Arch[] {
  const arches: Arch[] = [];
  let next = FIRST_RING_AT + level.archEvery * 0.6;
  for (let index = 0; index + 1 < rings.length; index += 1) {
    const from = rings[index];
    const to = rings[index + 1];
    if (!from || !to || from.s < next || to.s - from.s > 150) continue;
    const between = (from.u + to.u) / 2;
    if (Math.abs(between) < ARCH_NEAR_RINGS) continue;
    arches.push({
      s: (from.s + to.s) / 2,
      u: Math.sign(between) * clamp(Math.abs(between), ARCH_OUT, MAX_U - 1),
      halfWidth: ARCH_HALF_WIDTH,
      top: 6.5,
    });
    next = from.s + level.archEvery;
  }
  return arches;
}

function placeBumps(level: Level, rings: Ring[], arches: Arch[], random: () => number): Bump[] {
  const bumps: Bump[] = [];
  let next = FIRST_RING_AT + level.bumpEvery * 0.8;
  for (let index = 0; index + 1 < rings.length; index += 1) {
    const from = rings[index];
    const to = rings[index + 1];
    if (!from || !to || from.s < next || to.s - from.s > 150) continue;
    const s = (from.s + to.s) / 2;
    if (arches.some((arch) => Math.abs(arch.s - s) < 30)) continue;
    const radius = 2 + random() * 0.8;
    const lineU = (from.u + to.u) / 2;
    const lineV = (from.v + to.v) / 2;
    // Beside the straight line between two rings, so a child aiming at rings stays clear of it.
    const side = lineU > 0 ? -1 : 1;
    bumps.push({
      s,
      u: clamp(lineU + side * (radius + 3 + random() * 2), -MAX_U, MAX_U),
      v: clamp(lineV + (random() - 0.5) * 3, -MAX_V, MAX_V),
      radius,
      kind: random() < 0.6 ? 'cloud' : 'island',
    });
    next = from.s + level.bumpEvery;
  }
  return bumps;
}

export function buildCourse(level: Level, seed: number, flightsSinceSurprise = 0): Course {
  const random = makeRandom(seed);
  const length = courseLength(level);
  const surprises = placeSurprises(chooseSurprises(random, flightsSinceSurprise), length, random);
  const tunnel = placeTunnel(surprises);
  const rings = placeRings(level, length, tunnel, random);
  const arches = placeArches(level, rings);
  return {
    level,
    seed,
    length,
    rings,
    stars: placeStars(rings, tunnel),
    arches,
    bumps: placeBumps(level, rings, arches, random),
    surprises,
    tunnel,
  };
}
