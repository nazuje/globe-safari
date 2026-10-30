import { planFlight, spaced, type Flight, type PathPoint } from './flight.ts';
import {
  groundAt,
  railHeight,
  type Clue,
  type Decor,
  type Item,
  type ItemKind,
  type Jelly,
  type Land,
  type Level,
  type Pad,
  type Platform,
  type RouteTap,
  type Span,
} from './level.ts';
import type { Piece, Trail } from './pieces.ts';
import { CASTLE_SPEED, JELLY_HEIGHT, PAD_REACH, RAIL_HEIGHT, RUNNER_HEIGHT, SPRING_SPEED, STOMP_SPEED, type Tuning } from './tuning.ts';
import { WORLDS, type WorldId } from './worlds.ts';

export interface LevelPlan {
  id: string;
  world: WorldId;
  /** What's hidden at the end of the high path, if this level has one. */
  treasure: string | null;
  /** Ends in the giant bouncy castle. */
  castle: boolean;
  pieces: Piece[];
}

/** A typical child's tap, which the star arcs are drawn for. */
export const TAP_HOLD = 0.09;
const STAR_GAP = 46;
const TRAIL_HEIGHT = 24;
/** Stars lie at least this high, so a hands-off runner passes under them, even on Easy's low hop. */
const OUT_OF_REACH = 78;
/** A few low stars keep a hands-off run from feeling empty. They add to the score, not to the level's stars. */
const CRUMB_GAP = 300;
const SPRING_STAR_GAP = 84;
const HOP_REST = 44;
const AHEAD_OF_NEXT_PIECE = 90;
const CLUE_GAP = 38;
const ON_PLATFORM_GAP = 58;
const CASTLE_FRIENDLY_GAP = 150;
/** Stars sit around the runner's middle, so flying through the arc collects them. */
const STAR_LIFT = RUNNER_HEIGHT / 2;
const HILL_CORNERS = 12;
const LANDING_ROOM = 24;
/** A double jump over a gap starts close to the edge, however far it could carry. */
const DOUBLE_LEAD = 36;
const START_RUN = 420;
const RUN_OUT = 520;
/** The level ends a little past the flag, or the castle, with solid ground to slow down on. */
const FINISH_AFTER = 110;
const GROUND_PAST_THE_END = 900;
const CASTLE_LENGTH = 1500;
const CASTLE_APPROACH = 140;
const STAIR_RISE = 62;
const STAIR_WIDTH = 150;
const STAIR_SPACING = 215;
const STONE_WIDTH = 120;
const STONE_SPACING = 210;
const MOVER_WIDTH = 160;
const MOVER_REACH = 44;
const MOVER_SIDE = 96;
const MOVER_SIDE_EASY = 70;
const MOVER_PERIOD = 3.2;
const SECRET_LENGTH = 1560;
const SECRET_PLATFORM_WIDTH = 520;
/** Clouds overlap into one walkway: having found the path, the treasure is the child's. */
const SECRET_PLATFORM_SPACING = 500;
const SECRET_PLATFORMS = 2;
const PIT_DEPTH = 150;
const DECOR_SPACING = 160;

/** Reachable by a spring and a double jump, and not by a spring alone. */
const SECRET_SHARE_OF_PEAK = 0.82;

interface Builder {
  plan: LevelPlan;
  tuning: Tuning;
  physics: { gravity: number; jump: number };
  flagX: number;
  lands: Land[];
  xs: number[];
  hs: number[];
  landFrom: number;
  x: number;
  h: number;
  items: Item[];
  platforms: Platform[];
  pads: Pad[];
  jellies: Jelly[];
  route: RouteTap[];
  rocketTo: number[];
  clues: Clue[];
  /** The planned route is in the air until here. */
  busyUntil: number;
}

interface Laid {
  piece: Piece;
  x: number;
  h: number;
  end: number;
  /** A gap that Easy has filled in with ground. */
  filled: boolean;
}

