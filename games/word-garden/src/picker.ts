import { LEXICON } from './lexicon.ts';

export type Random = () => number;

export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks the next word, never repeating one until the whole pool has been used.
 * `seen` is in play order, so its last entry is the word just played; it is also
 * never picked first in a new pass, so a word can't come twice in a row.
 */
export function pickNext(
  pool: readonly string[],
  seen: readonly string[],
  random: Random,
): { word: string; seen: string[] } {
  const stillInPool = seen.filter((word) => pool.includes(word));
  const fresh = pool.filter((word) => !stillInPool.includes(word));
  const last = stillInPool.at(-1);
  const newPass = fresh.length === 0;
  const choices = newPass ? pool.filter((word) => word !== last) : fresh;
  const word = choices[Math.floor(random() * choices.length)] ?? pool[0];
  return { word, seen: newPass ? [word] : [...stillInPool, word] };
}

/** Letters that sound or look alike. Any of these beside its partner in a word is an unfair trap. */
const CONFUSABLE = ['ckq', 'csz', 'gj', 'iy', 'fv', 'bdpq'];

const ALPHABET = 'abcdefghijklmnoprstuvwxyz';

function letterCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of text) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return counts;
}

/** True when the tiles can spell `other` and doing so needs at least one tile that isn't in `word`. */
function spellsOtherWord(word: string, tiles: string, other: string): boolean {
  if (other === word || other.length !== word.length) return false;
  const available = letterCounts(tiles);
  const own = letterCounts(word);
  let usesExtra = false;
  for (const [letter, needed] of letterCounts(other)) {
    if (needed > (available.get(letter) ?? 0)) return false;
    if (needed > (own.get(letter) ?? 0)) usesExtra = true;
  }
  return usesExtra;
}

function isFairExtra(letter: string, word: string): boolean {
  if (word.includes(letter)) return false;
  const partners = CONFUSABLE.filter((group) => group.includes(letter)).join('');
  return ![...word].some((own) => partners.includes(own));
}

function fillTray(word: string, count: number, order: readonly string[], rivals: readonly string[]): string[] {
  const extras: string[] = [];
  for (const letter of order) {
    if (extras.length === count) break;
    if (!isFairExtra(letter, word)) continue;
    const tiles = word + extras.join('') + letter;
    if (!rivals.some((other) => spellsOtherWord(word, tiles, other))) extras.push(letter);
  }
  return extras;
}

/**
 * Chooses wrong letters for the tray. None sounds or looks like a letter in the
 * word, and together they can never spell a different real word that fits the
 * slots, so the only spelling on offer is the one the picture shows. An early
 * choice can rule out the rest, so it deals again until the tray is full.
 */
export function pickExtras(
  word: string,
  count: number,
  random: Random,
  lexicon: readonly string[] = LEXICON,
): string[] {
  const rivals = lexicon.filter((other) => other.length === word.length);
  let best: string[] = [];
  for (let tries = 0; tries < 12 && best.length < count; tries++) {
    const extras = fillTray(word, count, shuffled([...ALPHABET], random), rivals);
    if (extras.length > best.length) best = extras;
  }
  return best;
}
