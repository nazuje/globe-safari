import { describe, expect, it } from 'vitest';
import { cleanSave } from './save.ts';

describe('cleanSave', () => {
  it('starts fresh from nothing or junk', () => {
    for (const raw of [null, undefined, 'hello', 7, []]) {
      expect(cleanSave(raw)).toEqual({ garden: [], seen: { 1: [], 2: [], 3: [] }, showWord: false });
    }
  });

  it('keeps good data', () => {
    const save = { garden: ['cat', 'frog'], seen: { 1: ['cat'], 2: [], 3: [] }, showWord: true };
    expect(cleanSave(save)).toEqual(save);
  });

  it('drops words the game no longer has', () => {
    const save = cleanSave({ garden: ['cat', 'gone', 3], seen: { 1: 'oops', 2: ['nope', 'ship'] } });
    expect(save.garden).toEqual(['cat']);
    expect(save.seen[1]).toEqual([]);
    expect(save.seen[2]).toEqual(['ship']);
  });
});