function corner(b: Builder, x: number, h: number): void {
  b.xs.push(x);
  b.hs.push(h);
  b.x = x;
  b.h = h;
}

function closeLand(b: Builder): void {
  b.lands.push({ from: b.landFrom, to: b.x, xs: b.xs, hs: b.hs });
  b.xs = [];
  b.hs = [];
}

function openLand(b: Builder, x: number, h: number): void {
  b.landFrom = x;
  corner(b, x, h);
}

function leap(b: Builder, across: number, rise: number): void {
  closeLand(b);
  openLand(b, b.x + across, b.h + rise);
}

function smoothRise(b: Builder, rise: number, len: number): void {
  const fromX = b.x;
  const fromH = b.h;
  for (let i = 1; i <= HILL_CORNERS; i++) {
    const share = i / HILL_CORNERS;
    corner(b, fromX + len * share, fromH + rise * (1 - Math.cos(share * Math.PI)) * 0.5);
  }
}

function layHill(b: Builder, height: number, len: number): void {
  const fromX = b.x;
  const fromH = b.h;
  for (let i = 1; i <= HILL_CORNERS * 2; i++) {
    const share = i / (HILL_CORNERS * 2);
    corner(b, fromX + len * share, fromH + height * (1 - Math.cos(share * Math.PI * 2)) * 0.5);
  }
}

function layGap(b: Builder, across: number, rise: number, keep: boolean): void {
  if (keep) leap(b, across, rise);
  else if (rise === 0) corner(b, b.x + across, b.h);
  else smoothRise(b, rise, across);
}

/** How much longer a jump lasts here. On the moon everything floats, so floating things sit further apart. */
function stretch(b: Builder): number {
  return b.physics.jump / b.physics.gravity;
}

/** Easy's automatic jump needs a narrower gap either side of a moving platform. */
function moverSide(b: Builder): number {
  return (b.tuning.assist ? MOVER_SIDE_EASY : MOVER_SIDE) * stretch(b);
}

function kept(b: Builder, easyAllowed: boolean): boolean {
  return !b.tuning.assist || easyAllowed;
}

function layPiece(b: Builder, piece: Piece): boolean {
  switch (piece.kind) {
    case 'run':
    case 'arc':
      corner(b, b.x + piece.len, b.h);
      return false;
    case 'hill':
      layHill(b, piece.height, piece.len);
      return false;
    case 'slope':
      smoothRise(b, piece.rise, piece.len);
      return false;
    case 'gap': {
      const keep = kept(b, piece.easy);
      layGap(b, piece.len * b.tuning.gapScale, piece.rise, keep);
      return !keep;
    }
    case 'jellies':
      corner(b, b.x + 360 + piece.count * 300, b.h);
      return false;
    case 'mushroom':
      corner(b, b.x + piece.len, b.h);
      return false;
    case 'stairs':
      corner(b, b.x + 260 + piece.count * STAIR_SPACING + 180, b.h);
      return false;
    case 'stones': {
      const keep = kept(b, false);
      layGap(b, STONE_SPACING * stretch(b) * (piece.count + 1) - STONE_WIDTH, 0, keep);
      return !keep;
    }
    case 'mover': {
      const keep = kept(b, piece.easy);
      layGap(b, moverSide(b) * 2 + MOVER_WIDTH, 0, keep);
      return !keep;
    }
    case 'boots':
      corner(b, b.x + 200, b.h);
      leap(b, 240, 0);
      corner(b, b.x + 240, b.h);
      leap(b, 240, 0);
      corner(b, b.x + piece.len - 920 + 200, b.h);
      return false;
    case 'secret':
      corner(b, b.x + SECRET_LENGTH, b.h);
      return false;
  }
}

function speedHere(b: Builder, x: number): number {
  const { speed, ramp } = b.tuning;
  return speed * (1 + (ramp - 1) * Math.min(1, Math.max(0, x / b.flagX)));
}

