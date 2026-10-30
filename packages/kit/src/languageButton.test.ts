import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function fakeButton() {
  const clicks: (() => void)[] = [];
  const attributes = new Map<string, string>();
  return {
    hidden: false,
    textContent: '',
    title: '',
    type: '',
    className: '',
    attributes,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    addEventListener: (_type: string, listener: () => void) => void clicks.push(listener),
    tap: () => clicks.forEach((listener) => listener()),
  };
}

async function load() {
  const button = fakeButton();
  vi.stubGlobal('document', { createElement: () => button });
  const made = await import('./languageButton.ts');
  const language = await import('./language.ts');
  return { button, ...made, ...language };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('nextLanguage', () => {
  it('wraps round', async () => {
    const { nextLanguage } = await load();
    expect(nextLanguage(['en', 'sl'], 'en')).toBe('sl');
    expect(nextLanguage(['en', 'sl'], 'sl')).toBe('en');
  });

  it('starts from the top when the game lacks the current language', async () => {
    const { nextLanguage } = await load();
    expect(nextLanguage(['sl'], 'en')).toBe('sl');
  });

  it('stays put with nothing to switch to', async () => {
    const { nextLanguage } = await load();
    expect(nextLanguage([], 'en')).toBe('en');
  });
});

describe('languageButton', () => {
  it('shows the language in use and names the one a tap switches to', async () => {
    const { button, languageButton } = await load();
    languageButton(['en', 'sl']);
    expect(button.textContent).toBe('🇬🇧');
    expect(button.attributes.get('aria-label')).toBe('Slovenščina');
  });

  it('switches language on a tap and tells the game, so it can redraw', async () => {
    const { button, getLanguage, languageButton, onLanguageChange } = await load();
    const redraw = vi.fn();
    onLanguageChange(redraw);
    languageButton(['en', 'sl']);
    button.tap();
    expect(getLanguage()).toBe('sl');
    expect(redraw).toHaveBeenCalledExactlyOnceWith('sl');
    expect(button.textContent).toBe('🇸🇮');
    button.tap();
    expect(getLanguage()).toBe('en');
  });

  it('stops the old language speaking before it switches', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    vi.stubGlobal('speechSynthesis', { speaking: true, pending: false, cancel });
    const { button, languageButton } = await load();
    languageButton(['en', 'sl']);
    button.tap();
    expect(cancel).toHaveBeenCalled();
  });

  it('hides for a game with one language', async () => {
    const { button, languageButton } = await load();
    languageButton(['en']);
    expect(button.hidden).toBe(true);
  });
});
