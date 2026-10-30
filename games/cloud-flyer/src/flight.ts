import { clamp, LEVELS, lerp, MAX_U, MAX_V, STAR_REACH, type BumpKind, type Course, type Ring, type SurpriseKind } from './course.ts';

/** The flyer's size for touching things. */
const FLYER_RADIUS = 1;
const RELEASE_RATE = 1.3;
const LOCKED_RATE = 2.6;
const BUMP_SECONDS = 1.3;
const BUMP_SLOWDOWN = 0.5;
const BUMP_COOLDOWN = 0.8;
const BUMP_NUDGE = 7;
const TUNNEL_BOOST = 1.9;
const BOOST_RATE = 2.5;
const BRAKING_SECONDS = 1.6;
export const BIRD_SECONDS = 13;
export const CLOUD_TOP = -2;
const LAND_HEIGHT = 1.4;
const HOPS = [
  { seconds: 0.8, height: 4.5 },
  { seconds: 0.6, height: 2.2 },
  { seconds: 0.42, height: 0.9 },
] as const;
/** Two misses in a row, and the next ring comes to meet the flyer. */
const MISSES_BEFORE_HELP = 2;
const HELP_RATE = 3;
/** How far a helping ring slides towards the flyer, and how much further for each ring missed after that. */
const HELP_PULL = 0.75;
const HELP_PULL_MORE = 0.12;
const HELP_GROWTH = 0.5;
const RING_POINTS = 10;
const STAR_POINTS = 5;
const ARCH_POINTS = 25;

/** Where the player wants the flyer. Null when nobody is steering, so it drifts back to the middle. */
export type Steer = { u: number; v: number } | null;

export type FlightEvent =
  | { type: 'ring'; index: number; chain: number; points: number }
  | { type: 'miss'; index: number; streak: number }
  | { type: 'star'; index: number; points: number }
  | { type: 'arch'; index: number; points: number }
  | { type: 'bump'; index: number; kind: BumpKind; arch: boolean }
  | { type: 'tunnelIn' }
  | { type: 'tunnelOut' }
  | { type: 'surprise'; kind: Exclude<SurpriseKind, 'tunnel'> }
  | { type: 'approach' }
  | { type: 'bounce'; hop: number }
  | { type: 'landed' };

export type Phase = 'flying' | 'braking' | 'bouncing' | 'landed';

export interface Flight {
  course: Course;
  phase: Phase;
  time: number;
  s: number;
  u: number;
  v: number;
  speedU: number;
  speedV: number;
  speed: number;
  boost: number;
  /** Seconds left of the silly wobble and slowdown. */
  bumpLeft: number;
  bumpCooldown: number;
  birdsLeft: number;
  inTunnel: boolean;
  chain: number;
  bestChain: number;
  rings: number;
  /** Rings caught without a helping ring coming to meet the flyer. These are what earn stars. */
  ownRings: number;
  /** Rings missed since the last one caught. */
  missStreak: number;
  /** From 0 to 1, how far the next ring has come to help. */
  help: number;
  starsTaken: number;
  arches: number;
  bumps: number;
  score: number;
  /** How far above the landing cloud, while bouncing. */
  hop: number;
  /** 1 at the instant of a bounce, fading away: how squashed the landing cloud is. */
  squash: number;
  nextRing: number;
  nextStar: number;
  nextArch: number;
  nextBump: number;
  nextSurprise: number;
  brakeFrom: { s: number; speed: number; seconds: number; left: number };
  hopIndex: number;
  hopTime: number;
}

export function newFlight(course: Course): Flight {
  return {
    course,
    phase: 'flying',
    time: 0,
    s: 0,
    u: 0,
    v: 0,
    speedU: 0,
    speedV: 0,
    speed: course.level.speedStart,
    boost: 1,
    bumpLeft: 0,
    bumpCooldown: 0,
    birdsLeft: 0,
    inTunnel: false,
    chain: 0,
    bestChain: 0,
    rings: 0,
    ownRings: 0,
    missStreak: 0,
    help: 0,
    starsTaken: 0,
    arches: 0,
    bumps: 0,
    score: 0,
    hop: 0,
    squash: 0,
    nextRing: 0,
    nextStar: 0,
    nextArch: 0,
    nextBump: 0,
    nextSurprise: 0,
    brakeFrom: { s: 0, speed: 0, seconds: 1, left: 0 },
    hopIndex: 0,
    hopTime: 0,
  };
}

export const ringPoints = (chain: number): number => RING_POINTS * Math.min(1 + Math.floor((chain - 1) / 3), 5);

/**
 * A critically damped spring, solved exactly. It glides to the target with no
 * overshoot, and one long step lands in the same place as many short ones.
 */
export function glide(position: number, speed: number, target: number, rate: number, seconds: number): [number, number] {
  const gap = position - target;
  const lean = speed + rate * gap;
  const fade = Math.exp(-rate * seconds);
  return [target + (gap + lean * seconds) * fade, (speed - lean * rate * seconds) * fade];
}

