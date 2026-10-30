import { COLORS, FOODS, foodById } from './foods.ts';
import type { Color, Food } from './foods.ts';
import { text } from './lang/index.ts';
import { LINE_VARIANTS } from './lang/shared.ts';

export type Rng = () => number;
export type Level = 1 | 2 | 3 | 4 | 5;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];
export const REQUESTS_PER_ROUND = 5;
export const PLATE_SIZE = 3;

export interface PlateItem {
  foodId: string;
  /** How many of this food sit on the plate. */
  stock: number;
}

export interface MonsterRequest {
  kind: 'name' | 'color' | 'count';
  /** Which wording the monster uses. See requestLine for the words. */
  variant: number;
  /** The one right food on the plate. */
  correctId: string;
  /** How many the monster wants to eat. */
  count: number;
  /** The color asked for, on color requests. */
  color?: Color;
  plate: PlateItem[];
}

/** "Three!", the word the monster shouts as it eats. */
export function countWord(n: number): string {
  return text().countAloud(n);
}

/**
 * The short line the monster says out loud, in the language in use. Requests
 * hold no words of their own, so a round carries on after a language switch.
 */
export function requestLine(request: MonsterRequest): string {
  const { kind, color, count, variant } = request;
  const food = foodById(request.correctId).id;
  if (kind === 'count') return text().wantCount(food, count, variant);
  return color ? text().wantColor(color, variant) : text().wantFood(food, variant);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

function hasNoRepeats(items: readonly number[]): boolean {
  return items.every((item, i) => i === 0 || item !== items[i - 1]);
}

/** Every round ends on the biggest number, so the hardest count comes last. */
const COUNT_PLANS: Record<3 | 4 | 5, { pool: number[]; last: number }> = {
  3: { pool: [1, 2, 2, 3], last: 3 },
  4: { pool: [1, 2, 3, 4], last: 5 },
  5: { pool: [6, 7, 8, 9], last: 10 },
};

export function countsForLevel(level: 3 | 4 | 5, rng: Rng): number[] {
  const { pool, last } = COUNT_PLANS[level];
  let counts = [...pool, last];
  // Gentle variety only, so giving up after a few tries is safe.
  for (let tries = 0; tries < 30; tries++) {
    counts = [...shuffle(pool, rng), last];
    if (hasNoRepeats(counts)) break;
  }
  return counts;
}

/** Lays the plate out with the right food in a different spot from last time. */
function layPlate(right: PlateItem, others: PlateItem[], lastSlot: number, rng: Rng): { plate: PlateItem[]; slot: number } {
  const slots = [0, 1, 2].filter((slot) => slot !== lastSlot);
  const slot = pick(slots, rng);
  const plate = shuffle(others, rng);
  plate.splice(slot, 0, right);
  return { plate, slot };
}

function nameRequests(rng: Rng): MonsterRequest[] {
  let slot = -1;
  return shuffle(FOODS, rng)
    .slice(0, REQUESTS_PER_ROUND)
    .map((food) => {
      const others = shuffle(FOODS.filter((other) => other.id !== food.id), rng).slice(0, PLATE_SIZE - 1);
      const laid = layPlate({ foodId: food.id, stock: 1 }, others.map((other) => ({ foodId: other.id, stock: 1 })), slot, rng);
      slot = laid.slot;
      return { kind: 'name' as const, variant: pick(LINE_VARIANTS, rng), correctId: food.id, count: 1, plate: laid.plate };
    });
}

function foodsOfColor(color: Color): Food[] {
  return FOODS.filter((food) => food.color === color);
}

function colorRequests(rng: Rng): MonsterRequest[] {
  let slot = -1;
  return shuffle(COLORS, rng)
    .slice(0, REQUESTS_PER_ROUND)
    .map((color) => {
      const food = pick(foodsOfColor(color), rng);
      const otherColors = shuffle(COLORS.filter((other) => other !== color), rng).slice(0, PLATE_SIZE - 1);
      const others = otherColors.map((other) => ({ foodId: pick(foodsOfColor(other), rng).id, stock: 1 }));
      const laid = layPlate({ foodId: food.id, stock: 1 }, others, slot, rng);
      slot = laid.slot;
      return { kind: 'color' as const, variant: pick(LINE_VARIANTS, rng), correctId: food.id, count: 1, color, plate: laid.plate };
    });
}

function countRequests(level: 3 | 4 | 5, rng: Rng): MonsterRequest[] {
  const countable = FOODS.filter((food) => food.countable);
  const wanted = shuffle(countable, rng).slice(0, REQUESTS_PER_ROUND);
  let slot = -1;
  return countsForLevel(level, rng).map((count, i) => {
    const food = wanted[i]!;
    const others = shuffle(countable.filter((other) => other.id !== food.id), rng).slice(0, PLATE_SIZE - 1);
    const spare = Math.floor(rng() * 2);
    const laid = layPlate(
      { foodId: food.id, stock: count + spare },
      others.map((other) => ({ foodId: other.id, stock: 1 + Math.floor(rng() * 3) })),
      slot,
      rng,
    );
    slot = laid.slot;
    return { kind: 'count' as const, variant: pick(LINE_VARIANTS, rng), correctId: food.id, count, plate: laid.plate };
  });
}

export function makeRequests(level: Level, rng: Rng = Math.random): MonsterRequest[] {
  if (level === 1) return nameRequests(rng);
  if (level === 2) return colorRequests(rng);
  return countRequests(level, rng);
}

/** The food the monster is asking for, for pictures. */
export function correctFood(request: MonsterRequest): Food {
  return foodById(request.correctId);
}
