export const PLAYERS = ['fox', 'frog'] as const;
export type Player = (typeof PLAYERS)[number];

export const PLAYER_EMOJI: Record<Player, string> = { fox: '🦊', frog: '🐸' };

export interface Tally {
  fox: number;
  frog: number;
  /** Who is throwing now. */
  turn: Player;
  /** Turns played on the current level, so the screen knows when both have had a go. */
  turnsOnLevel: number;
}

export const newTally = (): Tally => ({ fox: 0, frog: 0, turn: 'fox', turnsOnLevel: 0 });

/** Adds a finished turn and hands over to the other player. */
export function turnFinished(tally: Tally, fallen: number): Tally {
  return {
    ...tally,
    [tally.turn]: tally[tally.turn] + fallen,
    turn: tally.turn === 'fox' ? 'frog' : 'fox',
    turnsOnLevel: tally.turnsOnLevel + 1,
  };
}

export const bothHaveGone = (tally: Tally): boolean => tally.turnsOnLevel >= PLAYERS.length;

/** A new level starts with whoever went second last time, so nobody always goes first. */
export const nextLevel = (tally: Tally): Tally => ({ ...tally, turnsOnLevel: 0 });

/** No winner on purpose: the headline number is what they knocked down together. */
export const together = (tally: Tally): number => tally.fox + tally.frog;
