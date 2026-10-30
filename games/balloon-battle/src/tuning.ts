/**
 * How much air a tap gives. Each level's taps are set so a typical player of that
 * size fills a balloon in the same time, so a 4-year-old and a 6-year-old both
 * finish at about 8 seconds. simulate.test.ts checks that claim.
 */
export type Level = 'little' | 'big' | 'grownup';

export interface LevelInfo {
  id: Level;
  emoji: string;
  /** Taps to fill a balloon, with no comeback help. */
  tapsToFill: number;
  /** The tapping speed this level is built around. */
  tapsPerSecond: number;
}

export const LEVELS: readonly LevelInfo[] = [
  { id: 'little', emoji: '🐣', tapsToFill: 24, tapsPerSecond: 3 },
  { id: 'big', emoji: '🐥', tapsToFill: 40, tapsPerSecond: 5 },
  { id: 'grownup', emoji: '🦖', tapsToFill: 56, tapsPerSecond: 7 },
];

/** Extra air per tap for each whole balloon the player is behind. The players never hear about this. */
export const COMEBACK_GAIN = 2;
/** The most the comeback can add, as a share of a normal tap. */
export const COMEBACK_MAX = 0.5;

/**
 * Presses closer together than this on one half count as one puff. Fingers can't
 * alternate this fast, but a flat hand can, and it shouldn't beat tapping.
 */
export const PUFF_GAP_MS = 50;

export function levelInfo(level: Level): LevelInfo {
  const found = LEVELS.find((candidate) => candidate.id === level);
  if (!found) throw new Error(`Unknown level ${level}`);
  return found;
}

/** The secret helping hand: 1 when level or ahead, up to 1 + COMEBACK_MAX when far behind. */
export function comebackBoost(ownFill: number, otherFill: number, gain = COMEBACK_GAIN): number {
  const behind = Math.max(0, otherFill - ownFill);
  return 1 + Math.min(COMEBACK_MAX, gain * behind);
}

/** The share of a full balloon that one tap adds. */
export function airForTap(level: Level, ownFill: number, otherFill: number, gain = COMEBACK_GAIN): number {
  return comebackBoost(ownFill, otherFill, gain) / levelInfo(level).tapsToFill;
}

/** The pump's note climbs about an octave and a half as the balloon fills. */
export function pumpHz(fill: number): number {
  return 220 * 2 ** (Math.min(1, Math.max(0, fill)) * 1.6);
}

/** How big the balloon is drawn, as a share of its full size. It starts small but visible. */
export function balloonScale(fill: number): number {
  return 0.2 + 0.8 * Math.min(1, Math.max(0, fill));
}
