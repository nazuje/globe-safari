import type { KindId } from './kinds.ts';
import { levelById, SPEEDS, type LevelId, type SpeedId, type SpeedRule } from './levels.ts';
import {
  goldenSpawn,
  pathPoint,
  planSurprises,
  planWaves,
  sneezeSpawns,
  waveTime,
  WAVES,
  type Point,
  type Rng,
  type Spawn,
  type Surprises,
} from './waves.ts';

export type PowerId = 'triple' | 'wave' | 'magnet' | 'helper';
export type ShotKind = 'feather' | 'bubble';
export type Phase = 'playing' | 'boss' | 'highFive' | 'finished';

/** Everything that happens, for the screen to turn into sound and sparkle. */
export type GameEvent =
  | { type: 'wave'; index: number }
  | { type: 'shot'; kind: ShotKind; x: number; y: number }
  | { type: 'tickle'; kind: KindId; x: number; y: number; combo: number; storm: boolean }
  | { type: 'nudge'; x: number; y: number }
  | { type: 'star'; x: number; y: number }
  | { type: 'goo'; x: number; y: number }
  | { type: 'gooDrop'; x: number; y: number }
  | { type: 'power'; power: PowerId; x: number; y: number }
  | { type: 'storm' }
  | { type: 'stormEnd' }
  | { type: 'golden' }
  | { type: 'cat' }
  | { type: 'catStars'; x: number; y: number }
  | { type: 'bossComing' }
  | { type: 'bossHit'; x: number; y: number }
  | { type: 'bossGiggle'; stage: 1 | 2 }
  | { type: 'sneeze'; x: number; y: number }
  | { type: 'bossDone'; x: number; y: number }
  | { type: 'highFive'; x: number; y: number }
  | { type: 'finish' };

export interface Field {
  w: number;
  h: number;
}

export interface Alien {
  spawn: Spawn;
  x: number;
  y: number;
  /** Seconds since it arrived. */
  age: number;
  tickles: number;
  gooIndex: number;
  /** Seconds it has been laughing, or below 0 while still grumpy. */
  laughing: number;
  /** Which way it drifts off while it laughs. */
  drift: number;
  /** How recently a tickle landed, for a little squash. */
  nudge: number;
}

export interface Shot {
  kind: ShotKind;
  /** Which of the feather colors it is. */
  tint: number;
  x: number;
  y: number;
  vx: number;
  age: number;
}

export interface Bit {
  x: number;
  y: number;
  vx: number;
  age: number;
}

export interface Drop extends Bit {
  power: PowerId;
}

export interface Ship {
  x: number;
  y: number;
  target: number;
  push: number;
  /** Seconds of each state left. */
  goo: number;
  gooGrace: number;
  triple: number;
  magnet: number;
  helper: number;
  fireIn: number;
  fired: number;
  lean: number;
}

export interface Boss {
  kind: KindId;
  x: number;
  y: number;
  age: number;
  /** 0 is grumpy and 1 is helpless with laughter. */
  laugh: number;
  stage: 0 | 1 | 2;
  sneezed: boolean;
  /** Seconds since it arrived and could be tickled. */
  tickled: number;
  hits: number;
  /** Seconds since a tickle last landed. */
  lonely: number;
  /** Seconds left of hanging around the ship. */
  visit: number;
  /** How recently a tickle landed. */
  nudge: number;
  /** Seconds since the high five started, or below 0 before that. */
  fiveAge: number;
  slapped: boolean;
}

export interface Cat {
  x: number;
  y: number;
  age: number;
  dropped: boolean;
  tickled: boolean;
}

