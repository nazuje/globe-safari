import { landingPoint, pickTarget, type Assist, type Ray, type Vec3 } from './aim.ts';
import { GOLDEN_HAT, type HatId } from './hats.ts';
import { BACK_Z, boxesOf, CAMERA, LAYOUTS, spotsOf, type Layout, type Motion, type SceneId, type Spot } from './layout.ts';
import { arcHeight, arcPoint, flightSeconds } from './throwArc.ts';
import {
  FAR_POINTS,
  FRIEND_POINTS,
  GOLDEN_POINTS,
  LEVELS,
  ROUND_SECONDS,
  starsFor,
  type Level,
  type LevelId,
} from './tuning.ts';

export const TICK = 1 / 60;

const ENTER_SECONDS = 0.32;
const EXIT_SECONDS = 0.3;
const SPLAT_SECONDS = 0.75;
const REBUILD_SECONDS = 0.95;
const REBUILD_SOLID_AT = 0.45;
const CLEARING_SECONDS = 1.3;
const GIANT_ENTER_SECONDS = 1.8;
const BURST_SECONDS = 3;
const LOB_SECONDS = 0.95;
const WAVE_SECONDS = 1.3;
const SOLID_FROM = 0.5;
const HIT_FROM = 0.35;
const MAX_BALLS = 14;
const GIANT_SIZE = 3;
const GIANT_SWAY = 1.6;
const SNOWMAN_HEIGHT = 2.2;
const SLIDE_REACH = 2.6;
const FIRST_SPOT_GAP = 0.25;
const SNOWMAN_MIDDLE = 1.15;
const SNOWMAN_RADIUS = 1.2;
const HEAD_MIDDLE = 1.75;
const HEAD_RADIUS = 0.72;
const SLED_SPEED = 2.6;
const WADDLE_SPEED = 1.3;
const SURPRISE_FROM = 10;
const SURPRISE_TO = 50;
const SURPRISE_ODDS: Record<SurpriseKind, number> = { golden: 0.4, penguin: 0.4, yeti: 0.25 };
const FRIEND_STAY = 7;
const GOLDEN_STAY = 7;
const YETI_SIZE = 2.8;
const PENGUIN_SIZE = 1.3;
const HELP_AFTER_MISSES = 2;
const HELP_SIZE = 0.3;
const HELP_ANGLE = 1.6;
const TEASE_SECONDS = 1.1;
const TEASE_GAP = 0.9;

export type TargetKind = 'snowman' | 'golden' | 'penguin' | 'yeti' | 'giant';
export type SurpriseKind = 'golden' | 'penguin' | 'yeti';
export type TargetPhase = 'enter' | 'stay' | 'exit' | 'splat' | 'rebuild';
export type RoundPhase = 'play' | 'clearing' | 'finale' | 'burst' | 'done';

export interface Target {
  id: number;
  kind: TargetKind;
  hat: HatId;
  /** Which look this snowman has: scarf colours in the view. */
  look: number;
  spot: Spot;
  motion: Motion;
  phase: TargetPhase;
  clock: number;
  stayFor: number;
  size: number;
  points: number;
  heading: number;
  end: number;
  x: number;
  y: number;
  z: number;
  /** 0 fully hidden, 1 fully out. */
  shown: number;
  /** Friends wave for a moment after being hit. */
  waving: number;
  /** Snowmen pull a face for a moment after a throw goes wide. */
  teasing: number;
  hits: number;
  pull: number;
  /** Friends only give points the first time. */
  greeted: boolean;
}

export interface Ball {
  id: number;
  from: Vec3;
  to: Vec3;
  arc: number;
  t: number;
  seconds: number;
  targetId: number | null;
  at: Vec3;
}

export interface Lob {
  id: number;
  from: Vec3;
  t: number;
  /** Where it lands on the glass, from 0 to 1 across the screen. */
  glassX: number;
  glassY: number;
}

export type RoundEvent =
  | { type: 'miss'; at: Vec3; teaser: Target | null }
  | { type: 'splat'; target: Target; at: Vec3; points: number; hat: HatId }
  | { type: 'rebuild'; target: Target; at: Vec3 }
  | { type: 'friend'; target: Target; at: Vec3; points: number }
  | { type: 'arrive'; kind: SurpriseKind }
  | { type: 'giantIn' }
  | { type: 'giantHit'; at: Vec3; share: number }
  | { type: 'giantBurst'; at: Vec3; hat: HatId }
  | { type: 'lob'; target: Target }
  | { type: 'glass'; x: number; y: number }
  | { type: 'star'; stars: number }
  | { type: 'done' };