/** The level's cruising speed here: the flight gets faster as it goes, so the end is the thrilling bit. */
export const cruiseSpeed = (flight: Flight): number => {
  const { speedStart, speedEnd } = flight.course.level;
  return lerp(speedStart, speedEnd, clamp(flight.s / flight.course.length, 0, 1));
};

const slowdown = (bumpLeft: number): number => 1 - BUMP_SLOWDOWN * clamp(bumpLeft / BUMP_SECONDS, 0, 1);

/** Where a ring is right now: a helping ring is bigger, and has slid towards the flyer. */
export function ringNow(flight: Flight, ring: Ring): Ring {
  if (flight.help === 0 || flight.course.rings[flight.nextRing] !== ring) return ring;
  const pull = Math.min(HELP_PULL + HELP_PULL_MORE * (flight.missStreak - MISSES_BEFORE_HELP), 1) * flight.help;
  return {
    s: ring.s,
    u: lerp(ring.u, flight.u, pull),
    v: lerp(ring.v, flight.v, pull),
    radius: ring.radius * (1 + HELP_GROWTH * flight.help),
  };
}

function steerFlyer(flight: Flight, steer: Steer, seconds: number): void {
  const locked = flight.inTunnel || flight.phase !== 'flying';
  const target = locked ? null : steer;
  const rate = locked ? LOCKED_RATE : target ? flight.course.level.steerRate : RELEASE_RATE;
  const aimU = target ? clamp(target.u, -MAX_U, MAX_U) : 0;
  const aimV = target ? clamp(target.v, -MAX_V, MAX_V) : 0;
  [flight.u, flight.speedU] = glide(flight.u, flight.speedU, aimU, rate, seconds);
  [flight.v, flight.speedV] = glide(flight.v, flight.speedV, aimV, rate, seconds);
}

function crossRings(flight: Flight, events: FlightEvent[]): void {
  const { rings, level } = flight.course;
  for (let ring = rings[flight.nextRing]; ring && ring.s <= flight.s; ring = rings[flight.nextRing]) {
    const index = flight.nextRing;
    const now = ringNow(flight, ring);
    const helped = flight.help > 0;
    flight.nextRing += 1;
    if (Math.hypot(flight.u - now.u, flight.v - now.v) > now.radius + level.forgiveness) {
      flight.chain = 0;
      flight.missStreak += 1;
      events.push({ type: 'miss', index, streak: flight.missStreak });
      continue;
    }
    flight.chain += 1;
    flight.bestChain = Math.max(flight.bestChain, flight.chain);
    flight.rings += 1;
    if (!helped) flight.ownRings += 1;
    flight.missStreak = 0;
    flight.help = 0;
    const points = ringPoints(flight.chain);
    flight.score += points;
    events.push({ type: 'ring', index, chain: flight.chain, points });
  }
}

function crossStars(flight: Flight, events: FlightEvent[]): void {
  const { stars } = flight.course;
  for (let star = stars[flight.nextStar]; star && star.s <= flight.s; star = stars[flight.nextStar]) {
    const index = flight.nextStar;
    flight.nextStar += 1;
    if (Math.hypot(flight.u - star.u, flight.v - star.v) > STAR_REACH) continue;
    flight.starsTaken += 1;
    flight.score += STAR_POINTS;
    events.push({ type: 'star', index, points: STAR_POINTS });
  }
}

function hitBump(flight: Flight, index: number, kind: BumpKind, arch: boolean, awayU: number, events: FlightEvent[]): void {
  if (flight.bumpCooldown > 0) return;
  flight.bumpLeft = BUMP_SECONDS;
  flight.bumpCooldown = BUMP_SECONDS + BUMP_COOLDOWN;
  flight.bumps += 1;
  // A soft push away, and the chain carries on: a bump is a joke, not a punishment.
  flight.speedU += awayU * BUMP_NUDGE;
  events.push({ type: 'bump', index, kind, arch });
}

function crossArches(flight: Flight, events: FlightEvent[]): void {
  const { arches } = flight.course;
  for (let arch = arches[flight.nextArch]; arch && arch.s <= flight.s; arch = arches[flight.nextArch]) {
    const index = flight.nextArch;
    flight.nextArch += 1;
    const across = Math.abs(flight.u - arch.u);
    if (flight.v >= arch.top) continue;
    if (across < arch.halfWidth - FLYER_RADIUS) {
      flight.arches += 1;
      flight.score += ARCH_POINTS;
      events.push({ type: 'arch', index, points: ARCH_POINTS });
    } else if (across < arch.halfWidth + FLYER_RADIUS) {
      hitBump(flight, index, 'island', true, flight.u > arch.u ? 1 : -1, events);
    }
  }
}

function crossBumps(flight: Flight, events: FlightEvent[]): void {
  const { bumps } = flight.course;
  for (let bump = bumps[flight.nextBump]; bump && bump.s <= flight.s; bump = bumps[flight.nextBump]) {
    const index = flight.nextBump;
    flight.nextBump += 1;
    if (Math.hypot(flight.u - bump.u, flight.v - bump.v) > bump.radius + FLYER_RADIUS) continue;
    hitBump(flight, index, bump.kind, false, flight.u > bump.u ? 1 : -1, events);
  }
}

