import {
  FLIGHT_BOOST,
  FLIGHT_SECONDS,
  generateCourse,
  LANES,
  SPEEDS,
  type Item,
  type ObstacleKind,
  type Rng,
  type SpeedId,
} from './course.ts';

/** Everything that happens in a race, for the screen to turn into sound and sparkle. */
export type RaceEvent =
  | { type: 'go' }
  | { type: 'star'; lane: number }
  | { type: 'treat'; lane: number; art: string }
  | { type: 'bonk'; kind: ObstacleKind; lane: number }
  | { type: 'giant' }
  | { type: 'ramp' }
  | { type: 'land' }
  | { type: 'ufo' }
  | { type: 'drop' }
  | { type: 'finish' };

export type RacePhase = 'countdown' | 'racing' | 'finished';

export interface Ufo {
  /** Seconds since it showed up. */
  age: number;
  dropped: boolean;
}

export interface Race {
  speedId: SpeedId;
  phase: RacePhase;
  length: number;
  items: Item[];
  /** Seconds left before the start, then seconds raced. */
  countdown: number;
  clock: number;
  /** Distance along the course. */
  position: number;
  speed: number;
  /** The lane it's heading for, and where it is right now, between lanes while moving. */
  lane: number;
  x: number;
  stars: number;
  spin: number;
  slow: number;
  /** Seconds in which another bump just passes through, so a spin never turns into a pile-up. */
  grace: number;
  flight: number;
  ufo: Ufo | null;
  /** Time not yet simulated. */
  spare: number;
}

export const COUNTDOWN = 3;
export const SPIN_SECONDS = 1;
const SLOW_SECONDS = 1.3;
const GRACE_SECONDS = 2;
const SLOW_FACTOR = 0.35;
const FINISH_FACTOR = 0.35;
const LANE_RATE = 7;
const ACCELERATION = 3;
const REACH = 0.5;
const STAR_WIDTH = 0.72;
const BUMP_WIDTH = 0.6;
const TREAT_STARS = 2;
export const GIANT_STARS = 10;
const STREAM_GAP = 1.1;
const UFO_DROP_AT = 1.4;
const UFO_SECONDS = 3.2;
const DROP_AHEAD_SECONDS = 1.6;

/** The simulation always steps by this much, so a race is the same on any screen. */
const STEP = 1 / 60;

export function createRace(speedId: SpeedId, obstacles: readonly ObstacleKind[], rng: Rng): Race {
  return {
    speedId,
    phase: 'countdown',
    ...generateCourse(speedId, obstacles, rng),
    countdown: COUNTDOWN,
    clock: 0,
    position: 0,
    speed: 0,
    lane: 1,
    x: 1,
    stars: 0,
    spin: 0,
    slow: 0,
    grace: 0,
    flight: 0,
    ufo: null,
    spare: 0,
  };
}

/** Moves one lane left (-1) or right (1). Works at any moment, and 'edge' means the road ran out. */
export function steer(race: Race, direction: -1 | 1): 'moved' | 'edge' {
  const lane = race.lane + direction;
  if (lane < 0 || lane >= LANES) return 'edge';
  race.lane = lane;
  return 'moved';
}

function startFlight(race: Race): void {
  race.flight = FLIGHT_SECONDS;
  const distance = SPEEDS[race.speedId].cruise * FLIGHT_BOOST * FLIGHT_SECONDS;
  const count = Math.floor(distance / STREAM_GAP);
  // The stars weave across the road, and a flying ride scoops them all up.
  for (let i = 1; i < count; i++) {
    const lane = Math.round(1 + Math.sin(i * 0.8));
    race.items.push({ kind: 'star', lane, at: race.position + 1.5 + i * STREAM_GAP, art: '⭐' });
  }
}