export interface RoundOptions {
  scene: SceneId;
  level: LevelId;
  hats: readonly HatId[];
  rng: () => number;
  /** A demo goes on for ever behind the menu, with no surprises and no end. */
  demo?: boolean;
  /** Rounds played before this one. The first two are sure to have a surprise. */
  played?: number;
  /** Whether a spot can be seen on this screen. Snowmen stay out of spots that can't. */
  fits?: (spot: Spot) => boolean;
}

export interface Round {
  scene: SceneId;
  levelId: LevelId;
  level: Level;
  layout: Layout;
  spots: Spot[];
  boxes: ReturnType<typeof boxesOf>;
  hats: readonly HatId[];
  rng: () => number;
  demo: boolean;
  fits: (spot: Spot) => boolean;
  phase: RoundPhase;
  /** Seconds since this round began. */
  elapsed: number;
  /** Seconds in the current phase. */
  clock: number;
  spare: number;
  targets: Target[];
  balls: Ball[];
  lobs: Lob[];
  score: number;
  splats: number;
  stars: number;
  nextId: number;
  spawnIn: number;
  lobIn: number;
  lastSpot: string;
  surprises: { kind: SurpriseKind; at: number }[];
  giantHits: number;
  /** Throws gone wide since the last hit. */
  misses: number;
  teaseIn: number;
  events: RoundEvent[];
}

function planSurprises(rng: () => number, played: number): { kind: SurpriseKind; at: number }[] {
  const kinds = (Object.keys(SURPRISE_ODDS) as SurpriseKind[]).filter((kind) => rng() < SURPRISE_ODDS[kind]);
  if (kinds.length === 0 && played < 2) kinds.push(rng() < 0.5 ? 'golden' : 'penguin');
  const span = (SURPRISE_TO - SURPRISE_FROM) / Math.max(kinds.length, 1);
  return kinds.map((kind, index) => ({ kind, at: SURPRISE_FROM + span * (index + rng()) }));
}

export function createRound({
  scene,
  level: levelId,
  hats,
  rng,
  demo = false,
  played = 0,
  fits = () => true,
}: RoundOptions): Round {
  const level = LEVELS[levelId];
  const layout = LAYOUTS[scene];
  return {
    scene,
    levelId,
    level,
    layout,
    spots: spotsOf(layout),
    boxes: boxesOf(layout),
    hats,
    rng,
    demo,
    fits,
    phase: 'play',
    elapsed: 0,
    clock: 0,
    spare: 0,
    targets: [],
    balls: [],
    lobs: [],
    score: 0,
    splats: 0,
    stars: 0,
    nextId: 1,
    spawnIn: 0,
    lobIn: level.lobEvery ?? Infinity,
    lastSpot: '',
    surprises: demo ? [] : planSurprises(rng, played),
    giantHits: 0,
    misses: 0,
    teaseIn: 0,
    events: [],
  };
}

/** The middle of a target, where snowballs land. */
export function centerOf(target: Target): Vec3 {
  const middle = target.motion === 'window' ? HEAD_MIDDLE : SNOWMAN_MIDDLE;
  return { x: target.x, y: target.y + middle * target.size, z: target.z };
}

export function radiusOf(target: Target): number {
  return (target.motion === 'window' ? HEAD_RADIUS : SNOWMAN_RADIUS) * target.size;
}

export function isSolid(target: Target): boolean {
  if (target.phase === 'splat') return false;
  if (target.phase === 'rebuild') return target.clock >= REBUILD_SOLID_AT;
  return target.shown >= SOLID_FROM;
}

function heat(round: Round): number {
  return Math.min(round.elapsed / ROUND_SECONDS, 1);
}

function pace(round: Round): number {
  return 1 + heat(round) * round.level.ramp;
}

function weightOf(round: Round, spot: Spot): number {
  return round.level.bands[spot.band] * round.level.motions[spot.motion];
}

