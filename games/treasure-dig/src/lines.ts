import { itemById } from './catalog.ts';
import { text } from './lang/index.ts';

const OWN_LINE = { coin: 'coin', crown: 'crown', 'party-crown': 'crown', rocket: 'rocket', mole: 'mole', worm: 'worm' } as const;

/** What a find says out loud. A few things have a line of their own; the rest speak for their family. */
export function itemLine(id: string): string {
  const words = text();
  const own = OWN_LINE[id as keyof typeof OWN_LINE];
  if (own) return words[own];
  return words.finds[itemById(id)?.family ?? 'nature'];
}