function flight(b: Builder, x: number, y: number, toY: number, options: { double?: boolean; launch?: number; hold?: number } = {}): Flight {
  return planFlight({
    x,
    y,
    physics: b.physics,
    speedAt: (at) => speedHere(b, at),
    hold: options.hold ?? TAP_HOLD,
    ...(options.launch === undefined ? {} : { launch: options.launch }),
    ...(options.double ? { double: true } : {}),
    stop: (_x, height, vy) => vy < 0 && height <= toY,
  });
}

function placeItem(b: Builder, x: number, y: number, kind: ItemKind, extra = false): void {
  b.items.push({ x, y, kind, extra });
}

/** The part of a flight that a hands-off runner can't reach, however low it hops. */
function highPart(b: Builder, path: readonly PathPoint[]): PathPoint[] {
  let ground = path[0]?.y ?? 0;
  return path.filter((point) => {
    ground = groundAt(b, point.x) ?? ground;
    return point.y - ground >= OUT_OF_REACH;
  });
}

interface StarOptions {
  extra?: boolean;
  kind?: ItemKind;
  gap?: number;
}

/** Stars along the high part of a flight, with a carrot at the top as the prize for the best bit of the jump. */
function starsAlong(b: Builder, path: readonly PathPoint[], { extra = false, kind = 'star', gap = STAR_GAP }: StarOptions = {}): void {
  const placed = spaced(highPart(b, path), gap, 0, 0);
  const top = placed.reduce((best, point, i) => (point.y > placed[best]!.y ? i : best), 0);
  placed.forEach((point, i) => placeItem(b, point.x, point.y + STAR_LIFT, i === top ? 'carrot' : kind, extra));
}

function crumbs(b: Builder, from: number, to: number): void {
  for (let x = from + 30; x < to - 20; x += CRUMB_GAP) {
    const ground = groundAt(b, x);
    if (ground !== null) placeItem(b, x, ground + TRAIL_HEIGHT, 'star', true);
  }
}

function hopToGround(b: Builder, x: number, y: number): Flight {
  return planFlight({
    x,
    y,
    physics: b.physics,
    speedAt: (at) => speedHere(b, at),
    hold: TAP_HOLD,
    stop: (at, height, vy) => vy < 0 && height <= (groundAt(b, at) ?? -Infinity),
  });
}

/** A run of hops along the ground, each an arc of stars: the level's main way of asking for a tap. */
function trailAlong(b: Builder, from: number, to: number, trail: Trail): void {
  if (trail === 'none') return;
  crumbs(b, from, to);
  let x = Math.max(from + 40, b.busyUntil + HOP_REST);
  let count = 0;
  while (true) {
    const ground = groundAt(b, x);
    if (ground === null) return;
    const hop = hopToGround(b, x, ground);
    const end = hop.path.at(-1)!.x;
    if (!hop.landed || end > to - AHEAD_OF_NEXT_PIECE) return;
    starsAlong(b, hop.path, { kind: trail === 'carrots' || (trail === 'mixed' && count % 2 === 1) ? 'carrot' : 'star' });
    tap(b, x, hop);
    x = end + HOP_REST;
    count++;
  }
}

function tap(b: Builder, x: number, flightInfo?: Flight, secret = false): void {
  b.route.push({ x, hold: TAP_HOLD, secret });
  if (flightInfo?.doubleX != null) b.route.push({ x: flightInfo.doubleX, hold: 0.02, secret });
  if (flightInfo && !secret) b.busyUntil = Math.max(b.busyUntil, flightInfo.path.at(-1)!.x);
}

