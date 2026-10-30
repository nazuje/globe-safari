import { getLanguage, LANGUAGES, setLanguage, type Language } from './language.ts';
import { stopSpeaking } from './speech.ts';

/** The language after this one, wrapping round. A language the game lacks starts it from the top. */
export function nextLanguage(supported: readonly Language[], current: Language): Language {
  return supported[(supported.indexOf(current) + 1) % supported.length] ?? current;
}

/**
 * A big round flag for the game's top bar, showing the language in use. A tap
 * switches language; use onLanguageChange() to redraw the game's words. It stays
 * hidden when the game has only one language.
 */
export function languageButton(supported: readonly Language[]): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'language-btn';
  button.hidden = supported.length < 2;

  const show = (): void => {
    const current = getLanguage();
    const next = LANGUAGES[nextLanguage(supported, current)];
    button.textContent = LANGUAGES[current].flag;
    button.setAttribute('aria-label', next.name);
    button.title = next.name;
  };

  button.addEventListener('click', () => {
    // A line in the old language shouldn't carry on over the new one.
    stopSpeaking();
    setLanguage(nextLanguage(supported, getLanguage()));
    show();
  });
  show();
  return button;
}
