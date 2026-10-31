// The maze as plain numbers: one unit is one tile, x runs right and y runs down.
// No three.js here, so every rule about walls can be tested without a screen.

export interface Point {
  x: number;
  y: number;
}

export const FLOOR = 0;
export const WALL = 1;
/** Looks like a wall and stops every eye, but the player can walk through it into a hidden room. */
export const HOLO = 2;

export interface Grid {
  width: number;
  height: number;
  cells: Uint8Array;
}

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export const FULL_TURN = Math.PI * 2;

export const tileIndex = (grid: Grid, column: number, row: number): number => row * grid.width + column;

export const tileOf = (grid: Grid, { x, y }: Point): number => tileIndex(grid, Math.floor(x), Math.floor(y));

export const tileCentre = (grid: Grid, tile: number): Point => ({
  x: (tile % grid.width) + 0.5,
  y: Math.floor(tile / grid.width) + 0.5,
});

function cellAt(grid: Grid, column: number, row: number): number {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) return WALL;
  return grid.cells[tileIndex(grid, column, row)] ?? WALL;
}

/** What the player bumps into. Holograms let them through. */
const stopsPlayer = (grid: Grid, column: number, row: number): boolean => cellAt(grid, column, row) === WALL;

/** How far a look goes from a point along an angle before it meets a wall, up to `most`. */
export function rayLength(grid: Grid, from: Point, angle: number, most: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let column = Math.floor(from.x);
  let row = Math.floor(from.y);
  if (cellAt(grid, column, row) !== FLOOR) return 0;
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const eachX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const eachY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let nextX = dx === 0 ? Infinity : (dx > 0 ? column + 1 - from.x : from.x - column) * eachX;
  let nextY = dy === 0 ? Infinity : (dy > 0 ? row + 1 - from.y : from.y - row) * eachY;
  let travelled = 0;
  while (travelled < most) {
    if (nextX < nextY) {
      travelled = nextX;
      nextX += eachX;
      column += stepX;
    } else {
      travelled = nextY;
      nextY += eachY;
      row += stepY;
    }
    if (cellAt(grid, column, row) !== FLOOR) return Math.min(travelled, most);
  }
  return most;
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** True when no wall stands between two points. */
export function canSee(grid: Grid, from: Point, to: Point): boolean {
  const gap = distance(from, to);
  if (gap < 0.001) return true;
  return rayLength(grid, from, Math.atan2(to.y - from.y, to.x - from.x), gap) >= gap - 0.001;
}

/** The shortest signed turn from one angle to another, in the range -pi to pi. */
export function turnBetween(from: number, to: number): number {
  const turn = (to - from) % FULL_TURN;
  if (turn > Math.PI) return turn - FULL_TURN;
  return turn < -Math.PI ? turn + FULL_TURN : turn;
}

export interface Cone {
  from: Point;
  facing: number;
  /** From the middle of the cone to its edge, in radians. */
  half: number;
  range: number;
}

/** Inside the wedge, ignoring walls. */
export function inWedge({ from, facing, half, range }: Cone, point: Point): boolean {
  const gap = distance(from, point);
  if (gap > range) return false;
  if (gap < 0.001) return true;
  return Math.abs(turnBetween(facing, Math.atan2(point.y - from.y, point.x - from.x))) <= half;
}

/** Inside the wedge with nothing in the way: what a robot or a camera really sees. */
export const inView = (grid: Grid, cone: Cone, point: Point): boolean => inWedge(cone, point) && canSee(grid, cone.from, point);

/** Steps away from a tile through open floor, or -1 where it can't be reached. */
export function stepsFrom(grid: Grid, target: number, throughHolo: boolean): Int16Array {
  const steps = new Int16Array(grid.cells.length).fill(-1);
  const queue = [target];
  steps[target] = 0;
  for (let head = 0; head < queue.length; head += 1) {
    const tile = queue[head] ?? 0;
    const column = tile % grid.width;
    const row = Math.floor(tile / grid.width);
    for (const [dx, dy] of SIDES) {
      const cell = cellAt(grid, column + dx, row + dy);
      const open = cell === FLOOR || (throughHolo && cell === HOLO);
      const next = tileIndex(grid, column + dx, row + dy);
      if (!open || steps[next] !== -1) continue;
      steps[next] = (steps[tile] ?? 0) + 1;
      queue.push(next);
    }
  }
  return steps;
}

/** The neighbouring tile that gets closest to wherever `steps` was measured from. */
export function stepDownhill(grid: Grid, steps: Int16Array, tile: number): number {
  const column = tile % grid.width;
  const row = Math.floor(tile / grid.width);
  let best = tile;
  let bestSteps = steps[tile] ?? -1;
  if (bestSteps < 0) bestSteps = Infinity;
  for (const [dx, dy] of SIDES) {
    if (column + dx < 0 || column + dx >= grid.width || row + dy < 0 || row + dy >= grid.height) continue;
    const next = tileIndex(grid, column + dx, row + dy);
    const value = steps[next] ?? -1;
    if (value >= 0 && value < bestSteps) {
      best = next;
      bestSteps = value;
    }
  }
  return best;
}

/** The open tiles next to a tile, for walking the player can do. */
export function openNeighbours(grid: Grid, tile: number): number[] {
  const column = tile % grid.width;
  const row = Math.floor(tile / grid.width);
  return SIDES.filter(([dx, dy]) => !stopsPlayer(grid, column + dx, row + dy)).map(([dx, dy]) => tileIndex(grid, column + dx, row + dy));
}

function pushOut(grid: Grid, spot: Point, radius: number): void {
  const left = Math.floor(spot.x - radius);
  const right = Math.floor(spot.x + radius);
  const top = Math.floor(spot.y - radius);
  const bottom = Math.floor(spot.y + radius);
  for (let row = top; row <= bottom; row += 1) {
    for (let column = left; column <= right; column += 1) {
      if (!stopsPlayer(grid, column, row)) continue;
      const nearX = Math.max(column, Math.min(spot.x, column + 1));
      const nearY = Math.max(row, Math.min(spot.y, row + 1));
      const awayX = spot.x - nearX;
      const awayY = spot.y - nearY;
      const gap = Math.hypot(awayX, awayY);
      if (gap >= radius || gap === 0) continue;
      spot.x = nearX + (awayX / gap) * radius;
      spot.y = nearY + (awayY / gap) * radius;
    }
  }
}

/** Sideways help when a push hits a wall right beside an opening, so a child who is nearly lined up slips round the corner. */
function intoOpening(grid: Grid, from: Point, dirX: number, dirY: number, radius: number): Point | null {
  const reach = radius + 0.12;
  const aheadX = from.x + dirX * reach;
  const aheadY = from.y + dirY * reach;
  if (!stopsPlayer(grid, Math.floor(aheadX), Math.floor(aheadY))) return null;
  const free = [1, -1].filter((side) => {
    const x = aheadX - dirY * side * 0.6;
    const y = aheadY + dirX * side * 0.6;
    return !stopsPlayer(grid, Math.floor(x), Math.floor(y));
  });
  const side = free[0];
  if (free.length !== 1 || side === undefined) return null;
  return { x: -dirY * side, y: dirX * side };
}

/** Moves a round body through the maze: it slides along walls and rounds corners instead of sticking. */
export function slide(grid: Grid, from: Point, moveX: number, moveY: number, radius: number): Point {
  const reach = Math.hypot(moveX, moveY);
  const spot = { x: from.x + moveX, y: from.y + moveY };
  if (reach === 0) return spot;
  const nudge = intoOpening(grid, from, moveX / reach, moveY / reach, radius);
  if (nudge) {
    spot.x += nudge.x * reach * 0.7;
    spot.y += nudge.y * reach * 0.7;
  }
  pushOut(grid, spot, radius);
  pushOut(grid, spot, radius);
  return spot;
}