/** The jump over a gap of this width, centred, using one jump if it comfortably reaches and two if not. */
function jumpAcross(b: Builder, from: number, to: number, fromH: number, toH: number): { x: number; flight: Flight } {
  const width = to - from;
  const single = flight(b, from, fromH, toH);
  const reach = single.path.at(-1)!.x - from;
  const double = reach < width + LANDING_ROOM * 2;
  const chosen = double ? flight(b, from, fromH, toH, { double: true }) : single;
  const distance = chosen.path.at(-1)!.x - from;
  if (distance < width) throw new Error(`${b.plan.id}: a gap at ${Math.round(from)} is too wide (${Math.round(width)} over ${Math.round(distance)})`);
  const takeoff = from - Math.min((distance - width) / 2, double ? DOUBLE_LEAD : Infinity);
  return { x: takeoff, flight: flight(b, takeoff, fromH, toH, { double }) };
}

function placeGap(b: Builder, laid: Laid, width: number, rise: number): void {
  const landing = laid.x + width;
  const { x, flight: path } = jumpAcross(b, laid.x, landing, laid.h, laid.h + rise);
  starsAlong(b, path.path);
  tap(b, x, path);
}

function placeArc(b: Builder, laid: Laid, double: boolean): void {
  const measured = flight(b, laid.x, laid.h, laid.h, { double });
  const distance = measured.path.at(-1)!.x - laid.x;
  const takeoff = laid.x + (laid.end - laid.x - distance) / 2;
  const path = flight(b, takeoff, laid.h, laid.h, { double });
  starsAlong(b, path.path);
  tap(b, takeoff, path);
}

function placeJellies(b: Builder, laid: Laid, count: number, patrol: number): void {
  const top = laid.h + JELLY_HEIGHT;
  const up = flight(b, laid.x, laid.h, top);
  const distance = up.path.at(-1)!.x - laid.x;
  let x = laid.x + 200;
  const takeoff = x - distance;
  const approach = flight(b, takeoff, laid.h, top);
  starsAlong(b, approach.path);
  tap(b, takeoff, approach);
  for (let i = 0; i < count; i++) {
    b.jellies.push({ x, y: laid.h, patrol: i === 0 ? patrol : 0, period: 2.4 });
    const onward = flight(b, x, top, i === count - 1 ? laid.h : top, { launch: STOMP_SPEED * b.physics.jump });
    starsAlong(b, onward.path);
    x = onward.path.at(-1)!.x;
    b.busyUntil = Math.max(b.busyUntil, x);
  }
}

function placeMushroom(b: Builder, laid: Laid, double: boolean): void {
  const x = laid.x + 90;
  b.pads.push({ x, y: laid.h, golden: false });
  const path = flight(b, x - PAD_REACH, laid.h, laid.h, { launch: SPRING_SPEED * b.physics.jump, double });
  // A spring throws anyone, so its stars are a bonus and not part of the level's three.
  starsAlong(b, path.path, { extra: true, gap: SPRING_STAR_GAP });
  if (path.doubleX !== null) b.route.push({ x: path.doubleX, hold: 0.02, secret: false });
  b.busyUntil = Math.max(b.busyUntil, path.path.at(-1)!.x);
}

function placeStairs(b: Builder, laid: Laid, count: number): void {
  let fromH = laid.h;
  let x = laid.x + 260;
  for (let i = 0; i < count; i++) {
    const top = laid.h + STAIR_RISE * (i + 1);
    b.platforms.push({ x, y: top, w: STAIR_WIDTH, moveX: 0, moveY: 0, period: 1, kind: 'stone' });
    const path = flight(b, x - 200, fromH, top);
    const takeoff = x - (path.path.at(-1)!.x - (x - 200));
    tap(b, takeoff);
    trailOver(b, x - STAIR_WIDTH / 2, x + STAIR_WIDTH / 2, top);
    fromH = top;
    x += STAIR_SPACING;
  }
  b.busyUntil = Math.max(b.busyUntil, laid.end - 60);
}

function trailOver(b: Builder, from: number, to: number, y: number, extra = false): void {
  for (let at = from + 30; at <= to - 20; at += ON_PLATFORM_GAP) placeItem(b, at, y + TRAIL_HEIGHT, 'star', extra);
}