function pickSpot(round: Round, allowed: (spot: Spot) => boolean): Spot | null {
  const busy = new Set(round.targets.map((target) => target.spot.id));
  const open = round.spots.filter(
    (spot) =>
      allowed(spot) &&
      !busy.has(spot.id) &&
      spot.id !== round.lastSpot &&
      weightOf(round, spot) > 0 &&
      (spot.motion === 'sled' || round.fits(spot)),
  );
  const total = open.reduce((sum, spot) => sum + weightOf(round, spot), 0);
  let left = round.rng() * total;
  for (const spot of open) {
    left -= weightOf(round, spot);
    if (left <= 0) return spot;
  }
  return open.at(-1) ?? null;
}

function randomHat(round: Round): HatId {
  return round.hats[Math.floor(round.rng() * round.hats.length)];
}

function seat(round: Round, target: Target, spot: Spot): void {
  const flipped = spot.motion === 'sled' || spot.motion === 'waddle' ? round.rng() < 0.5 : false;
  target.spot = spot;
  target.motion = spot.motion;
  target.heading = flipped ? (spot.x < spot.x1 ? -1 : 1) : spot.x < spot.x1 ? 1 : -1;
  target.x = flipped ? spot.x1 : spot.x;
  target.end = flipped ? spot.x : spot.x1;
  target.y = spot.y;
  target.z = spot.z;
  round.lastSpot = spot.id;
}

function addTarget(round: Round, kind: TargetKind, spot: Spot): Target {
  const target: Target = {
    id: round.nextId++,
    kind,
    hat: kind === 'golden' ? GOLDEN_HAT : randomHat(round),
    look: Math.floor(round.rng() * 4),
    spot,
    motion: spot.motion,
    phase: 'enter',
    clock: 0,
    stayFor: 0,
    size: 0,
    points: 1,
    heading: 1,
    end: 0,
    x: spot.x,
    y: spot.y,
    z: spot.z,
    shown: 0,
    waving: 0,
    teasing: 0,
    hits: 0,
    pull: 1,
    greeted: false,
  };
  seat(round, target, spot);
  target.size = round.level.size * (spot.band === 'far' ? 0.8 : 1);
  target.points = spot.band === 'far' ? FAR_POINTS : 1;
  target.stayFor = round.level.stay / pace(round);
  if (spot.motion === 'sled') {
    target.phase = 'stay';
    target.shown = 1;
  }
  round.targets.push(target);
  return target;
}

/** Brings a surprise in, or says false if there's no room right now, so it can try again. */
function addFriend(round: Round, kind: SurpriseKind): boolean {
  if (kind === 'golden') {
    const spot = pickSpot(round, (candidate) => candidate.band !== 'far' && candidate.motion !== 'window');
    if (!spot) return false;
    const golden = addTarget(round, 'golden', spot);
    golden.points = GOLDEN_POINTS;
    golden.stayFor = GOLDEN_STAY;
  } else if (kind === 'penguin') {
    const spot = pickSpot(round, (candidate) => candidate.motion === 'sled' && candidate.band !== 'far');
    if (!spot) return false;
    const penguin = addTarget(round, 'penguin', spot);
    penguin.size = PENGUIN_SIZE;
    penguin.points = FRIEND_POINTS;
    penguin.pull = 1.3;
  } else {
    const { x, y, z } = round.layout.yeti;
    const spot: Spot = { id: 'yeti', motion: 'rise', band: 'far', x, y, z, x1: 0, side: 0 };
    const yeti = addTarget(round, 'yeti', spot);
    yeti.size = YETI_SIZE;
    yeti.points = FRIEND_POINTS;
    yeti.stayFor = FRIEND_STAY;
    yeti.pull = 1.6;
  }
  round.events.push({ type: 'arrive', kind });
  return true;
}

function addGiant(round: Round): void {
  const spot: Spot = { id: 'giant', motion: 'rise', band: 'mid', x: 0, y: 0, z: -9, x1: 0, side: 0 };
  const giant = addTarget(round, 'giant', spot);
  giant.size = GIANT_SIZE;
  giant.points = 1;
  giant.stayFor = Infinity;
  giant.pull = round.level.giantPull;
  round.events.push({ type: 'giantIn' });
}

function crowdNow(round: Round): number {
  return round.level.crowd + Math.floor(heat(round) * (round.level.crowdRise + 0.999));
}

