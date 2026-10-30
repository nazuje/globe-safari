export const DIFFICULTIES = ['easy', 'tricky'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const BALLS_PER_TURN = 6;
/** A block has left the table once its middle has dropped this far below the tabletop. */
export const FALL_LINE = -0.6;
/** Pushed this far from where it stood, a block no longer counts as standing. */
const DOWN_MOVED = 0.9;
/** Change in how upright it is: 0 is unchanged, 1 is lying on its side. */
const DOWN_TIPPED = 0.25;

const STURDY_EASING = 0.7;
/** The biggest structures don't ask for more than this, or their stars would be out of reach in six balls. */
const BIGGEST_GOAL_SIZE = 36;

/** Goals can pass the size of the structure, because each wave brings more blocks to knock down. */
const STAR_SHARES: Record<Difficulty, readonly [number, number, number]> = {
  easy: [0.3, 1, 1.7],
  tricky: [0.4, 1.3, 2.2],
};

/** Room around a structure. Less room means more blocks tip over the edge. */
const TABLE_MARGIN: Record<Difficulty, number> = { easy: 1.3, tricky: 2.2 };
const SMALLEST_TABLE_HALF = 3.2;

/** Each ball in a turn flies harder than the last, so a turn builds to its biggest throw. */
const THROW_POWER = [0.72, 0.8, 0.88, 0.96, 1.05, 1.3];
/** The last ball is a big one, so a turn ends on a bang. */
const LAST_BALL_SIZE = 1.45;

const BIG_CRASH_SHARE = 0.5;
const BIG_CRASH_BLOCKS = 8;

/** Big crashes it takes for the secret level to appear. */
export const CRASHES_FOR_BONUS = 5;

/** Half the width of a square table for a structure that reaches `reach` from the middle. */
export const tableHalf = (reach: number, difficulty: Difficulty): number =>
  Math.max(reach + TABLE_MARGIN[difficulty], SMALLEST_TABLE_HALF);

export const hasFallen = (height: number): boolean => height < FALL_LINE;

export interface BlockMove {
  moved: number;
  tipped: number;
  height: number;
}

/** Off the table, knocked over or shoved aside all count: a child sees all three as "I got it". */
export const isDown = ({ moved, tipped, height }: BlockMove): boolean =>
  hasFallen(height) || moved >= DOWN_MOVED || tipped >= DOWN_TIPPED;

export const ballSize = (throwIndex: number): number => (throwIndex >= BALLS_PER_TURN - 1 ? LAST_BALL_SIZE : 1);

export const throwPower = (throwIndex: number): number =>
  THROW_POWER[Math.min(throwIndex, THROW_POWER.length - 1)] ?? 1;

/** How many blocks must fall for one, two and three stars. */
export function starGoals(total: number, difficulty: Difficulty, sturdy = false): [number, number, number] {
  const ease = sturdy ? STURDY_EASING : 1;
  const size = Math.min(total, BIGGEST_GOAL_SIZE) * ease;
  const [one, two, three] = STAR_SHARES[difficulty];
  return [Math.max(1, Math.ceil(size * one)), Math.max(2, Math.ceil(size * two)), Math.max(3, Math.ceil(size * three))];
}

export function starsFor(fallen: number, total: number, difficulty: Difficulty, sturdy = false): number {
  return starGoals(total, difficulty, sturdy).filter((goal) => fallen >= goal).length;
}

export function isBigCrash(fallenThisThrow: number, total: number): boolean {
  return fallenThisThrow >= BIG_CRASH_BLOCKS && fallenThisThrow >= total * BIG_CRASH_SHARE;
}

export const bonusUnlocked = (bigCrashes: number): boolean => bigCrashes >= CRASHES_FOR_BONUS;

export function cleanCount(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

export type BestByLevel = Record<string, { stars: number; fallen: number }>;

/** Keeps the better of the saved result and a new one, and says whether this one beat it. */
export function recordBest(
  best: BestByLevel,
  key: string,
  stars: number,
  fallen: number,
): { best: BestByLevel; isNew: boolean } {
  const old = best[key];
  const isNew = fallen > 0 && (!old || fallen > old.fallen);
  if (!isNew) return { best, isNew };
  return { best: { ...best, [key]: { stars: Math.max(stars, old?.stars ?? 0), fallen } }, isNew };
}

/** Saved data can be stale or edited, so a best only counts if it is the right shape. */
export function cleanBest(saved: unknown): BestByLevel {
  if (typeof saved !== 'object' || saved === null) return {};
  const clean: BestByLevel = {};
  for (const [key, value] of Object.entries(saved)) {
    const entry = value as { stars?: unknown; fallen?: unknown } | null;
    if (typeof entry === 'object' && entry !== null) {
      clean[key] = { stars: Math.min(cleanCount(entry.stars), 3), fallen: cleanCount(entry.fallen) };
    }
  }
  return clean;
}