/** A jump from a limited stretch of footing to a spot: as late as it needs to be, and doubled only if it must. */
function hopOnto(b: Builder, footing: [number, number], target: number, fromH: number, toH: number): { x: number; flight: Flight } {
  const distanceOf = (double: boolean): number => flight(b, footing[0], fromH, toH, { double }).path.at(-1)!.x - footing[0];
  const single = distanceOf(false);
  const double = footing[1] + single < target;
  const distance = double ? distanceOf(true) : single;
  const x = Math.min(footing[1], Math.max(footing[0], target - distance));
  return { x, flight: flight(b, x, fromH, toH, { double }) };
}

function placeStones(b: Builder, laid: Laid, count: number): void {
  const spacing = STONE_SPACING * stretch(b);
  let footing: [number, number] = [laid.x - 200, laid.x - 8];
  for (let i = 0; i < count; i++) {
    const x = laid.x + spacing * (i + 1) - STONE_WIDTH / 2;
    b.platforms.push({ x, y: laid.h + (laid.filled ? 60 : 0), w: STONE_WIDTH, moveX: 0, moveY: 0, period: 1, kind: 'stone' });
    if (!laid.filled) {
      const across = hopOnto(b, footing, x, laid.h, laid.h);
      starsAlong(b, across.flight.path);
      tap(b, across.x, across.flight);
    }
    footing = [x + 8, x + STONE_WIDTH / 2 - 8];
  }
  if (laid.filled) return;
  const last = hopOnto(b, footing, laid.end + 40, laid.h, laid.h);
  starsAlong(b, last.flight.path);
  tap(b, last.x, last.flight);
}

function placeMover(b: Builder, laid: Laid, axis: 'x' | 'y'): void {
  const side = moverSide(b);
  const reach = b.tuning.assist ? MOVER_REACH / 2 : MOVER_REACH;
  const x = laid.x + side + MOVER_WIDTH / 2;
  const y = laid.h + (laid.filled ? 70 : 0);
  b.platforms.push({
    x,
    y,
    w: MOVER_WIDTH,
    moveX: axis === 'x' ? reach : 0,
    moveY: axis === 'y' ? reach : 0,
    period: MOVER_PERIOD,
    kind: 'mover',
  });
  trailOver(b, x - MOVER_WIDTH / 2 + 10, x + MOVER_WIDTH / 2 - 10, y, true);
  if (laid.filled) return;
  // A jump onto the middle of the platform, and one off it, which work wherever it has moved to.
  const on = hopOnto(b, [laid.x - 200, laid.x - 8], x - 16, laid.h, laid.h);
  starsAlong(b, on.flight.path);
  tap(b, on.x, on.flight);
  const off = hopOnto(b, [x + 4, x + MOVER_WIDTH / 2 - reach - 6], laid.end + 50, laid.h, laid.h);
  starsAlong(b, off.flight.path);
  tap(b, off.x, off.flight);
}

function placeBoots(b: Builder, laid: Laid): void {
  // Hung at the top of a hop, so it takes a tap to catch them.
  const takeoff = Math.max(laid.x + 30, b.busyUntil + HOP_REST);
  const hopUp = flight(b, takeoff, laid.h, laid.h);
  const top = hopUp.path.reduce((best, point) => (point.y > best.y ? point : best));
  placeItem(b, top.x, top.y + STAR_LIFT, 'boots', true);
  tap(b, takeoff);
  const to = laid.end - 90;
  b.busyUntil = Math.max(b.busyUntil, to);
  b.rocketTo.push(to);
  let count = 0;
  for (let x = laid.x + 300; x < to; x += 40) {
    const wave = Math.sin(count * 0.5) * 22;
    placeItem(b, x, railHeight(b, x, RAIL_HEIGHT) + STAR_LIFT + wave, count % 8 === 7 ? 'carrot' : 'star', true);
    count++;
  }
}

