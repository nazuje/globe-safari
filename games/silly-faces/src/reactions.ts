import { pick } from './parts.ts';

export const SILLY = ['burp', 'sneeze', 'toot', 'giggle', 'yawn', 'spin'] as const;
export const WILD = ['tiny', 'insideOut', 'float'] as const;

export type Silly = (typeof SILLY)[number];
export type Wild = (typeof WILD)[number];
export type Reaction = Silly | Wild;

/** Nothing wild in the very first taps: the ordinary jokes have to land first. */
const WILD_AFTER = 5;
const WILD_CHANCE = 0.09;
/** So a patient child always gets there. */
const WILD_AT_THE_LATEST = 18;

export interface Mood {
  /** Silly reactions not yet used in this round, so all of them come up before any repeats. */
  bag: Silly[];
  /** Wild ones not yet seen, so a child sees each before any repeats. */
  wildBag: Wild[];
  tapsSinceWild: number;
  last: Reaction | null;
}

export function newMood(): Mood {
  return { bag: [], wildBag: [], tapsSinceWild: 0, last: null };
}

function take<T>(bag: T[], fill: readonly T[], random: () => number, avoid: unknown): T {
  if (bag.length === 0) bag.push(...fill);
  const choices = bag.length > 1 ? bag.filter((item) => item !== avoid) : bag;
  const chosen = pick(choices, random);
  bag.splice(bag.indexOf(chosen), 1);
  return chosen;
}

/** What the creature does when tapped. Changes `mood` in place. */
export function nextReaction(mood: Mood, random: () => number = Math.random): Reaction {
  mood.tapsSinceWild += 1;
  const wild =
    mood.tapsSinceWild >= WILD_AT_THE_LATEST || (mood.tapsSinceWild > WILD_AFTER && random() < WILD_CHANCE);
  const reaction = wild ? take(mood.wildBag, WILD, random, mood.last) : take(mood.bag, SILLY, random, mood.last);
  if (wild) mood.tapsSinceWild = 0;
  mood.last = reaction;
  return reaction;
}