export interface Game {
  levelId: LevelId;
  speedId: SpeedId;
  speed: SpeedRule;
  field: Field;
  rng: Rng;
  phase: Phase;
  clock: number;
  spare: number;
  spawns: Spawn[];
  nextSpawn: number;
  nextWave: number;
  surprises: Surprises;
  aliens: Alien[];
  shots: Shot[];
  goos: Bit[];
  drops: Drop[];
  bits: Bit[];
  ship: Ship;
  /** How far up the screen the wide giggle wave has got, or below 0 with no wave. */
  giggleWave: number;
  combo: number;
  comboLeft: number;
  bestCombo: number;
  /** The laugh meter, 0 to 1. */
  meter: number;
  storm: number;
  stormTick: number;
  storms: number;
  score: number;
  tickled: number;
  /** Stars the ship caught, which is the part that takes moving around. */
  caught: number;
  total: number;
  boss: Boss | null;
  cat: Cat | null;
  catDone: boolean;
  goldenDone: boolean;
  powersGiven: number;
  powerOrder: PowerId[];
  finishIn: number;
}

export interface Result {
  levelId: LevelId;
  speedId: SpeedId;
  score: number;
  stars: number;
  tickled: number;
  total: number;
}

export const TICK = 1 / 60;
export const BOSS_AT = 46;
export const DEFAULT_FIELD: Field = { w: 64, h: 120 };
export const ALIEN_RADIUS = 5;
export const SHIP_RADIUS = 5;
export const FIRE_SECONDS = 0.2;

const SHIP_ROOM = 15;
const SHIP_SPEED = 1.7;
const SHOT_SPEED = 1.25;
const SHOT_RADIUS = 2;
const SHOT_LIMIT = 48;
const TRIPLE_SPREAD = 0.24;
const HELPER_GAP = 0.15;
const STEER_REACH = 5;
const STEER_POWER = 5;
const LAUGH_SECONDS = 1.7;
const COMBO_SECONDS = 1.8;
const METER_PER_TICKLE = 0.028;
const METER_PER_COMBO = 0.002;
const STORM_SECONDS = 4;
const STORM_TICK = 0.14;
const STORM_BOSS = 0.018;
const TICKLE_POINTS = 10;
const GOLDEN_POINTS = 100;
const CAT_POINTS = 50;
const BOSS_POINTS = 300;
const STAR_POINTS = 20;
const STAR_LIMIT = 28;
const STAR_FALL = 0.32;
const STAR_RADIUS = 7.5;
const STAR_SCATTER = 0.16;
const MAGNET_PULL = 2.2;
const GOO_FALL = 0.34;
const GOO_RADIUS = 3.5;
const GOO_SECONDS = 2.2;
const GOO_GRACE = 3.5;
const GOO_FIRE = 2.2;
const POWER_FALL = 0.27;
const POWER_RADIUS = 11;
const POWER_AWAY = 0.2;
const POWER_EDGE = 0.92;
const POWER_SECONDS: Record<PowerId, number> = { triple: 8, wave: 0, magnet: 8, helper: 9 };
const POWER_TIMES = [8, 16, 24, 32, 40, 50, 56];
const WAVE_SPEED = 0.9;
const WAVE_BOSS = 0.08;
const BOSS_RISE = 2.4;
const BOSS_Y = 0.3;
const BOSS_SWAY = 0.3;
const BOSS_SWAY_SPEED = 0.55;
const BOSS_MOVE = 0.35;
/** A boss nobody has tickled for a moment wanders over to the ship, so no child can ever get stuck. */
const BOSS_CURIOUS = 1.6;
const BOSS_VISIT = 4;
/** The boss's tickles are set for a phone, where it fills this share of the width. */
const BOSS_PHONE_WIDTH = 0.44;
const BOSS_FEWEST_TICKLES = 0.5;
/** Nobody can rush it: the slow crack-up is the show. */
const BOSS_SHORTEST = 10;
const BOSS_STAR_EVERY = 7;
const SNEEZE_AT = 0.5;
const SNEEZE_COUNT = 6;
const FIVE_SLAP = 1.3;
const FIVE_END = 3.2;
const FIVE_SHIP_Y = 0.72;
const CAT_SECONDS = 5.5;
const CAT_STARS = 8;
const CAT_BONUS_STARS = 4;
/** The part of the stars that counts as catching them all, as a few always get away. */
const STAR_CATCH = 0.8;