function spawnSnowmen(round: Round): void {
  round.spawnIn -= TICK;
  if (round.spawnIn > 0) return;
  const crowd = round.targets.filter((target) => target.kind === 'snowman').length;
  if (crowd >= crowdNow(round)) return;
  const first = round.elapsed < round.level.gap && !round.targets.some((target) => target.kind === 'snowman');
  // The very first snowman stands near the middle, so the first tap has an easy target.
  const spot = pickSpot(round, first ? (candidate) => candidate.band !== 'far' && candidate.motion !== 'window' && candidate.motion !== 'sled' : () => true);
  if (spot) addTarget(round, 'snowman', spot);
  round.spawnIn = first ? FIRST_SPOT_GAP : round.level.gap / pace(round);
}

function rebuildElsewhere(round: Round, target: Target): void {
  const spot = pickSpot(round, (candidate) => candidate.motion !== 'sled' && candidate.motion !== 'window');
  if (!spot) {
    remove(round, target);
    return;
  }
  seat(round, target, spot);
  target.size = round.level.size * (spot.band === 'far' ? 0.8 : 1);
  target.points = spot.band === 'far' ? FAR_POINTS : target.kind === 'golden' ? GOLDEN_POINTS : 1;
  target.phase = 'rebuild';
  target.clock = 0;
  target.shown = 1;
  target.hat = randomHat(round);
  target.look = Math.floor(round.rng() * 4);
  target.stayFor = round.level.stay / pace(round);
  placeTarget(target, 0);
  round.events.push({ type: 'rebuild', target, at: centerOf(target) });
}

function remove(round: Round, target: Target): void {
  round.targets.splice(round.targets.indexOf(target), 1);
}

function placeTarget(target: Target, seconds: number): void {
  const { spot, motion } = target;
  const height = SNOWMAN_HEIGHT * target.size + 1;
  if (motion === 'rise') {
    target.x = target.kind === 'giant' ? Math.sin(target.clock * 0.7) * GIANT_SWAY * target.shown : spot.x;
    target.y = -height * (1 - target.shown);
  } else if (motion === 'slide') {
    target.x = spot.x - spot.side * SLIDE_REACH * (1 - target.shown);
  } else if (motion === 'waddle') {
    target.y = -height * (1 - target.shown);
  } else if (motion === 'window') {
    target.y = spot.y - HEAD_MIDDLE * target.size;
  }
  if (motion === 'sled' || motion === 'waddle') {
    target.x += target.heading * seconds * (target.phase === 'splat' ? 0 : 1);
  }
}

function moveTarget(round: Round, target: Target): void {
  const speed = round.level.speed * pace(round);
  let step = 0;
  if (target.motion === 'sled') {
    step = speed * SLED_SPEED * TICK;
  } else if (target.motion === 'waddle' && target.phase === 'stay') {
    step = speed * WADDLE_SPEED * TICK;
    const low = Math.min(target.spot.x, target.spot.x1);
    const high = Math.max(target.spot.x, target.spot.x1);
    if (target.x <= low) target.heading = 1;
    if (target.x >= high) target.heading = -1;
  }
  placeTarget(target, step);
}

function reachedEnd(target: Target): boolean {
  return target.motion === 'sled' && (target.end - target.x) * target.heading <= 0;
}

function stepTarget(round: Round, target: Target): void {
  target.clock += TICK;
  target.waving = Math.max(0, target.waving - TICK);
  target.teasing = Math.max(0, target.teasing - TICK);
  switch (target.phase) {
    case 'enter': {
      const seconds = target.kind === 'giant' ? GIANT_ENTER_SECONDS : ENTER_SECONDS;
      target.shown = Math.min(target.clock / seconds, 1);
      if (target.shown >= 1) {
        target.phase = 'stay';
        target.clock = 0;
      }
      break;
    }
    case 'stay':
      if (target.motion === 'sled' ? reachedEnd(target) : target.clock >= target.stayFor) {
        target.phase = 'exit';
        target.clock = 0;
      }
      break;
    case 'exit':
      target.shown = Math.max(1 - target.clock / EXIT_SECONDS, 0);
      if (target.shown <= 0) {
        remove(round, target);
        return;
      }
      break;
    case 'splat':
      if (target.clock >= SPLAT_SECONDS) {
        if (round.phase === 'play' && target.kind === 'snowman') rebuildElsewhere(round, target);
        else remove(round, target);
        return;
      }
      break;
    case 'rebuild':
      if (target.clock >= REBUILD_SECONDS) {
        target.phase = 'stay';
        target.clock = 0;
      }
      break;
  }
  moveTarget(round, target);
}

