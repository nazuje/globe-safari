import { BALLS_PER_TURN, isBigCrash } from './scoring.ts';

/** The shortest a crash can take. A throw that hits nothing still gets a moment to land. */
const SHORTEST_SETTLE_S = 2.2;
/** Something still rolling doesn't hold up the next ball for longer than this. */
export const LONGEST_SETTLE_S = 5;
/** Share of the structure left standing that brings the next wave of blocks. */
const WAVE_WHEN_LEFT = 0.3;
/** The ball after which a turn always gets a fresh pile, however it's going. */
const HALFWAY_THROW = 3;
/** A pile needs at least this many blocks to feel like one. */
const SMALLEST_DROP = 4;
/** A last look at the final crash before the end screen. */
const LAST_LOOK_S = 0.9;
const SMALLEST_WAVE = 8;
const BIGGEST_WAVE = 16;
const WAVE_SHARE = 0.6;
/** Misses in a row before the aim steps in to help. */
const MISSES_FOR_HELP = 2;

export interface Round {
  /** Blocks in the structure at the start. Star goals never change. */
  base: number;
  /** Blocks that have been in play, which grows with each wave. */
  total: number;
  fallen: number;
  thrown: number;
  clock: number;
  /** When the last throw or wave began, which is what the settling is timed from. */
  settleFrom: number;
  /** True once the crash is over and a ball can fly. */
  ready: boolean;
  fallenThisThrow: number;
  bigCrashSaid: boolean;
  /** Throws since the last one that moved anything. */
  missStreak: number;
  waves: number;
  /** The throw count when the last wave fell, so two can't follow each other with no ball between. */
  waveAtThrow: number;
  settledAt: number;
  /** A wave is falling, as opposed to a ball doing its damage. */
  waveFalling: boolean;
  over: boolean;
}

export function newRound(base: number): Round {
  return {
    base,
    total: base,
    fallen: 0,
    thrown: 0,
    clock: 0,
    settleFrom: 0,
    ready: true,
    fallenThisThrow: 0,
    bigCrashSaid: true,
    missStreak: 0,
    waves: 0,
    waveAtThrow: 0,
    settledAt: 0,
    waveFalling: false,
    over: false,
  };
}

export const ballsLeft = (round: Round): number => BALLS_PER_TURN - round.thrown;

export const canThrow = (round: Round): boolean => !round.over && ballsLeft(round) > 0 && round.ready;

export function ballThrown(round: Round): Round {
  return {
    ...round,
    thrown: round.thrown + 1,
    settleFrom: round.clock,
    ready: false,
    fallenThisThrow: 0,
    bigCrashSaid: false,
  };
}

export function blockFell(round: Round): Round {
  return {
    ...round,
    fallen: Math.min(round.fallen + 1, round.total),
    fallenThisThrow: round.fallenThisThrow + 1,
  };
}

export interface Tick {
  round: Round;
  bigCrash: boolean;
  /** The crash has just finished. */
  settled: boolean;
  /** The throw that just settled moved nothing at all. */
  missed: boolean;
}

/** Moves the clock on and says what that changed, each thing once per throw. */
export function tick(round: Round, seconds: number, calm: boolean): Tick {
  const clock = round.clock + seconds;
  const bigCrash = !round.bigCrashSaid && isBigCrash(round.fallenThisThrow, round.base);
  const next = { ...round, clock, bigCrashSaid: round.bigCrashSaid || bigCrash };
  if (round.ready) return { round: next, bigCrash, settled: false, missed: false };
  const waited = clock - round.settleFrom;
  const settled = waited >= LONGEST_SETTLE_S || (calm && waited >= SHORTEST_SETTLE_S);
  if (!settled) return { round: next, bigCrash, settled: false, missed: false };
  const missed = !round.waveFalling && round.fallenThisThrow === 0;
  const missStreak = round.waveFalling ? round.missStreak : missed ? round.missStreak + 1 : 0;
  const done = { ...next, ready: true, waveFalling: false, missStreak, settledAt: clock };
  return { round: done, bigCrash, settled: true, missed };
}

/** A new pile falls when most of this one is down, at halfway, and before the last ball. */
export function waveDue(round: Round, standing: number): boolean {
  const left = ballsLeft(round);
  if (round.over || !round.ready || left === 0 || round.thrown === round.waveAtThrow) return false;
  const mostlyDown = standing <= Math.floor(round.base * WAVE_WHEN_LEFT);
  return mostlyDown || left === 1 || (round.waves === 0 && round.thrown >= HALFWAY_THROW);
}

export const enoughToDrop = (count: number): boolean => count >= SMALLEST_DROP;

export const waveSize = (base: number): number =>
  Math.min(Math.max(Math.round(base * WAVE_SHARE), SMALLEST_WAVE), BIGGEST_WAVE);

export function waveDropped(round: Round, count: number): Round {
  return {
    ...round,
    total: round.total + count,
    waves: round.waves + 1,
    waveAtThrow: round.thrown,
    settleFrom: round.clock,
    ready: false,
    waveFalling: true,
  };
}

/** How much the aim helps: 0 not at all, 1 finds the block nearest a tap, 2 finds the surest block. */
export function aimHelp(easy: boolean, missStreak: number): 0 | 1 | 2 {
  if (missStreak >= MISSES_FOR_HELP) return 2;
  return easy ? 1 : 0;
}

/** The turn ends once the last ball's crash has played out. */
export function shouldEnd(round: Round): boolean {
  return !round.over && round.ready && ballsLeft(round) === 0 && round.clock - round.settledAt >= LAST_LOOK_S;
}
