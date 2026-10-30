import { newRound, pump, type Round, type Side } from './round.ts';
import { airForTap, type Level } from './tuning.ts';

/** A small seeded random number generator, so every simulation run gives the same numbers. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Racer {
  level: Level;
  tapsPerSecond: number;
}

export interface RaceResult {
  winner: Side;
  /** How full the second balloon was when the first went bang. */
  loserFill: number;
  seconds: number;
}

// Real children aren't metronomes. Some days they're quicker, each gap between taps
// varies, and now and then they stop to look at something.
const DAY_SWING = 0.15;
const GAP_SWING = 0.4;
const PAUSES_PER_SECOND = 0.12;
const PAUSE_SECONDS = 0.4;

function tapStream(racer: Racer, random: () => number): () => number {
  const rate = racer.tapsPerSecond * (1 + (random() * 2 - 1) * DAY_SWING);
  let at = 0.15 + random() * 0.3;
  return () => {
    const gap = (1 + (random() * 2 - 1) * GAP_SWING) / rate;
    const paused = random() < PAUSES_PER_SECOND * gap;
    at += gap + (paused ? PAUSE_SECONDS : 0);
    return at;
  };
}

/** With no comeback, for comparing against the real tuning. */
function pumpWithoutComeback(round: Round, side: Side): Round {
  const added = airForTap(round.levels[side], 0, 0, 0);
  const fill: [number, number] = [...round.fill];
  fill[side] += added;
  return { ...round, fill, winner: fill[side] >= 1 - 1e-9 ? side : null };
}

export function race(a: Racer, b: Racer, random: () => number, comeback = true): RaceResult {
  let round = newRound([a.level, b.level]);
  const streams = [tapStream(a, random), tapStream(b, random)];
  const next = [streams[0](), streams[1]()];
  let seconds = 0;
  while (round.winner === null) {
    const side: Side = next[0] <= next[1] ? 0 : 1;
    seconds = next[side];
    round = comeback ? pump(round, side, seconds * 1000) : pumpWithoutComeback(round, side);
    next[side] = streams[side]();
  }
  return { winner: round.winner, loserFill: round.fill[round.winner === 0 ? 1 : 0], seconds };
}

export interface Matchup {
  /** The share of rounds the first racer won. */
  firstWins: number;
  /** The second balloon's average fill at the bang. */
  meanLoserFill: number;
  /** The share of rounds where the second balloon was at least 80% full at the bang. */
  closeFinishes: number;
  meanSeconds: number;
}

export function matchup(a: Racer, b: Racer, rounds: number, seed: number, comeback = true): Matchup {
  const random = seededRandom(seed);
  let firstWins = 0;
  let loserFill = 0;
  let close = 0;
  let seconds = 0;
  for (let i = 0; i < rounds; i++) {
    const result = race(a, b, random, comeback);
    if (result.winner === 0) firstWins++;
    if (result.loserFill >= 0.8) close++;
    loserFill += result.loserFill;
    seconds += result.seconds;
  }
  return {
    firstWins: firstWins / rounds,
    meanLoserFill: loserFill / rounds,
    closeFinishes: close / rounds,
    meanSeconds: seconds / rounds,
  };
}