export const POWER_IDS: readonly PowerId[] = ['triple', 'wave', 'magnet', 'helper'];

const PORTRAIT_UNITS = 64;
const TALL_UNITS = 100;
const WIDE_UNITS = 150;

/** How many world units a play area of this many pixels shows. Tall screens get a tall field and wide ones a wide field. */
export function fieldFor(width: number, height: number): Field {
  const unit = Math.max(Math.min(width / PORTRAIT_UNITS, height / TALL_UNITS), width / WIDE_UNITS);
  return { w: width / unit, h: height / unit };
}

/** Round, and never more than about half the width of a phone. */
export function bossRadius(field: Field): number {
  return Math.min(field.w * 0.22, field.h * 0.2, 26);
}

function shipY(field: Field): number {
  return 1 - SHIP_ROOM / field.h;
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createGame(levelId: LevelId, speedId: SpeedId, rng: Rng, field: Field = DEFAULT_FIELD, surprises?: Surprises): Game {
  const spawns = planWaves(levelId, speedId, rng);
  return {
    levelId,
    speedId,
    speed: SPEEDS[speedId],
    field,
    rng,
    phase: 'playing',
    clock: 0,
    spare: 0,
    spawns,
    nextSpawn: 0,
    nextWave: 0,
    surprises: surprises ?? planSurprises(rng),
    aliens: [],
    shots: [],
    goos: [],
    drops: [],
    bits: [],
    ship: {
      x: 0.5,
      y: shipY(field),
      target: 0.5,
      push: 0,
      goo: 0,
      gooGrace: 0,
      triple: 0,
      magnet: 0,
      helper: 0,
      fireIn: 0.1,
      fired: 0,
      lean: 0,
    },
    giggleWave: -1,
    combo: 0,
    comboLeft: 0,
    bestCombo: 0,
    meter: 0,
    storm: 0,
    stormTick: 0,
    storms: 0,
    score: 0,
    tickled: 0,
    caught: 0,
    total: spawns.length,
    boss: null,
    cat: null,
    catDone: false,
    goldenDone: false,
    powersGiven: 0,
    powerOrder: shuffled(POWER_IDS, rng),
    finishIn: 0,
  };
}

/** The screen's shape changed. Everything is stored as parts of the screen, so it just fits. */
export function setField(game: Game, field: Field): void {
  game.field = field;
  game.ship.y = shipY(field);
}

/** Where the ship should head, from 0 at the left to 1 at the right. */
export function setTarget(game: Game, x: number): void {
  game.ship.target = Math.max(0, Math.min(1, x));
  game.ship.push = 0;
}

/** For the arrow keys: -1, 0 or 1. */
export function setPush(game: Game, direction: number): void {
  game.ship.push = direction;
  if (direction === 0) game.ship.target = game.ship.x;
}

function gap2(game: Game, ax: number, ay: number, bx: number, by: number): number {
  const dx = (ax - bx) * game.field.w;
  const dy = (ay - by) * game.field.h;
  return dx * dx + dy * dy;
}

function touching(game: Game, ax: number, ay: number, bx: number, by: number, reach: number): boolean {
  return gap2(game, ax, ay, bx, by) < reach * reach;
}

function onScreen(thing: { x: number; y: number }): boolean {
  return thing.x > 0 && thing.x < 1 && thing.y > 0 && thing.y < 1;
}

function comboBonus(combo: number): number {
  if (combo >= 10) return 3;
  return combo >= 5 ? 2 : 1;
}

function addStar(game: Game, x: number, y: number): void {
  if (game.bits.length >= STAR_LIMIT) return;
  game.bits.push({ x, y, vx: (game.rng() - 0.5) * STAR_SCATTER, age: 0 });
}

function raiseMeter(game: Game, events: GameEvent[]): void {
  if (game.storm > 0 || game.phase === 'highFive') return;
  game.meter = Math.min(1, game.meter + METER_PER_TICKLE + Math.min(game.combo, 10) * METER_PER_COMBO);
  if (game.meter < 1) return;
  game.storm = STORM_SECONDS;
  game.stormTick = 0;
  game.storms += 1;
  events.push({ type: 'storm' });
}

function counted(alien: Alien): boolean {
  return alien.spawn.kind !== 'goldie' && alien.spawn.kind !== 'achoo';
}

function tickle(game: Game, alien: Alien, events: GameEvent[]): void {
  game.combo += 1;
  game.comboLeft = COMBO_SECONDS;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  const storming = game.storm > 0;
  const points = alien.spawn.kind === 'goldie' ? GOLDEN_POINTS : TICKLE_POINTS;
  game.score += points * comboBonus(game.combo) * (storming ? 2 : 1);
  if (counted(alien)) game.tickled += 1;
  alien.laughing = 0;
  alien.drift = (game.rng() - 0.5) * 0.3;
  addStar(game, alien.x, alien.y);
  events.push({ type: 'tickle', kind: alien.spawn.kind, x: alien.x, y: alien.y, combo: game.combo, storm: storming });
  raiseMeter(game, events);
}

function landOn(game: Game, alien: Alien, events: GameEvent[]): void {
  alien.tickles -= 1;
  if (alien.tickles > 0) {
    alien.nudge = 1;
    events.push({ type: 'nudge', x: alien.x, y: alien.y });
    return;
  }
  tickle(game, alien, events);
}

function fireFrom(game: Game, x: number, vx: number, events: GameEvent[]): void {
  if (game.shots.length >= SHOT_LIMIT) return;
  const { ship } = game;
  const kind: ShotKind = ship.fired % 2 === 0 ? 'feather' : 'bubble';
  ship.fired += 1;
  game.shots.push({ kind, tint: ship.fired % 3, x, y: ship.y - 7 / game.field.h, vx, age: 0 });
  events.push({ type: 'shot', kind, x, y: ship.y });
}

function fire(game: Game, events: GameEvent[]): void {
  const { ship } = game;
  ship.fireIn -= TICK;
  if (ship.fireIn > 0) return;
  ship.fireIn += FIRE_SECONDS * (ship.goo > 0 ? GOO_FIRE : 1);
  fireFrom(game, ship.x, 0, events);
  if (ship.triple > 0) {
    fireFrom(game, ship.x, -TRIPLE_SPREAD, events);
    fireFrom(game, ship.x, TRIPLE_SPREAD, events);
  }
  if (ship.helper > 0) fireFrom(game, helperX(game), 0, events);
}

/** The helper ship keeps to the roomier side of the ship. */
export function helperX(game: Game): number {
  const { x } = game.ship;
  return x > 0.5 ? x - HELPER_GAP : x + HELPER_GAP;
}

function stepShip(game: Game, events: GameEvent[]): void {
  const { ship } = game;
  ship.goo = Math.max(0, ship.goo - TICK);
  ship.gooGrace = Math.max(0, ship.gooGrace - TICK);
  ship.triple = Math.max(0, ship.triple - TICK);
  ship.magnet = Math.max(0, ship.magnet - TICK);
  ship.helper = Math.max(0, ship.helper - TICK);
  if (game.phase === 'highFive') {
    ship.target = 0.5;
    ship.y += (FIVE_SHIP_Y - ship.y) * Math.min(1, TICK * 3);
  } else {
    fire(game, events);
  }
  if (ship.push !== 0 && game.phase !== 'highFive') ship.target = Math.max(0, Math.min(1, ship.x + ship.push * 0.1));
  const step = SHIP_SPEED * TICK * (ship.goo > 0 ? 0.75 : 1);
  const move = Math.max(-step, Math.min(step, ship.target - ship.x));
  ship.x += move;
  ship.lean += (move / step - ship.lean) * Math.min(1, TICK * 10);
}

function spawnAliens(game: Game, events: GameEvent[]): void {
  while (game.nextSpawn < game.spawns.length && game.spawns[game.nextSpawn].at <= game.clock) {
    addAlien(game, game.spawns[game.nextSpawn]);
    game.nextSpawn += 1;
  }
  if (game.nextWave < WAVES && game.clock >= waveTime(game.nextWave)) {
    events.push({ type: 'wave', index: game.nextWave });
    game.nextWave += 1;
  }
}

function addAlien(game: Game, spawn: Spawn): void {
  const spot: Point = { u: 0, v: 0 };
  pathPoint(spawn.pattern, 0, spawn.slot, spawn.side, spot, spawn.center, spawn.width);
  game.aliens.push({ spawn, x: spot.u, y: spot.v, age: 0, tickles: spawn.tickles, gooIndex: 0, laughing: -1, drift: 0, nudge: 0 });
}

const spot: Point = { u: 0, v: 0 };

function stepAlien(game: Game, alien: Alien, events: GameEvent[]): boolean {
  alien.nudge = Math.max(0, alien.nudge - TICK * 5);
  if (alien.laughing >= 0) {
    alien.laughing += TICK;
    alien.y -= 0.16 * TICK;
    alien.x += alien.drift * TICK;
    return alien.laughing < LAUGH_SECONDS;
  }
  alien.age += TICK;
  const p = alien.age / alien.spawn.seconds;
  if (p >= 1) return false;
  pathPoint(alien.spawn.pattern, p, alien.spawn.slot, alien.spawn.side, spot, alien.spawn.center, alien.spawn.width);
  alien.x = spot.u;
  alien.y = spot.v;
  const dropAt = alien.spawn.goo[alien.gooIndex];
  if (dropAt !== undefined && p >= dropAt) {
    alien.gooIndex += 1;
    if (onScreen(alien) && game.phase === 'playing') {
      game.goos.push({ x: alien.x, y: alien.y, vx: 0, age: 0 });
      events.push({ type: 'gooDrop', x: alien.x, y: alien.y });
    }
  }
  return true;
}

function stepAliens(game: Game, events: GameEvent[]): void {
  game.aliens = game.aliens.filter((alien) => stepAlien(game, alien, events));
}

/** Feathers bend a little toward the nearest grumpy alien, so small hands still land them. */
function steerShot(game: Game, shot: Shot): void {
  if (game.speed.assist === 0) return;
  let best = STEER_REACH / game.field.w;
  let aim = 0;
  let found = false;
  for (const alien of game.aliens) {
    if (alien.laughing >= 0 || alien.y >= shot.y || !onScreen(alien)) continue;
    const away = Math.abs(alien.x - shot.x);
    if (away < best) {
      best = away;
      aim = alien.x - shot.x;
      found = true;
    }
  }
  if (found) shot.vx += (aim * STEER_POWER * game.speed.assist - shot.vx) * 0.18;
}

function hitAlien(game: Game, shot: Shot, events: GameEvent[]): boolean {
  for (const alien of game.aliens) {
    if (alien.laughing >= 0 || !onScreen(alien)) continue;
    if (touching(game, shot.x, shot.y, alien.x, alien.y, ALIEN_RADIUS + SHOT_RADIUS)) {
      landOn(game, alien, events);
      return true;
    }
  }
  return false;
}

function tickleBoss(boss: Boss, amount: number): void {
  const allowed = boss.tickled / BOSS_SHORTEST;
  boss.laugh = Math.min(allowed, boss.laugh + amount);
}

/** On a wide screen the boss is a smaller target, so each tickle counts for more. */
function bossTickles(game: Game): number {
  const share = (bossRadius(game.field) * 2) / game.field.w;
  return game.speed.bossTickles * Math.max(BOSS_FEWEST_TICKLES, share / BOSS_PHONE_WIDTH);
}

function hitBoss(game: Game, shot: Shot, events: GameEvent[]): boolean {
  const { boss } = game;
  if (!boss || boss.age < BOSS_RISE) return false;
  if (!touching(game, shot.x, shot.y, boss.x, boss.y, bossRadius(game.field))) return false;
  tickleBoss(boss, 1 / bossTickles(game));
  boss.nudge = 1;
  boss.lonely = 0;
  boss.hits += 1;
  // Its stars scatter across the sky, so there's something to chase while tickling.
  if (boss.hits % BOSS_STAR_EVERY === 0) addStar(game, 0.1 + game.rng() * 0.8, boss.y);
  events.push({ type: 'bossHit', x: shot.x, y: shot.y });
  return true;
}

function hitCat(game: Game, shot: Shot, events: GameEvent[]): boolean {
  const { cat } = game;
  if (!cat || cat.tickled || !touching(game, shot.x, shot.y, cat.x, cat.y, 9)) return false;
  cat.tickled = true;
  game.score += CAT_POINTS;
  for (let i = 0; i < CAT_BONUS_STARS; i++) addStar(game, cat.x, cat.y);
  events.push({ type: 'catStars', x: cat.x, y: cat.y });
  return true;
}

function stepShots(game: Game, events: GameEvent[]): void {
  game.shots = game.shots.filter((shot) => {
    shot.age += TICK;
    steerShot(game, shot);
    shot.x += shot.vx * TICK;
    shot.y -= SHOT_SPEED * TICK;
    if (shot.y < -0.05 || shot.x < -0.05 || shot.x > 1.05) return false;
    return !(hitAlien(game, shot, events) || hitBoss(game, shot, events) || hitCat(game, shot, events));
  });
}

function stepGoos(game: Game, events: GameEvent[]): void {
  const { ship } = game;
  game.goos = game.goos.filter((goo) => {
    goo.age += TICK;
    goo.y += GOO_FALL * game.speed.pace * TICK;
    goo.x += Math.sin(goo.age * 5) * 0.03 * TICK;
    if (ship.gooGrace <= 0 && game.storm <= 0 && touching(game, goo.x, goo.y, ship.x, ship.y, GOO_RADIUS + SHIP_RADIUS)) {
      ship.goo = GOO_SECONDS;
      ship.gooGrace = GOO_GRACE;
      events.push({ type: 'goo', x: goo.x, y: goo.y });
      return false;
    }
    return goo.y < 1.06;
  });
}

/** Power-ups fall away from the ship, so catching one always means going for it. */
function dropPower(game: Game): void {
  const power = game.powerOrder[game.powersGiven % game.powerOrder.length];
  game.powersGiven += 1;
  const away = POWER_AWAY + game.rng() * POWER_AWAY;
  const { x } = game.ship;
  const roomRight = x + away <= POWER_EDGE;
  const roomLeft = x - away >= 1 - POWER_EDGE;
  const right = roomRight && (!roomLeft || game.rng() < 0.5);
  game.drops.push({ power, x: right ? x + away : x - away, y: -0.05, vx: 0, age: 0 });
}

function takePower(game: Game, power: PowerId): void {
  const { ship } = game;
  if (power === 'wave') game.giggleWave = ship.y;
  if (power === 'triple') ship.triple = POWER_SECONDS.triple;
  if (power === 'magnet') ship.magnet = POWER_SECONDS.magnet;
  if (power === 'helper') ship.helper = POWER_SECONDS.helper;
}

function stepDrops(game: Game, events: GameEvent[]): void {
  if (game.powersGiven < POWER_TIMES.length && game.clock >= POWER_TIMES[game.powersGiven]) dropPower(game);
  const { ship } = game;
  game.drops = game.drops.filter((drop) => {
    drop.age += TICK;
    drop.y += POWER_FALL * TICK;
    if (touching(game, drop.x, drop.y, ship.x, ship.y, POWER_RADIUS)) {
      takePower(game, drop.power);
      events.push({ type: 'power', power: drop.power, x: drop.x, y: drop.y });
      return false;
    }
    return drop.y < 1.06;
  });
}

function stepBits(game: Game, events: GameEvent[]): void {
  const { ship } = game;
  game.bits = game.bits.filter((bit) => {
    bit.age += TICK;
    if (ship.magnet > 0) {
      bit.x += (ship.x - bit.x) * MAGNET_PULL * 2 * TICK;
      bit.y += (ship.y - bit.y) * MAGNET_PULL * 2 * TICK;
    } else {
      bit.x += bit.vx * TICK;
      bit.y += STAR_FALL * TICK;
    }
    if (touching(game, bit.x, bit.y, ship.x, ship.y, STAR_RADIUS)) {
      game.score += STAR_POINTS;
      game.caught += 1;
      events.push({ type: 'star', x: bit.x, y: bit.y });
      return false;
    }
    return bit.y < 1.06;
  });
}

function stepGiggleWave(game: Game, events: GameEvent[]): void {
  if (game.giggleWave < 0) return;
  const before = game.giggleWave;
  game.giggleWave -= WAVE_SPEED * TICK;
  for (const alien of game.aliens) {
    if (alien.laughing >= 0 || !onScreen(alien)) continue;
    if (alien.y <= before && alien.y > game.giggleWave) {
      alien.tickles = 1;
      landOn(game, alien, events);
    }
  }
  const { boss } = game;
  if (boss && before > boss.y && game.giggleWave <= boss.y) tickleBoss(boss, WAVE_BOSS);
}

function stepStorm(game: Game, events: GameEvent[]): void {
  if (game.storm <= 0) return;
  game.storm -= TICK;
  game.stormTick -= TICK;
  if (game.stormTick <= 0) {
    game.stormTick += STORM_TICK;
    const alien = game.aliens.find((one) => one.laughing < 0 && onScreen(one));
    if (alien) {
      alien.tickles = 1;
      landOn(game, alien, events);
    }
    if (game.boss) tickleBoss(game.boss, STORM_BOSS);
  }
  if (game.storm <= 0) {
    game.storm = 0;
    game.meter = 0;
    events.push({ type: 'stormEnd' });
  }
}

function stepCombo(game: Game): void {
  if (game.comboLeft <= 0) return;
  game.comboLeft -= TICK;
  if (game.comboLeft <= 0) game.combo = 0;
}

function stepCat(game: Game, events: GameEvent[]): void {
  const at = game.surprises.cat;
  if (at !== null && !game.catDone && !game.cat && game.clock >= at) {
    game.cat = { x: -0.15, y: 0.14, age: 0, dropped: false, tickled: false };
    game.catDone = true;
    events.push({ type: 'cat' });
  }
  const { cat } = game;
  if (!cat) return;
  cat.age += TICK;
  const p = cat.age / CAT_SECONDS;
  cat.x = -0.15 + 1.3 * p;
  cat.y = 0.14 + 0.05 * Math.sin(p * Math.PI * 4);
  // It always shares its stars, so nobody has to catch it.
  if (!cat.dropped && p >= 0.45) {
    cat.dropped = true;
    for (let i = 0; i < CAT_STARS; i++) addStar(game, cat.x + (game.rng() - 0.5) * 0.3, cat.y);
  }
  if (p >= 1) game.cat = null;
}

function stepGolden(game: Game, events: GameEvent[]): void {
  const at = game.surprises.golden;
  if (at === null || game.goldenDone || game.clock < at) return;
  game.goldenDone = true;
  addAlien(game, goldenSpawn(game.clock, game.rng() < 0.5 ? 1 : -1));
  events.push({ type: 'golden' });
}

function startBoss(game: Game, events: GameEvent[]): void {
  game.phase = 'boss';
  game.goos = [];
  game.boss = {
    kind: levelById(game.levelId).boss,
    x: 0.5,
    y: -0.3,
    age: 0,
    laugh: 0,
    stage: 0,
    sneezed: false,
    tickled: 0,
    hits: 0,
    lonely: 0,
    visit: 0,
    nudge: 0,
    fiveAge: -1,
    slapped: false,
  };
  events.push({ type: 'bossComing' });
}

function startHighFive(game: Game, boss: Boss, events: GameEvent[]): void {
  game.phase = 'highFive';
  boss.fiveAge = 0;
  game.score += BOSS_POINTS;
  game.storm = 0;
  events.push({ type: 'bossDone', x: boss.x, y: boss.y });
}

function stepBoss(game: Game, events: GameEvent[]): void {
  const { boss } = game;
  if (!boss) return;
  boss.age += TICK;
  boss.nudge = Math.max(0, boss.nudge - TICK * 6);
  const rise = Math.min(1, boss.age / BOSS_RISE);
  boss.y = -0.3 + (BOSS_Y + 0.3) * rise * (2 - rise);
  boss.lonely += TICK;
  if (boss.lonely >= BOSS_CURIOUS) boss.visit = BOSS_VISIT;
  boss.visit = Math.max(0, boss.visit - TICK);
  const wander = 0.5 + BOSS_SWAY * Math.sin(boss.age * BOSS_SWAY_SPEED);
  const headFor = boss.visit > 0 ? game.ship.x : wander;
  const stride = BOSS_MOVE * TICK;
  boss.x += Math.max(-stride, Math.min(stride, headFor - boss.x));
  if (boss.fiveAge >= 0) {
    boss.fiveAge += TICK;
    if (!boss.slapped && boss.fiveAge >= FIVE_SLAP) {
      boss.slapped = true;
      events.push({ type: 'highFive', x: game.ship.x, y: game.ship.y });
    }
    if (boss.fiveAge >= FIVE_END) {
      game.phase = 'finished';
      events.push({ type: 'finish' });
    }
    return;
  }
  if (boss.age < BOSS_RISE) return;
  boss.tickled += TICK;
  if (boss.laugh >= 1 / 3 && boss.stage === 0) {
    boss.stage = 1;
    events.push({ type: 'bossGiggle', stage: 1 });
  }
  if (boss.laugh >= 2 / 3 && boss.stage === 1) {
    boss.stage = 2;
    events.push({ type: 'bossGiggle', stage: 2 });
  }
  if (game.surprises.sneeze && !boss.sneezed && boss.laugh >= SNEEZE_AT) {
    boss.sneezed = true;
    for (const spawn of sneezeSpawns(game.clock, SNEEZE_COUNT)) addAlien(game, spawn);
    events.push({ type: 'sneeze', x: boss.x, y: boss.y });
  }
  if (boss.laugh >= 1) startHighFive(game, boss, events);
}

function step(game: Game, events: GameEvent[]): void {
  game.clock += TICK;
  if (game.phase === 'playing' && game.clock >= BOSS_AT) startBoss(game, events);
  spawnAliens(game, events);
  stepGolden(game, events);
  stepCat(game, events);
  stepShip(game, events);
  stepAliens(game, events);
  stepShots(game, events);
  stepGoos(game, events);
  stepDrops(game, events);
  stepBits(game, events);
  stepGiggleWave(game, events);
  stepStorm(game, events);
  stepCombo(game);
  stepBoss(game, events);
}

/** Runs the game forward by real seconds, in fixed steps, so every device plays the same. */
export function advance(game: Game, seconds: number): GameEvent[] {
  const events: GameEvent[] = [];
  game.spare += seconds;
  while (game.spare >= TICK && game.phase !== 'finished') {
    game.spare -= TICK;
    step(game, events);
  }
  return events;
}

export function starsFor(game: Game): number {
  // Half is making everyone laugh and half is catching the stars they drop.
  const friends = Math.min(1, game.tickled / Math.max(1, game.total));
  const stars = Math.min(1, game.caught / Math.max(1, game.total * STAR_CATCH));
  const share = (friends + stars) / 2;
  return 1 + game.speed.starGood.filter((needed) => share >= needed).length;
}

export function resultOf(game: Game): Result {
  return {
    levelId: game.levelId,
    speedId: game.speedId,
    score: game.score,
    stars: starsFor(game),
    tickled: game.tickled,
    total: game.total,
  };
}
