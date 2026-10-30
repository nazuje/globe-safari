import { buriable, friendsAt, itemsIn, SILLIES, type Silly } from './catalog.ts';
import { PLACES, type PlaceId } from './places.ts';
import { currentDino, dragonToHatch, missingBones, pickFresh, shuffle, type Save, type Size } from './save.ts';

export type Surprise = 'chest' | 'egg' | null;

export type Buried =
  | { kind: 'treasure'; id: string }
  | { kind: 'friend'; id: string }
  | { kind: 'silly'; id: Silly }
  | { kind: 'chest' }
  | { kind: 'egg'; dragon: string }
  | null;

export interface Tile {
  /** Taps this tile takes. */
  layers: number;
  /** Taps still needed. Zero means it is an open hole. */
  left: number;
  buried: Buried;
}

export interface Patch {
  size: Size;
  place: PlaceId;
  cols: number;
  rows: number;
  tiles: Tile[];
  /** Tiles to find to finish the patch, in the order the tray shows them. */
  goals: number[];
  /** Digs in a row that found nothing to collect. */
  emptyStreak: number;
  /** The tile glinting through the dirt, if any. */
  hint: number | null;
}

export type DigResult =
  /** Already open: nothing happens. */
  | { type: 'nothing' }
  /** A layer came off, and more are left. */
  | { type: 'chip'; left: number }
  | { type: 'open'; buried: Buried; goal: boolean; hint: number | null; done: boolean };

interface Shape {
  cols: number;
  rows: number;
  goals: number;
  bones: number;
  friends: number;
  sillies: number;
  /** How likely a tile is to take 1, 2 or 3 taps. */
  layers: [number, number, number];
}

const SHAPES: Record<Size, Shape> = {
  small: { cols: 4, rows: 4, goals: 4, bones: 2, friends: 2, sillies: 2, layers: [6, 3, 1] },
  big: { cols: 5, rows: 6, goals: 7, bones: 3, friends: 3, sillies: 4, layers: [1, 4, 5] },
};

/** Empty digs in a row before the nearest treasure starts to glint. */
export const HINT_AFTER = 3;

const CHEST_ODDS = 0.15;
const EGG_ODDS = 0.04;
/** Nobody should wait for ever: these many patches at most without one. */
const CHEST_WAIT = 5;
const EGG_WAIT = 16;
/** The first patch is always a plain one. */
const FIRST_SURPRISE_PATCH = 1;

export function rollSurprise(save: Save, rng: () => number): Surprise {
  if (save.patches < FIRST_SURPRISE_PATCH) return null;
  if (save.sinceEgg >= EGG_WAIT || rng() < EGG_ODDS) return 'egg';
  if (save.sinceChest >= CHEST_WAIT || rng() < CHEST_ODDS) return 'chest';
  return null;
}

function rollLayers(weights: Shape['layers'], rng: () => number): number {
  const total = weights[0] + weights[1] + weights[2];
  let roll = rng() * total;
  for (const [index, weight] of weights.entries()) {
    roll -= weight;
    if (roll < 0) return index + 1;
  }
  return 3;
}

/** What goes in the ground, goals first. Bones build the current dinosaur; the rest are treasures. */
function chooseGoals(save: Save, place: PlaceId, shape: Shape, surprise: Surprise, rng: () => number): Buried[] {
  const goals: Buried[] = [];
  if (surprise === 'chest') goals.push({ kind: 'chest' });
  if (surprise === 'egg') goals.push({ kind: 'egg', dragon: dragonToHatch(save, rng).id });

  const dino = currentDino(save);
  const bones = dino ? shuffle(missingBones(save, dino), rng).slice(0, shape.bones) : [];
  for (const id of bones) goals.push({ kind: 'treasure', id });

  const rest = pickFresh(save, buriable(place), shape.goals - goals.length, rng);
  for (const item of rest) goals.push({ kind: 'treasure', id: item.id });
  return goals;
}