function takeItem(race: Race, item: Item, events: RaceEvent[]): boolean {
  const near = Math.abs(item.lane - race.x);
  const flying = race.flight > 0;
  switch (item.kind) {
    case 'star':
      if (!flying && near >= STAR_WIDTH) return false;
      race.stars += 1;
      events.push({ type: 'star', lane: item.lane });
      return true;
    case 'treat':
      if (!flying && near >= STAR_WIDTH) return false;
      race.stars += TREAT_STARS;
      events.push({ type: 'treat', lane: item.lane, art: item.art });
      return true;
    case 'giant':
      race.stars += GIANT_STARS;
      events.push({ type: 'giant' });
      return true;
    case 'ramp':
      startFlight(race);
      events.push({ type: 'ramp' });
      return true;
    case 'ufo':
      race.ufo = { age: 0, dropped: false };
      events.push({ type: 'ufo' });
      return true;
    case 'obstacle':
      if (flying || race.grace > 0 || near >= BUMP_WIDTH) return false;
      race.spin = SPIN_SECONDS;
      race.slow = SLOW_SECONDS;
      race.grace = GRACE_SECONDS;
      events.push({ type: 'bonk', kind: item.art as ObstacleKind, lane: item.lane });
      return true;
  }
}

function meetItems(race: Race, events: RaceEvent[]): void {
  // A ramp adds stars while this runs, so they go in a fresh list and join the ones that stay.
  const current = race.items;
  race.items = [];
  const kept = current.filter((item) => {
    const ahead = item.at - race.position;
    if (ahead < -2) return false;
    if (Math.abs(ahead) > REACH) return true;
    return !takeItem(race, item, events);
  });
  race.items = [...kept, ...race.items];
}

function runUfo(race: Race, events: RaceEvent[]): void {
  const ufo = race.ufo;
  if (!ufo) return;
  ufo.age += STEP;
  if (!ufo.dropped && ufo.age >= UFO_DROP_AT) {
    ufo.dropped = true;
    const at = race.position + race.speed * DROP_AHEAD_SECONDS;
    race.items.push({ kind: 'giant', lane: 1, at, art: '🌟' });
    events.push({ type: 'drop' });
  }
  if (ufo.age >= UFO_SECONDS) race.ufo = null;
}

function tick(race: Race, events: RaceEvent[]): void {
  race.clock += STEP;
  const move = LANE_RATE * STEP;
  race.x += Math.max(-move, Math.min(move, race.lane - race.x));
  race.spin = Math.max(0, race.spin - STEP);
  race.slow = Math.max(0, race.slow - STEP);
  race.grace = Math.max(0, race.grace - STEP);

  if (race.phase === 'countdown') {
    race.countdown -= STEP;
    if (race.countdown <= 0) {
      race.phase = 'racing';
      race.clock = 0;
      events.push({ type: 'go' });
    }
    return;
  }

  const cruise = SPEEDS[race.speedId].cruise;
  let target = cruise;
  if (race.phase === 'finished') target = cruise * FINISH_FACTOR;
  else if (race.flight > 0) target = cruise * FLIGHT_BOOST;
  else if (race.slow > 0) target = cruise * SLOW_FACTOR;
  race.speed += (target - race.speed) * (1 - Math.exp(-ACCELERATION * STEP));
  race.position += race.speed * STEP;

  if (race.flight > 0) {
    race.flight = Math.max(0, race.flight - STEP);
    if (race.flight === 0) events.push({ type: 'land' });
  }
  if (race.phase !== 'racing') return;
  meetItems(race, events);
  runUfo(race, events);
  if (race.position >= race.length) {
    race.phase = 'finished';
    race.flight = 0;
    race.ufo = null;
    events.push({ type: 'finish' });
  }
}

/** Runs the race forward by real seconds, and reports what happened. */
export function advance(race: Race, seconds: number): RaceEvent[] {
  const events: RaceEvent[] = [];
  race.spare += seconds;
  while (race.spare >= STEP) {
    race.spare -= STEP;
    tick(race, events);
  }
  return events;
}