function addScore(round: Round, points: number): void {
  round.score += points;
  const stars = starsFor(round.score, round.level);
  if (stars > round.stars) {
    round.stars = stars;
    if (!round.demo) round.events.push({ type: 'star', stars });
  }
}

function hitGiant(round: Round, giant: Target): void {
  const at = centerOf(giant);
  giant.hits += 1;
  round.giantHits += 1;
  addScore(round, 1);
  const share = Math.min(giant.hits / round.level.giantHits, 1);
  if (share < 1) {
    round.events.push({ type: 'giantHit', at, share });
    return;
  }
  round.events.push({ type: 'giantBurst', at, hat: giant.hat });
  remove(round, giant);
  round.phase = 'burst';
  round.clock = 0;
}

function hitTarget(round: Round, target: Target): void {
  const at = centerOf(target);
  round.misses = 0;
  target.teasing = 0;
  if (target.kind === 'giant') {
    hitGiant(round, target);
  } else if (target.kind === 'penguin' || target.kind === 'yeti') {
    const points = target.greeted ? 0 : target.points;
    target.greeted = true;
    target.waving = WAVE_SECONDS;
    addScore(round, points);
    round.events.push({ type: 'friend', target, at, points });
  } else {
    target.phase = 'splat';
    target.clock = 0;
    round.splats += 1;
    addScore(round, target.points);
    round.events.push({ type: 'splat', target, at, points: target.points, hat: target.hat });
  }
}

function touching(ball: Ball, target: Target): boolean {
  const center = centerOf(target);
  return Math.hypot(ball.at.x - center.x, ball.at.y - center.y, ball.at.z - center.z) <= radiusOf(target);
}

/** The snowman nearest a throw that went wide pulls a face, now and then. */
function pickTeaser(round: Round, at: Vec3): Target | null {
  if (round.teaseIn > 0) return null;
  let nearest: Target | null = null;
  let nearestGap = Infinity;
  for (const target of round.targets) {
    if (target.phase !== 'stay' || target.kind === 'penguin' || target.kind === 'yeti' || !round.fits(target.spot)) continue;
    const gap = Math.hypot(target.x - at.x, target.z - at.z);
    if (gap < nearestGap) {
      nearest = target;
      nearestGap = gap;
    }
  }
  if (nearest) {
    nearest.teasing = TEASE_SECONDS;
    round.teaseIn = TEASE_GAP;
  }
  return nearest;
}

function stepBall(round: Round, ball: Ball): boolean {
  ball.t = Math.min(ball.t + TICK / ball.seconds, 1);
  const locked = round.targets.find((target) => target.id === ball.targetId);
  if (locked && isSolid(locked)) ball.to = centerOf(locked);
  ball.at = arcPoint(ball.from, ball.to, ball.arc, ball.t);
  if (ball.t >= 1 && locked && isSolid(locked)) {
    hitTarget(round, locked);
    return true;
  }
  if (ball.t >= HIT_FROM) {
    const struck = round.targets.find((target) => isSolid(target) && touching(ball, target));
    if (struck) {
      hitTarget(round, struck);
      return true;
    }
  }
  if (ball.t >= 1) {
    round.misses += 1;
    round.events.push({ type: 'miss', at: ball.at, teaser: pickTeaser(round, ball.at) });
    return true;
  }
  return false;
}

function stepLobs(round: Round): void {
  round.lobs = round.lobs.filter((lob) => {
    lob.t += TICK / LOB_SECONDS;
    if (lob.t < 1) return true;
    round.events.push({ type: 'glass', x: lob.glassX, y: lob.glassY });
    return false;
  });
  if (round.phase !== 'play' || round.demo || round.level.lobEvery === null) return;
  round.lobIn -= TICK;
  if (round.lobIn > 0) return;
  const thrower = round.targets.find((target) => target.kind === 'snowman' && target.phase === 'stay' && target.spot.band !== 'far');
  if (!thrower) return;
  round.lobIn = round.level.lobEvery * (0.8 + round.rng() * 0.4);
  round.lobs.push({
    id: round.nextId++,
    from: centerOf(thrower),
    t: 0,
    glassX: 0.2 + round.rng() * 0.6,
    glassY: 0.25 + round.rng() * 0.45,
  });
  round.events.push({ type: 'lob', target: thrower });
}