function crossSurprises(flight: Flight, events: FlightEvent[]): void {
  const { surprises, tunnel } = flight.course;
  for (let surprise = surprises[flight.nextSurprise]; surprise && surprise.s <= flight.s; surprise = surprises[flight.nextSurprise]) {
    flight.nextSurprise += 1;
    if (surprise.kind === 'tunnel') continue;
    if (surprise.kind === 'birds') flight.birdsLeft = BIRD_SECONDS;
    events.push({ type: 'surprise', kind: surprise.kind });
  }
  if (!tunnel) return;
  const inside = flight.s >= tunnel.from && flight.s < tunnel.to;
  if (inside === flight.inTunnel) return;
  flight.inTunnel = inside;
  events.push({ type: inside ? 'tunnelIn' : 'tunnelOut' });
}

function cruise(flight: Flight, steer: Steer, seconds: number, events: FlightEvent[]): void {
  const target = flight.inTunnel ? TUNNEL_BOOST : 1;
  flight.boost = lerp(target, flight.boost, Math.exp(-BOOST_RATE * seconds));
  flight.speed = cruiseSpeed(flight) * flight.boost * slowdown(flight.bumpLeft);
  flight.s += flight.speed * seconds;
  steerFlyer(flight, steer, seconds);
  if (flight.missStreak >= MISSES_BEFORE_HELP) flight.help = lerp(1, flight.help, Math.exp(-HELP_RATE * seconds));
  crossRings(flight, events);
  crossStars(flight, events);
  crossArches(flight, events);
  crossBumps(flight, events);
  crossSurprises(flight, events);
  const left = flight.course.length - flight.s;
  if (left > flight.speed * BRAKING_SECONDS) return;
  // Slowing evenly to a stop covers half the distance full speed would, so this arrives exactly on the cloud.
  const brakeSeconds = (2 * left) / flight.speed;
  flight.brakeFrom = { s: flight.s, speed: flight.speed, seconds: brakeSeconds, left: brakeSeconds };
  flight.phase = 'braking';
  events.push({ type: 'approach' });
}

function brake(flight: Flight, seconds: number, events: FlightEvent[]): void {
  const plan = flight.brakeFrom;
  plan.left = Math.max(plan.left - seconds, 0);
  const done = 1 - plan.left / plan.seconds;
  flight.s = plan.s + plan.speed * plan.seconds * (done - (done * done) / 2);
  flight.speed = plan.speed * (1 - done);
  steerFlyer(flight, null, seconds);
  flight.v += (LAND_HEIGHT + CLOUD_TOP - flight.v) * (1 - Math.exp(-3 * seconds));
  flight.u += (0 - flight.u) * (1 - Math.exp(-3 * seconds));
  if (plan.left > 0) return;
  flight.phase = 'bouncing';
  flight.hopIndex = 0;
  flight.hopTime = 0;
  flight.squash = 1;
  events.push({ type: 'bounce', hop: 0 });
}

function bounce(flight: Flight, seconds: number, events: FlightEvent[]): void {
  flight.hopTime += seconds;
  const hop = HOPS[flight.hopIndex];
  if (!hop) {
    flight.hop = 0;
    flight.phase = 'landed';
    events.push({ type: 'landed' });
    return;
  }
  if (flight.hopTime < hop.seconds) {
    const share = flight.hopTime / hop.seconds;
    flight.hop = 4 * hop.height * share * (1 - share);
    return;
  }
  flight.hop = 0;
  flight.hopTime -= hop.seconds;
  flight.hopIndex += 1;
  flight.squash = 1 - flight.hopIndex * 0.25;
  if (HOPS[flight.hopIndex]) events.push({ type: 'bounce', hop: flight.hopIndex });
}

/** One step of the flight. Mutates it, and returns what happened for the sound and pictures to react to. */
export function stepFlight(flight: Flight, steer: Steer, seconds: number): FlightEvent[] {
  const events: FlightEvent[] = [];
  flight.time += seconds;
  flight.bumpLeft = Math.max(flight.bumpLeft - seconds, 0);
  flight.bumpCooldown = Math.max(flight.bumpCooldown - seconds, 0);
  flight.birdsLeft = Math.max(flight.birdsLeft - seconds, 0);
  flight.squash *= Math.exp(-5 * seconds);
  if (flight.phase === 'flying') cruise(flight, steer, seconds, events);
  else if (flight.phase === 'braking') brake(flight, seconds, events);
  else if (flight.phase === 'bouncing') bounce(flight, seconds, events);
  return events;
}

/** Up to 3 stars: landing always earns the first, and the rest depend on how many rings were caught unaided. */
export function flightStars(ownRings: number, totalRings: number, levelId: keyof typeof LEVELS): number {
  const [two, three] = LEVELS[levelId].starShares;
  const share = totalRings > 0 ? ownRings / totalRings : 1;
  if (share >= three) return 3;
  return share >= two ? 2 : 1;
}

const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];

/** A rising pentatonic scale, so any chain of rings sounds like a tune. It stays at the top after that. */
export const ringNote = (chain: number): number => NOTES[clamp(chain - 1, 0, NOTES.length - 1)] ?? 2093;