export interface PatchRequest {
  save: Save;
  size: Size;
  surprise: Surprise;
}

export function makePatch({ save, size, surprise }: PatchRequest, rng: () => number = Math.random): Patch {
  const shape = SHAPES[size];
  const place = (PLACES[save.place] ?? PLACES[0])!.id;
  const count = shape.cols * shape.rows;

  const goals = chooseGoals(save, place, shape, surprise, rng);
  const friends: Buried[] = pickFresh(save, friendsAt(place), shape.friends, rng).map((item) => ({
    kind: 'friend',
    id: item.id,
  }));
  const sillies: Buried[] = shuffle(SILLIES, rng)
    .slice(0, shape.sillies)
    .map((id) => ({ kind: 'silly', id }));

  const buried = [...goals, ...friends, ...sillies];
  const spots = shuffle([...Array(count).keys()], rng);
  const tiles: Tile[] = Array.from({ length: count }, () => {
    const layers = rollLayers(shape.layers, rng);
    return { layers, left: layers, buried: null };
  });
  buried.forEach((thing, index) => {
    (tiles[spots[index]!] as Tile).buried = thing;
  });

  return {
    size,
    place,
    cols: shape.cols,
    rows: shape.rows,
    tiles,
    goals: spots.slice(0, goals.length),
    emptyStreak: 0,
    hint: null,
  };
}

function isGoal(tile: Tile): boolean {
  const kind = tile.buried?.kind;
  return kind === 'treasure' || kind === 'chest' || kind === 'egg';
}

export function goalsLeft(patch: Patch): number {
  return patch.goals.filter((index) => patch.tiles[index]!.left > 0).length;
}

/** The hidden goal closest to a tile, counting steps across the grid. */
export function nearestGoal(patch: Patch, from: number): number | null {
  const steps = (index: number): number =>
    Math.abs((index % patch.cols) - (from % patch.cols)) +
    Math.abs(Math.floor(index / patch.cols) - Math.floor(from / patch.cols));
  const hidden = patch.goals.filter((index) => patch.tiles[index]!.left > 0);
  hidden.sort((a, b) => steps(a) - steps(b) || a - b);
  return hidden[0] ?? null;
}

/** One tap on one tile. Never fails, whatever is tapped, so a mashing child can't break a patch. */
export function digTile(patch: Patch, index: number): DigResult {
  const tile = patch.tiles[index];
  if (!tile || tile.left === 0) return { type: 'nothing' };

  tile.left -= 1;
  if (tile.left > 0) return { type: 'chip', left: tile.left };

  const goal = isGoal(tile);
  if (goal) {
    patch.emptyStreak = 0;
    if (patch.hint === index) patch.hint = null;
  } else {
    patch.emptyStreak += 1;
    if (patch.hint === null && patch.emptyStreak >= HINT_AFTER) patch.hint = nearestGoal(patch, index);
  }
  return { type: 'open', buried: tile.buried, goal, hint: patch.hint, done: goalsLeft(patch) === 0 };
}

/** Bookkeeping when a patch is finished: move on to a new place and keep count for the rare surprises. */
export function finishPatch(save: Save, patch: Patch): void {
  const had = (kind: 'chest' | 'egg'): boolean => patch.tiles.some((tile) => tile.buried?.kind === kind);
  save.patches += 1;
  save.sinceChest = had('chest') ? 0 : save.sinceChest + 1;
  save.sinceEgg = had('egg') ? 0 : save.sinceEgg + 1;
  save.place = (save.place + 1) % PLACES.length;
}

/** The gold prize and two extra treasures that burst out of the golden chest. */
export function chestPrizes(save: Save, place: PlaceId, rng: () => number = Math.random): string[] {
  const gold = pickFresh(save, itemsIn('gold'), 1, rng);
  const extras = pickFresh(save, buriable(place), 2, rng);
  return [...gold, ...extras].map((item) => item.id);
}
