import { COLOR_CODE, STEP_X, STEP_Y, Tile, type Board, type Color, type Piece } from './board.ts';

const CODE_COLOR: readonly Color[] = ['white', 'red', 'green', 'blue'];
const COLOR_COUNT = CODE_COLOR.length;
const MOST_BLOCK_STEPS = 8;
/** Half a tile: where a beam stops when something solid is in the way. */
const FACE = 0.5;

/** A straight run of light, in tile units, with x and y measured to tile centers. */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Color;
}

export interface Spark {
  x: number;
  y: number;
  color: Color;
}

export interface Trace {
  segments: Segment[];
  /** Where a beam bounced, split or jumped: these get the sparkle. */
  bounces: Spark[];
  /** Bit per target, set when the right color reached it. */
  lit: number;
  /** Bit per target, set when the wrong color reached it. */
  wrong: number;
  /** Bit per piece, set when light touched its working side. */
  touched: number;
  /** Bit per switch pad, set while a beam rests on it. */
  pressed: number;
  secret: boolean;
}

interface Ray {
  at: number;
  dir: number;
  color: number;
  /** Tile the light started from, drawn from its center. */
  fromX: number;
  fromY: number;
}

/**
 * Which way light leaves a mirror, or -1 if it hits the back.
 *
 * A plain mirror at turn t has its working sides at t and t + 1: turn 0 faces north and east. A two-sided
 * mirror or a splitter has the same sides, plus the opposite pair.
 */
export function bounceDir(piece: Pick<Piece, 'kind'>, turn: number, dir: number): number {
  const from = (dir + 2) % 4;
  const facing = piece.kind === 'mirror' ? turn : turn % 2;
  const offset = (from - facing + 4) % 4;
  if (piece.kind === 'mirror') {
    if (offset === 0) return (facing + 1) % 4;
    return offset === 1 ? facing : -1;
  }
  return (from + (offset % 2 === 0 ? 1 : 3)) % 4;
}

const blockOn = (board: Board, at: number, blocks: number): boolean =>
  board.blocks.some(({ home, away }, index) => at === ((blocks >> index) & 1 ? away : home));

/** Light through a filter: white takes the color, the same color passes, another color stops. -1 means stopped. */
export function afterFilter(beam: number, filter: number): number {
  if (beam === COLOR_CODE.white) return filter;
  return beam === filter ? beam : -1;
}

interface Tracer {
  board: Board;
  turns: readonly number[];
  blocks: number;
  seen: Uint8Array;
  rays: Ray[];
  out: Trace;
}

function endRay(tracer: Tracer, ray: Ray, x: number, y: number): void {
  tracer.out.segments.push({ x1: ray.fromX, y1: ray.fromY, x2: x, y2: y, color: CODE_COLOR[ray.color] });
}

function spark(tracer: Tracer, x: number, y: number, color: number): void {
  tracer.out.bounces.push({ x, y, color: CODE_COLOR[color] });
}

function hitPiece(tracer: Tracer, ray: Ray, x: number, y: number): boolean {
  const { board, turns, out, rays } = tracer;
  const index = board.items[ray.at];
  const piece = board.pieces[index];
  const next = bounceDir(piece, turns[index], ray.dir);
  endRay(tracer, ray, x, y);
  if (next < 0) return true;
  out.touched |= 1 << index;
  spark(tracer, x, y, ray.color);
  rays.push({ ...ray, dir: next, fromX: x, fromY: y });
  if (piece.kind === 'splitter') rays.push({ ...ray, fromX: x, fromY: y });
  return true;
}

function hitTarget(tracer: Tracer, ray: Ray, x: number, y: number): boolean {
  const index = tracer.board.items[ray.at];
  const wanted = COLOR_CODE[tracer.board.targets[index].color];
  endRay(tracer, ray, x, y);
  if (wanted === COLOR_CODE.white || wanted === ray.color) tracer.out.lit |= 1 << index;
  else tracer.out.wrong |= 1 << index;
  return true;
}

function hitFilter(tracer: Tracer, ray: Ray, x: number, y: number): boolean {
  const filter = tracer.board.filters[tracer.board.items[ray.at]];
  const color = afterFilter(ray.color, COLOR_CODE[filter.color]);
  if (color < 0) {
    endRay(tracer, ray, x - STEP_X[ray.dir] * FACE, y - STEP_Y[ray.dir] * FACE);
    return true;
  }
  if (color !== ray.color) {
    endRay(tracer, ray, x, y);
    ray.fromX = x;
    ray.fromY = y;
    ray.color = color;
  }
  return false;
}

