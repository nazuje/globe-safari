import { store } from './store.ts';

export type Language = 'en' | 'sl';

/** Every language Playroom knows, each named in its own language. */
export const LANGUAGES: Record<Language, { flag: string; name: string }> = {
  sl: { flag: '🇸🇮', name: 'Slovenščina' },
  en: { flag: '🇬🇧', name: 'English' },
};

// One key for the whole site, so the portal and every game agree.
const KEY = 'language';

type Listener = (language: Language) => void;

const listeners = new Set<Listener>();
// Storage can be blocked, and the switch still has to work for this page.
let chosen: Language | null = null;

function isLanguage(value: unknown): value is Language {
  return Object.keys(LANGUAGES).includes(value as string);
}

export function getLanguage(): Language {
  if (chosen) return chosen;
  const saved = store.get<unknown>(KEY, 'en');
  return isLanguage(saved) ? saved : 'en';
}

export function setLanguage(language: Language): void {
  if (language === getLanguage()) return;
  chosen = language;
  store.set(KEY, language);
  for (const listener of listeners) listener(language);
}

/**
 * Calls back whenever the language changes, so a game can redraw its words in
 * place without touching its progress. Returns a function that stops listening.
 */
export function onLanguageChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
