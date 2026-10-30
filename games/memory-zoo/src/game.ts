import type { Animal } from './animals.ts';
import { text } from './lang/index.ts';

/** Returns a number from 0 up to, but not including, 1. Tests pass their own. */
export type Random = () => number;

export interface GameState {
  cards: readonly Animal[];
  stars: readonly number[];
  current: number;
  flips: number;
  /** Positions turned up this turn and not yet matched. */
  faceUp: readonly number[];
  matched: readonly number[];
  phase: 'picking' | 'peeking' | 'finished';
}

export type FlipEvent = 'ignored' | 'first' | 'match' | 'miss' | 'finished';

export interface FlipResult {
  game: GameState;
  event: FlipEvent;
}

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const mixed = [...items];
  for (let last = mixed.length - 1; last > 0; last--) {
    const pick = Math.floor(random() * (last + 1));
    [mixed[last], mixed[pick]] = [mixed[pick], mixed[last]];
  }
  return mixed;
}

export function buildDeck(pairs: number, pool: readonly Animal[], random: Random = Math.random): Animal[] {
  if (pairs > pool.length) throw new Error(`Only ${pool.length} animals for ${pairs} pairs`);
  const chosen = shuffle(pool, random).slice(0, pairs);
  return shuffle([...chosen, ...chosen], random);
}

export function newGame(
  pairs: number,
  playerCount: number,
  pool: readonly Animal[],
  random: Random = Math.random,
): GameState {
  return {
    cards: buildDeck(pairs, pool, random),
    stars: new Array<number>(playerCount).fill(0),
    current: 0,
    flips: 0,
    faceUp: [],
    matched: [],
    phase: 'picking',
  };
}

function isFaceUp(game: GameState, index: number): boolean {
  return game.faceUp.includes(index) || game.matched.includes(index);
}

function claimPair(game: GameState, first: number, second: number): FlipResult {
  const matched = [...game.matched, first, second];
  const finished = matched.length === game.cards.length;
  return {
    game: {
      ...game,
      matched,
      faceUp: [],
      stars: game.stars.map((count, player) => (player === game.current ? count + 1 : count)),
      phase: finished ? 'finished' : 'picking',
    },
    event: finished ? 'finished' : 'match',
  };
}

/** Turns one card up. Anything that can't be turned right now comes back as 'ignored'. */
export function flipCard(game: GameState, index: number): FlipResult {
  if (game.phase !== 'picking' || index < 0 || index >= game.cards.length || isFaceUp(game, index)) {
    return { game, event: 'ignored' };
  }
  const counted = { ...game, flips: game.flips + 1 };
  if (game.faceUp.length === 0) {
    return { game: { ...counted, faceUp: [index] }, event: 'first' };
  }
  const first = game.faceUp[0];
  if (game.cards[first] === game.cards[index]) return claimPair(counted, first, index);
  return { game: { ...counted, faceUp: [first, index], phase: 'peeking' }, event: 'miss' };
}

/** After a miss: the two cards go back down and the turn passes. */
export function endPeek(game: GameState): GameState {
  if (game.phase !== 'peeking') return game;
  return {
    ...game,
    faceUp: [],
    current: (game.current + 1) % game.stars.length,
    phase: 'picking',
  };
}

/** The player with the most stars, or null when they are level. */
export function leader(stars: readonly number[]): number | null {
  const most = Math.max(...stars);
  const leaders = stars.filter((count) => count === most);
  return leaders.length === 1 ? stars.indexOf(most) : null;
}

export function matchLine(animal: Animal, goesAgain: boolean): string {
  return text().matchLine(animal, goesAgain);
}

export function turnLine(name: string): string {
  return text().turnLine(name);
}

export function winnerLine(names: readonly string[], stars: readonly number[]): string {
  const winner = leader(stars);
  return winner === null ? text().tie : text().mostFound(names[winner]);
}