function hitPortal(tracer: Tracer, ray: Ray, x: number, y: number): boolean {
  const { board, rays } = tracer;
  const mate = board.portals[board.items[ray.at]].mate;
  endRay(tracer, ray, x, y);
  const mateX = mate % board.width;
  const mateY = Math.floor(mate / board.width);
  spark(tracer, x, y, ray.color);
  spark(tracer, mateX, mateY, ray.color);
  rays.push({ ...ray, at: mate, fromX: mateX, fromY: mateY });
  return true;
}

/** True when this tile ends the current ray. */
function hitTile(tracer: Tracer, ray: Ray, x: number, y: number): boolean {
  const { board, blocks, out } = tracer;
  if (blockOn(board, ray.at, blocks)) {
    endRay(tracer, ray, x - STEP_X[ray.dir] * FACE, y - STEP_Y[ray.dir] * FACE);
    return true;
  }
  switch (board.tiles[ray.at]) {
    case Tile.Wall:
    case Tile.Laser:
      endRay(tracer, ray, x - STEP_X[ray.dir] * FACE, y - STEP_Y[ray.dir] * FACE);
      return true;
    case Tile.Target:
      return hitTarget(tracer, ray, x, y);
    case Tile.Piece:
      return hitPiece(tracer, ray, x, y);
    case Tile.Filter:
      return hitFilter(tracer, ray, x, y);
    case Tile.Portal:
      return hitPortal(tracer, ray, x, y);
    case Tile.Pad:
      out.pressed |= 1 << (board.items[ray.at]);
      endRay(tracer, ray, x, y);
      return true;
    default:
      if (ray.at === board.secret) out.secret = true;
      return false;
  }
}

function runRay(tracer: Tracer, ray: Ray): void {
  const { board, seen } = tracer;
  for (;;) {
    const key = (ray.at * 4 + ray.dir) * COLOR_COUNT + ray.color;
    if (seen[key]) {
      const x = ray.at % board.width;
      endRay(tracer, ray, x, Math.floor(ray.at / board.width));
      return;
    }
    seen[key] = 1;
    const x = (ray.at % board.width) + STEP_X[ray.dir];
    const y = Math.floor(ray.at / board.width) + STEP_Y[ray.dir];
    if (x < 0 || y < 0 || x >= board.width || y >= board.height) {
      endRay(tracer, ray, x - STEP_X[ray.dir] * FACE, y - STEP_Y[ray.dir] * FACE);
      return;
    }
    ray.at = y * board.width + x;
    if (hitTile(tracer, ray, x, y)) return;
  }
}

/** Follows every beam across the board. */
export function traceBeams(board: Board, turns: readonly number[], blocks: number): Trace {
  const out: Trace = { segments: [], bounces: [], lit: 0, wrong: 0, touched: 0, pressed: 0, secret: false };
  const tracer: Tracer = {
    board,
    turns,
    blocks,
    seen: new Uint8Array(board.width * board.height * 4 * COLOR_COUNT),
    rays: [],
    out,
  };
  for (const { at, dir, color } of board.lasers) {
    tracer.rays.push({ at, dir, color: COLOR_CODE[color], fromX: at % board.width, fromY: Math.floor(at / board.width) });
  }
  for (let ray = tracer.rays.pop(); ray; ray = tracer.rays.pop()) runRay(tracer, ray);
  return out;
}

export interface Settled {
  blocks: number;
  pressed: number;
  trace: Trace;
}

/**
 * Lets the blocks react. A switch fires only at the moment light arrives on it, and a block stays put after
 * that, so the order of taps can matter. A chain of switches is cut off rather than left to spin.
 */
export function settle(board: Board, turns: readonly number[], blocks: number, pressed: number): Settled {
  let nowBlocks = blocks;
  let nowPressed = pressed;
  let trace = traceBeams(board, turns, nowBlocks);
  for (let step = 0; step < MOST_BLOCK_STEPS; step += 1) {
    const arrived = trace.pressed & ~nowPressed;
    nowPressed = trace.pressed;
    if (arrived === 0) break;
    board.pads.forEach((pad, index) => {
      if ((arrived >> index) & 1) nowBlocks ^= 1 << pad.block;
    });
    trace = traceBeams(board, turns, nowBlocks);
  }
  return { blocks: nowBlocks, pressed: nowPressed, trace };
}

export const allLit = (board: Board, trace: Trace): boolean => trace.lit === (1 << board.targets.length) - 1;
