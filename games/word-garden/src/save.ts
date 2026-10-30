import { store } from '@playroom/kit';
import { findWord, LEVELS } from './words.ts';

const KEY = 'word-garden';

export interface Save {
  /** Every word grown, oldest first. A flower's look comes from its place here. */
  garden: string[];
  /** Words played in each level's current pass, keyed by level id. */
  seen: Record<number, string[]>;
  showWord: boolean;
}

function knownWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((word): word is string => typeof word === 'string' && findWord(word) !== undefined);
}

/** Saved data can be old or damaged, so keep only what still makes sense. */
export function cleanSave(raw: unknown): Save {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Save, unknown>>;
  const seenByLevel = (typeof saved.seen === 'object' && saved.seen !== null ? saved.seen : {}) as Record<number, unknown>;
  const seen: Record<number, string[]> = {};
  for (const level of LEVELS) seen[level.id] = knownWords(seenByLevel[level.id]);
  return { garden: knownWords(saved.garden), seen, showWord: saved.showWord === true };
}

export function loadSave(): Save {
  return cleanSave(store.get<unknown>(KEY, null));
}

export function writeSave(save: Save): void {
  store.set(KEY, save);
}