function placeSecret(b: Builder, laid: Laid): void {
  const padX = laid.x + 90;
  b.pads.push({ x: padX, y: laid.h, golden: true });
  const launch = SPRING_SPEED * b.physics.jump;
  const padTouch = padX - PAD_REACH;
  const full = flight(b, padTouch, laid.h, laid.h, { launch, double: true });
  const plain = flight(b, padTouch, laid.h, laid.h, { launch });
  const top = laid.h + Math.max(plain.peak - laid.h + 26, (full.peak - laid.h) * SECRET_SHARE_OF_PEAK);
  const reach = flight(b, padTouch, laid.h, top, { launch, double: true });
  // The cloud starts under the second tap, so a tap near the ring lands however early it came.
  const firstX = (reach.doubleX ?? padTouch) + SECRET_PLATFORM_WIDTH / 2 + 10;
  for (let i = 0; i < SECRET_PLATFORMS; i++) {
    const x = firstX + i * SECRET_PLATFORM_SPACING;
    b.platforms.push({ x, y: top, w: SECRET_PLATFORM_WIDTH, moveX: 0, moveY: 0, period: 1, kind: 'cloud' });
    const last = i === SECRET_PLATFORMS - 1;
    trailOver(b, x - SECRET_PLATFORM_WIDTH / 2, x + SECRET_PLATFORM_WIDTH / 2 - (last ? 90 : 0), top, true);
    if (last) placeItem(b, x + SECRET_PLATFORM_WIDTH / 2 - 50, top + 34, 'chest', true);
  }
  starsAlong(b, reach.path, { extra: true, gap: SPRING_STAR_GAP });
  if (reach.doubleX !== null) b.route.push({ x: reach.doubleX, hold: 0.02, secret: true });
  const tapPoint = reach.path.find((point) => point.x >= (reach.doubleX ?? padX)) ?? reach.path[0]!;
  b.clues.push({ path: spaced(reach.path, CLUE_GAP, 20, 0), tapX: tapPoint.x, tapY: tapPoint.y });
  crumbs(b, plain.path.at(-1)!.x + 40, laid.end);
  b.busyUntil = Math.max(b.busyUntil, laid.end - 200);
}

function placePiece(b: Builder, laid: Laid): void {
  const { piece } = laid;
  switch (piece.kind) {
    case 'run':
    case 'hill':
    case 'slope':
      trailAlong(b, laid.x, laid.end, piece.trail);
      return;
    case 'gap':
      placeGap(b, laid, laid.end - laid.x, piece.rise);
      return;
    case 'arc':
      placeArc(b, laid, piece.double);
      return;
    case 'jellies':
      placeJellies(b, laid, piece.count, piece.patrol);
      return;
    case 'mushroom':
      placeMushroom(b, laid, piece.double);
      return;
    case 'stairs':
      placeStairs(b, laid, piece.count);
      return;
    case 'stones':
      placeStones(b, laid, piece.count);
      return;
    case 'mover':
      placeMover(b, laid, piece.axis);
      return;
    case 'boots':
      placeBoots(b, laid);
      return;
    case 'secret':
      placeSecret(b, laid);
      return;
  }
}

function layAll(b: Builder): Laid[] {
  const laid: Laid[] = [];
  openLand(b, 0, 0);
  corner(b, START_RUN, 0);
  for (const piece of b.plan.pieces) {
    const x = b.x;
    const h = b.h;
    const filled = layPiece(b, piece);
    laid.push({ piece, x, h, end: b.x, filled });
  }
  corner(b, b.x + RUN_OUT, b.h);
  return laid;
}

function makeBuilder(plan: LevelPlan, tuning: Tuning, flagX: number): Builder {
  return {
    plan,
    tuning,
    physics: WORLDS[plan.world].physics,
    flagX,
    lands: [],
    xs: [],
    hs: [],
    landFrom: 0,
    x: 0,
    h: 0,
    items: [],
    platforms: [],
    pads: [],
    jellies: [],
    route: [],
    rocketTo: [],
    clues: [],
    busyUntil: 0,
  };
}

