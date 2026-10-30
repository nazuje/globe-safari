import { store, type Language } from '@playroom/kit';
import { textIn } from './lang/index.ts';
import { findWord } from './words.ts';

// Each language has its own garden, because words are spelled differently. English keeps the original key.
const KEYS: Record<Language, string> = { en: 'word-garden', sl: 'word-garden-sl' };

export interface Save {
  /** Every word grown, oldest first. A flower's look comes from its place here. */
  garden: string[];
  /** Words played in each level's current pass, keyed by level id. */
  seen: Record<number, string[]>;
  showWord: boolean;
}

function knownWords(raw: unknown, language: Language): string[] {
  if (!Array.isArray(raw)) return [];
  const { levels } = textIn(language);
  return raw.filter((word): word is string => typeof word === 'string' && findWord(word, levels) !== undefined);
}

/** Saved data can be old or damaged, so keep only what still makes sense. */
export function cleanSave(raw: unknown, language: Language = 'en'): Save {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Save, unknown>>;
  const seenByLevel = (typeof saved.seen === 'object' && saved.seen !== null ? saved.seen : {}) as Record<number, unknown>;
  const seen: Record<number, string[]> = {};
  for (const level of textIn(language).levels) seen[level.id] = knownWords(seenByLevel[level.id], language);
  return { garden: knownWords(saved.garden, language), seen, showWord: saved.showWord === true };
}

export function loadSave(language: Language): Save {
  return cleanSave(store.get<unknown>(KEYS[language], null), language);
}

export function writeSave(save: Save, language: Language): void {
  store.set(KEYS[language], save);
}
