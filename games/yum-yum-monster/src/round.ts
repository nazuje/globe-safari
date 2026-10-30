import { FOODS } from './foods.ts';
import { text } from './lang/index.ts';
import { LINE_VARIANTS } from './lang/shared.ts';
import { LEVELS, makeRequests, REQUESTS_PER_ROUND } from './requests.ts';
import type { Level, MonsterRequest, PlateItem, Rng } from './requests.ts';

/** After this many wrong tries on one request, the right food pulses. */
export const HINT_AFTER_MISSES = 2;

export interface Round {
  level: Level;
  requests: MonsterRequest[];
  /** The request being fed now. Equal to the number of requests finished. */
  index: number;
  /** How many of the current request are eaten so far. */
  eaten: number;
  /** Wrong tries on the current request. */
  misses: number;
}

export type FeedResult =
  | { outcome: 'wrong'; round: Round }
  | { outcome: 'bite' | 'request-done' | 'round-done'; round: Round; bites: number };

export function newRound(level: Level, rng: Rng = Math.random): Round {
  return { level, requests: makeRequests(level, rng), index: 0, eaten: 0, misses: 0 };
}

export function currentRequest(round: Round): MonsterRequest {
  const request = round.requests[round.index];
  if (!request) throw new Error('This round is already finished');
  return request;
}

export function isFinished(round: Round): boolean {
  return round.index >= round.requests.length;
}

/** The right food only ever leaves the plate. A wrong food always bounces back. */
export function foodLeft(round: Round, item: PlateItem): number {
  const request = currentRequest(round);
  return item.foodId === request.correctId ? item.stock - round.eaten : item.stock;
}

export function showsHint(round: Round): boolean {
  return round.misses >= HINT_AFTER_MISSES;
}

/** From 0 (hungry) to 1 (stuffed). It grows with every finished request. */
export function fullness(round: Round): number {
  return Math.min(1, round.index / round.requests.length);
}

/**
 * One tap of food. `round` stays as it was; the new state comes back. When a
 * request is done, the returned round already points at the next one, and
 * `bites` keeps the number the monster just reached.
 */
export function feed(round: Round, foodId: string): FeedResult {
  const request = currentRequest(round);
  if (foodId !== request.correctId) {
    return { outcome: 'wrong', round: { ...round, misses: round.misses + 1 } };
  }
  const bites = round.eaten + 1;
  if (bites < request.count) {
    return { outcome: 'bite', round: { ...round, eaten: bites }, bites };
  }
  const next = { ...round, index: round.index + 1, eaten: 0, misses: 0 };
  return { outcome: isFinished(next) ? 'round-done' : 'request-done', round: next, bites };
}

function isValidRequest(request: MonsterRequest): boolean {
  const known = (id: string): boolean => FOODS.some((food) => food.id === id);
  const right = request.plate.find((item) => item.foodId === request.correctId);
  return Boolean(right && right.stock >= request.count) && request.plate.every((item) => known(item.foodId));
}

/** Rounds saved before requests had wordings get the first one. */
function withVariant(request: MonsterRequest): MonsterRequest {
  return LINE_VARIANTS.includes(request.variant) ? request : { ...request, variant: 0 };
}

/** Rebuilds a round saved on this device, or gives null if it can't be trusted or is over. */
export function restoreRound(saved: unknown, level: Level): Round | null {
  const round = saved as Partial<Round> | null;
  if (!round || round.level !== level || !LEVELS.includes(round.level)) return null;
  const { requests, index, eaten, misses } = round;
  if (!Array.isArray(requests) || requests.length !== REQUESTS_PER_ROUND) return null;
  if (typeof index !== 'number' || typeof eaten !== 'number' || typeof misses !== 'number') return null;
  if (!Number.isInteger(index) || index < 0 || index >= requests.length) return null;
  if (!requests.every(isValidRequest)) return null;
  if (!Number.isInteger(eaten) || eaten < 0 || eaten >= requests[index]!.count) return null;
  return { level, requests: requests.map(withVariant), index, eaten, misses };
}

export type ReactionMood = 'mmm' | 'wiggle' | 'burp' | 'giggle';

/** The words for each mood are in lang/, under reactions. */
export interface Reaction {
  mood: ReactionMood;
}

export const REACTIONS: readonly Reaction[] = [{ mood: 'mmm' }, { mood: 'wiggle' }, { mood: 'burp' }, { mood: 'giggle' }];

/** A funny reaction, never the same one twice in a row. */
export function nextReaction(previous: Reaction | null, rng: Rng = Math.random): Reaction {
  const options = REACTIONS.filter((reaction) => reaction !== previous);
  return options[Math.floor(rng() * options.length)]!;
}

export function sneezeLine(rng: Rng = Math.random): string {
  const lines = text().sneezes;
  return lines[Math.floor(rng() * lines.length)]!;
}