function hash(text: string): number {
  let value = 7;
  for (const letter of text) value = (value * 31 + letter.charCodeAt(0)) >>> 0;
  return value;
}

/** Scatters scenery from a number made out of the level's name, so a level always looks the same. */
function scatter(plan: LevelPlan, lands: Land[], jellyXs: readonly number[]): Decor[] {
  const art = WORLDS[plan.world].decor;
  let seed = hash(plan.id);
  const next = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const decor: Decor[] = [];
  for (const land of lands) {
    for (let x = land.from + 60; x < land.to - 60; x += DECOR_SPACING * (0.6 + next())) {
      const y = groundAt({ lands }, x);
      if (y === null || jellyXs.some((jelly) => Math.abs(jelly - x) < 60)) continue;
      decor.push({ x, y, art: art[Math.floor(next() * art.length)]!, size: 26 + next() * 26 });
    }
  }
  return decor;
}

/** A bounce alone reaches a few stars. A tap at the top of each bounce reaches the rest. */
function placeCastle(b: Builder, flagX: number): Span {
  const from = flagX + CASTLE_APPROACH;
  const to = from + CASTLE_LENGTH;
  const launch = CASTLE_SPEED * b.physics.jump;
  const plainTop = flight(b, from, b.h, b.h, { launch }).peak;
  for (let x = from; x < to - 240; ) {
    const bounce = flight(b, x, b.h, b.h, { launch, double: true });
    const above = bounce.path.filter((point) => point.y > plainTop + 46);
    for (const point of spaced(above, STAR_GAP, 0, 0)) placeItem(b, point.x, point.y + STAR_LIFT, 'star', true);
    if (bounce.doubleX !== null) b.route.push({ x: bounce.doubleX, hold: 0.02, secret: false });
    x = bounce.path.at(-1)!.x;
  }
  for (let x = from + 90; x < to - 120; x += CASTLE_FRIENDLY_GAP) placeItem(b, x, plainTop - 30, 'star', true);
  return { from, to };
}

/** Turns a level's written plan into the real thing, with its arcs worked out for this speed and gravity. */
export function buildLevel(plan: LevelPlan, tuning: Tuning): Level {
  const length = layAll(makeBuilder(plan, tuning, 1));
  const flagGuess = length.at(-1)!.end + RUN_OUT / 2;
  const b = makeBuilder(plan, tuning, flagGuess);
  const laid = layAll(b);
  const flagX = laid.at(-1)!.end + RUN_OUT / 2;
  if (plan.castle) corner(b, flagX + CASTLE_APPROACH + CASTLE_LENGTH + RUN_OUT, b.h);
  corner(b, b.x + GROUND_PAST_THE_END, b.h);
  closeLand(b);
  const bouncy = plan.castle ? [placeCastle(b, flagX)] : [];
  const endX = bouncy[0] ? bouncy[0].to + FINISH_AFTER : flagX + FINISH_AFTER;
  for (const each of laid) placePiece(b, each);
  b.items.sort((one, other) => one.x - other.x);
  b.route.sort((one, other) => one.x - other.x);
  const heights = b.lands.flatMap((land) => land.hs);
  return {
    id: plan.id,
    world: plan.world,
    physics: b.physics,
    tuning,
    lands: b.lands,
    platforms: b.platforms,
    pads: b.pads,
    clues: b.clues,
    jellies: b.jellies,
    items: b.items,
    decor: scatter(plan, b.lands, b.jellies.map((jelly) => jelly.x)),
    route: b.route,
    bouncy,
    rocketTo: b.rocketTo,
    flagX,
    endX,
    countable: b.items.filter((item) => !item.extra && item.kind !== 'boots').length,
    pitY: Math.min(...heights) - PIT_DEPTH,
    treasure: plan.treasure,
    castle: plan.castle,
  };
}
