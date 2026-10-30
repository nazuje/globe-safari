import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from './store.ts';

function fakeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const saved = new Map<string, string>();
  return {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => void saved.set(key, value),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('store', () => {
  it('round-trips JSON values', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    store.set('best', { score: 12, name: 'Mia' });
    expect(store.get('best', null)).toEqual({ score: 12, name: 'Mia' });
  });

  it('returns the fallback for a missing key', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    expect(store.get('nothing', 7)).toBe(7);
  });

  it('keeps falsy saved values instead of using the fallback', () => {
    vi.stubGlobal('localStorage', fakeStorage());
    store.set('score', 0);
    expect(store.get('score', 5)).toBe(0);
  });

  it('returns the fallback when the saved value is not JSON', () => {
    const storage = fakeStorage();
    storage.setItem('playroom:broken', '{oops');
    vi.stubGlobal('localStorage', storage);
    expect(store.get('broken', 'safe')).toBe('safe');
  });

  it('never throws when storage is blocked', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked });
    expect(() => store.set('key', 1)).not.toThrow();
    expect(store.get('key', 'fallback')).toBe('fallback');
  });

  it('never throws when storage does not exist', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => store.set('key', 1)).not.toThrow();
    expect(store.get('key', 'fallback')).toBe('fallback');
  });
});