function stepSurprises(round: Round): void {
  const due = round.surprises.find((surprise) => surprise.at <= round.elapsed);
  if (!due) return;
  if (addFriend(round, due.kind)) round.surprises.splice(round.surprises.indexOf(due), 1);
}

function stepPhase(round: Round): void {
  round.clock += TICK;
  if (round.demo) return;
  if (round.phase === 'play' && round.elapsed >= ROUND_SECONDS) {
    round.phase = 'clearing';
    round.clock = 0;
    for (const target of round.targets) {
      if (target.phase === 'enter' || target.phase === 'stay' || target.phase === 'rebuild') {
        target.phase = 'exit';
        target.clock = 0;
        target.shown = 1;
      }
    }
  } else if (round.phase === 'clearing' && round.clock >= CLEARING_SECONDS) {
    round.phase = 'finale';
    round.clock = 0;
    addGiant(round);
  } else if (round.phase === 'burst' && round.clock >= BURST_SECONDS) {
    round.phase = 'done';
    round.clock = 0;
    if (round.stars === 0) round.stars = 1;
    round.events.push({ type: 'done' });
  }
}

function tick(round: Round): void {
  if (round.phase === 'play' && !round.demo) round.elapsed += TICK;
  round.teaseIn = Math.max(0, round.teaseIn - TICK);
  stepPhase(round);
  if (round.phase === 'play') {
    stepSurprises(round);
    spawnSnowmen(round);
  }
  for (const target of [...round.targets]) stepTarget(round, target);
  round.balls = round.balls.filter((ball) => !stepBall(round, ball));
  stepLobs(round);
}

/** Moves the round on. Time goes in fixed ticks, so a slow tablet plays the same game as a fast one. */
export function stepRound(round: Round, seconds: number): void {
  round.spare += seconds;
  while (round.spare >= TICK) {
    round.spare -= TICK;
    tick(round);
  }
}

/** True after a couple of misses in a row: the hint comes back and the assist helps a little more. */
export function needsHelp(round: Round): boolean {
  return round.misses >= HELP_AFTER_MISSES;
}

function assistNow(round: Round): Assist {
  const { assist } = round.level;
  return needsHelp(round) ? { size: assist.size + HELP_SIZE, angle: assist.angle * HELP_ANGLE } : assist;
}

/** Throws a snowball from `from` to wherever the tap's ray points, helped along by the assist. */
export function throwBall(round: Round, ray: Ray, from: Vec3): Ball {
  const aimable = round.targets.filter(isSolid).map((target) => ({
    id: target.id,
    center: centerOf(target),
    radius: radiusOf(target),
    pull: target.pull,
  }));
  const targetId = pickTarget(ray, aimable, assistNow(round));
  const locked = round.targets.find((target) => target.id === targetId);
  const to = locked ? centerOf(locked) : landingPoint(ray, round.boxes, BACK_Z);
  const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
  const ball: Ball = {
    id: round.nextId++,
    from,
    to,
    arc: arcHeight(distance),
    t: 0,
    seconds: flightSeconds(distance),
    targetId,
    at: from,
  };
  // A child mashing with both hands shouldn't pile up balls: the oldest just lands early.
  if (round.balls.length >= MAX_BALLS) round.balls.shift();
  round.balls.push(ball);
  return ball;
}

/** Hands over what happened since the last call, for sound and pictures. */
export function takeEvents(round: Round): RoundEvent[] {
  const events = round.events;
  round.events = [];
  return events;
}

/** The target a hint should point at: the easiest one out now. */
export function easiestTarget(round: Round, inView: (target: Target) => boolean): Target | null {
  let best: Target | null = null;
  let bestScore = -Infinity;
  for (const target of round.targets) {
    if (!isSolid(target) || target.kind === 'yeti' || !inView(target)) continue;
    const camera = CAMERA.position;
    const score = radiusOf(target) / Math.hypot(target.x - camera.x, target.z - camera.z) - (target.motion === 'sled' ? 0.1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}
