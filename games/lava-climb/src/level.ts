import { AIR, BELT_LEFT, BELT_RIGHT, CRUMBLE, FAKE, GRIP, ICE, LEDGE, PAD, ROCK, SPIKE_DOWN, SPIKE_LEFT, SPIKE_RIGHT, SPIKE_UP, isSolid, isSurface } from './tiles.ts';
import { COLS, HERO_H, TICKS_PER_SECOND, TILE } from './tuning.ts';

/** A platform that swings between two points, as a pure function of the clock. */
export interface Mover {
  x: number;
  y: number;
  w: number;
  /** How far it travels, in units. */
  dx: number;
  dy: number;
  period: number;
  phase: number;
}

/** A hole in the ceiling that drops a rock on a steady beat, as a pure function of the clock. */
export interface Dropper {
  x: number;
  top: number;
  /** Where the rock lands. Its shadow shows here first. */
  floor: number;
  period: number;
  phase: number;
}

export interface Gem {
  x: number;
  y: number;
  secret: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Level {
  id: string;
  rows: number;
  grid: Uint8Array;
  /** For each cell, its place in Run.crumbled, or -1. */
  crumbleIndex: Int16Array;
  crumbleCount: number;
  gems: Gem[];
  movers: Mover[];
  droppers: Dropper[];
  start: { x: number; y: number };
  exit: Rect;
  lavaStart: number;
  lavaSpeed: number;
  /** Seconds before the lava starts to rise. */
  lavaDelay: number;
  walls: boolean;
  dash: boolean;
  /** A run within this many seconds earns the speed star. */
  par: number;
  fish: boolean;
}

export const cell = (level: Level, col: number, row: number): number => (col < 0 || col >= COLS || row < 0 || row >= level.rows ? ROCK : level.grid[row * COLS + col]!);

const LETTERS: Record<string, number> = {
  '#': ROCK,
  W: GRIP,
  '=': LEDGE,
  '~': CRUMBLE,
  '%': ICE,
  '<': BELT_LEFT,
  '>': BELT_RIGHT,
  B: PAD,
  '^': SPIKE_UP,
  v: SPIKE_DOWN,
  '[': SPIKE_RIGHT,
  ']': SPIKE_LEFT,
  H: FAKE,
};

export interface Plan {
  id: string;
  /** Top row first, each 14 wide. The shaft walls on either side are added here. */
  map: string[];
  lavaSpeed: number;
  lavaDelay: number;
  par: number;
  walls: boolean;
  dash: boolean;
  fish: boolean;
  /** Time-driven pieces, in the order their letters appear reading down the map. */
  moves: MoveSpec[];
  drops: DropSpec[];
}

export interface MoveSpec {
  /** Travel in tiles. */
  dx: number;
  dy: number;
  /** Seconds there and back. */
  period: number;
  /** 0 to 1, how far through its beat the piece starts. */
  phase: number;
}

export interface DropSpec {
  period: number;
  phase: number;
}

/** Seconds a rock shivers in its hole, with its shadow on the floor, before it lets go. */
export const ROCK_WARNING = 0.8;
export const ROCK_SPEED = 260;
export const ROCK_SIZE = 16;

const LAVA_LEAD = 40;

interface Reading {
  grid: Uint8Array;
  gems: Gem[];
  crumbs: number[];
  platforms: { row: number; col: number; w: number }[];
  holes: { row: number; col: number }[];
  exit: Rect;
}

function readMap(map: string[]): Reading {
  const rows = map.length;
  const read: Reading = {
    grid: new Uint8Array(rows * COLS),
    gems: [],
    crumbs: [],
    platforms: [],
    holes: [],
    exit: { x: 0, y: 0, w: 0, h: 0 },
  };
  map.forEach((line, row) => {
    if (line.length !== COLS - 2) throw new Error(`Row ${row} of a map is ${line.length} wide: ${line}`);
    read.grid[row * COLS] = ROCK;
    read.grid[row * COLS + COLS - 1] = ROCK;
    [...line].forEach((letter, at) => readLetter(read, letter, at + 1, row));
  });
  return read;
}

function readLetter(read: Reading, letter: string, col: number, row: number): void {
  const x = col * TILE;
  const y = row * TILE;
  const here = row * COLS + col;
  if (letter === '*' || letter === '$') read.gems.push({ x: x + TILE / 2, y: y + TILE / 2, secret: letter === '$' });
  else if (letter === 'E') read.exit = { x, y: y - TILE, w: TILE * 2, h: TILE * 2 };
  else if (letter === 'r') {
    read.holes.push({ row, col });
    read.grid[here] = ROCK;
  } else if (letter === 'm') {
    const last = read.platforms.at(-1);
    if (last && last.row === row && last.col + last.w === col) last.w += 1;
    else read.platforms.push({ row, col, w: 1 });
  } else if (letter === '~') {
    read.crumbs.push(here);
    read.grid[here] = CRUMBLE;
  } else if (letter !== '.' && letter !== 'E') {
    const tile = LETTERS[letter];
    if (tile === undefined) throw new Error(`Unknown map letter ${letter}`);
    read.grid[here] = tile;
  }
}

/** Follows a rock's column down to whatever stops it. */
function rockFloor(grid: Uint8Array, rows: number, col: number, from: number): number {
  for (let row = from + 1; row < rows; row += 1) {
    const tile = grid[row * COLS + col]!;
    if (tile !== AIR && (isSolid(tile) || isSurface(tile))) return row * TILE;
  }
  return rows * TILE;
}

export function buildLevel(plan: Plan): Level {
  const rows = plan.map.length;
  const read = readMap(plan.map);
  if (read.platforms.length !== plan.moves.length) throw new Error(`${plan.id}: ${read.platforms.length} movers on the map, ${plan.moves.length} specs`);
  if (read.holes.length !== plan.drops.length) throw new Error(`${plan.id}: ${read.holes.length} rock holes on the map, ${plan.drops.length} specs`);
  const crumbleIndex = new Int16Array(rows * COLS).fill(-1);
  read.crumbs.forEach((at, index) => (crumbleIndex[at] = index));
  return {
    id: plan.id,
    rows,
    grid: read.grid,
    crumbleIndex,
    crumbleCount: read.crumbs.length,
    gems: read.gems,
    movers: read.platforms.map(({ row, col, w }, index) => {
      const spec = plan.moves[index]!;
      return { x: col * TILE, y: row * TILE, w: w * TILE, dx: spec.dx * TILE, dy: spec.dy * TILE, period: spec.period * TICKS_PER_SECOND, phase: spec.phase };
    }),
    droppers: read.holes.map(({ row, col }, index) => {
      const spec = plan.drops[index]!;
      return {
        x: col * TILE + (TILE - ROCK_SIZE) / 2,
        top: (row + 1) * TILE,
        floor: rockFloor(read.grid, rows, col, row),
        period: spec.period * TICKS_PER_SECOND,
        phase: spec.phase,
      };
    }),
    start: { x: 4 * TILE, y: (rows - 1) * TILE - HERO_H },
    exit: read.exit,
    lavaStart: rows * TILE + LAVA_LEAD,
    lavaSpeed: plan.lavaSpeed,
    lavaDelay: plan.lavaDelay,
    walls: plan.walls,
    dash: plan.dash,
    par: plan.par,
    fish: plan.fish,
  };
}

/** Where a mover stands at a tick. It eases at each end of its swing, so riders can see it turn. */
export function moverAt(mover: Mover, tick: number): { x: number; y: number } {
  const swing = (1 - Math.cos(2 * Math.PI * (tick / mover.period + mover.phase))) / 2;
  return { x: mover.x + mover.dx * swing, y: mover.y + mover.dy * swing };
}

/** Where the rock from a hole is at a tick. Its top edge, and whether it's still only a warning. */
export function rockAt(dropper: Dropper, tick: number): { y: number; warning: number; falling: boolean; landed: boolean } {
  const local = (tick + dropper.phase * dropper.period) % dropper.period;
  const warnTicks = ROCK_WARNING * TICKS_PER_SECOND;
  const fallTicks = ((dropper.floor - dropper.top - ROCK_SIZE) / ROCK_SPEED) * TICKS_PER_SECOND;
  if (local < warnTicks) return { y: dropper.top - ROCK_SIZE, warning: local / warnTicks, falling: false, landed: false };
  const fell = local - warnTicks;
  if (fell < fallTicks) return { y: dropper.top + (fell / TICKS_PER_SECOND) * ROCK_SPEED - ROCK_SIZE * (1 - fell / fallTicks), warning: 0, falling: true, landed: false };
  return { y: dropper.floor - ROCK_SIZE, warning: 0, falling: false, landed: fell < fallTicks + 12 };
}

/** The surface of the lava at a tick: still for a moment, then rising at a steady pace. */
export const lavaAt = (level: Level, tick: number): number => level.lavaStart - level.lavaSpeed * Math.max(0, tick / TICKS_PER_SECOND - level.lavaDelay);
