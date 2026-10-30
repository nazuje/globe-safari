import { shuffled, type Random } from './picker.ts';

export interface Tile {
  id: number;
  letter: string;
  used: boolean;
}

export interface Spelling {
  word: string;
  tiles: readonly Tile[];
  /** How many slots, from the left, hold a locked-in letter. */
  filled: number;
}

export type Outcome = 'correct' | 'wrong' | 'complete' | 'ignored';

/** True while the tray, read left to right, gives the answer away. */
function spellsWordInOrder(tiles: readonly Tile[], word: string): boolean {
  return tiles.map((tile) => tile.letter).join('').includes(word);
}

export function startSpelling(word: string, extras: readonly string[], random: Random): Spelling {
  const letters = [...word, ...extras].map((letter, id) => ({ id, letter, used: false }));
  let tiles = shuffled(letters, random);
  for (let tries = 0; tries < 20 && spellsWordInOrder(tiles, word); tries++) {
    tiles = shuffled(letters, random);
  }
  return { word, tiles, filled: 0 };
}

/** Tapping the right letter locks it in. A wrong letter changes nothing, so a child can never lose ground. */
export function tapTile(state: Spelling, tileId: number): { state: Spelling; outcome: Outcome } {
  const tile = state.tiles.find((candidate) => candidate.id === tileId);
  if (!tile || tile.used || state.filled === state.word.length) return { state, outcome: 'ignored' };
  if (tile.letter !== state.word[state.filled]) return { state, outcome: 'wrong' };

  const filled = state.filled + 1;
  const tiles = state.tiles.map((other) => (other.id === tileId ? { ...other, used: true } : other));
  return {
    state: { ...state, tiles, filled },
    outcome: filled === state.word.length ? 'complete' : 'correct',
  };
}

/** The tile a hint should light up, or null once the word is done. */
export function hintTile(state: Spelling): number | null {
  const needed = state.word[state.filled];
  return state.tiles.find((tile) => !tile.used && tile.letter === needed)?.id ?? null;
}
