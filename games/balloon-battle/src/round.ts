import { airForTap, PUFF_GAP_MS, type Level } from './tuning.ts';

export type Side = 0 | 1;
export const SIDES: readonly Side[] = [0, 1];

export type Surprise = 'none' | 'gold' | 'bird' | 'sputter';

export interface Round {
  levels: [Level, Level];
  fill: [number, number];
  lastPuffAt: [number, number];
  winner: Side | null;
  surprise: Surprise;
}

// Adding 1/24 twenty-four times can land a hair under 1.
const FULL = 1 - 1e-9;

export const otherSide = (side: Side): Side => (side === 0 ? 1 : 0);

export function newRound(levels: [Level, Level], surprise: Surprise = 'none'): Round {
  return { levels, fill: [0, 0], lastPuffAt: [-Infinity, -Infinity], winner: null, surprise };
}

/** One press on one side. Only that side's balloon changes, and nothing changes once someone has won. */
export function pump(round: Round, side: Side, now: number): Round {
  if (round.winner !== null || now - round.lastPuffAt[side] < PUFF_GAP_MS) return round;
  const other = otherSide(side);
  const filled = round.fill[side] + airForTap(round.levels[side], round.fill[side], round.fill[other]);
  const fill: [number, number] = [...round.fill];
  const lastPuffAt: [number, number] = [...round.lastPuffAt];
  fill[side] = filled >= FULL ? 1 : filled;
  lastPuffAt[side] = now;
  return { ...round, fill, lastPuffAt, winner: filled >= FULL ? side : null };
}

// Rough chances per round, added up from the top. Most rounds stay plain so a surprise stays a surprise.
const SURPRISE_ODDS: readonly (readonly [Surprise, number])[] = [
  ['gold', 0.1],
  ['bird', 0.12],
  ['sputter', 0.1],
];
const PLAIN_ROUNDS_FIRST = 2;

/** Which surprise this round brings. The first rounds are plain, and no surprise comes twice running. */
export function pickSurprise(roundsPlayed: number, last: Surprise, random: () => number): Surprise {
  if (roundsPlayed < PLAIN_ROUNDS_FIRST) return 'none';
  let roll = random();
  for (const [surprise, odds] of SURPRISE_ODDS) {
    if (roll < odds) return surprise === last ? 'none' : surprise;
    roll -= odds;
  }
  return 'none';
}

/** The rematch button waits at least this long after the bang. */
export const REMATCH_AFTER_MS = 1800;
/** And until hands have been still this long, so a tap meant for the balloon can't land on it. */
export const REMATCH_QUIET_MS = 900;

export function rematchArmed(bangAt: number, lastTapAt: number, now: number): boolean {
  return now - bangAt >= REMATCH_AFTER_MS && now - lastTapAt >= REMATCH_QUIET_MS;
}
