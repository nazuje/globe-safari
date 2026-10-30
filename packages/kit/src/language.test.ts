import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function fakeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const saved = new Map<string, string>();
  return {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => void saved.set(key, value),
  };
}

// Each test gets a fresh module, because a real page loads it once per page.
const load = () => import('./language.ts');

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('language', () => {
  it('starts in English', async () => {
    const { getLanguage } = await load();
    expect(getLanguage()).toBe('en');
  });

  it('is shared through one stored key, so the next page agrees', async () => {
    const first = await load();
    first.setLanguage('sl');
    expect(localStorage.getItem('playroom:language')).toBe('"sl"');
    vi.resetModules();
    const second = await load();
    expect(second.getLanguage()).toBe('sl');
  });

  it('ignores a stored value it does not know', async () => {
    localStorage.setItem('playroom:language', '"xx"');
    const { getLanguage } = await load();
    expect(getLanguage()).toBe('en');
  });

  it('tells listeners about a change, and only a real change', async () => {
    const { onLanguageChange, setLanguage } = await load();
    const heard = vi.fn();
    onLanguageChange(heard);
    setLanguage('en');
    expect(heard).not.toHaveBeenCalled();
    setLanguage('sl');
    expect(heard).toHaveBeenCalledExactlyOnceWith('sl');
  });

  it('stops telling a listener that left', async () => {
    const { onLanguageChange, setLanguage } = await load();
    const heard = vi.fn();
    onLanguageChange(heard)();
    setLanguage('sl');
    expect(heard).not.toHaveBeenCalled();
  });

  it('still switches for this page when storage is blocked', async () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    const { getLanguage, setLanguage } = await load();
    setLanguage('sl');
    expect(getLanguage()).toBe('sl');
  });
});
