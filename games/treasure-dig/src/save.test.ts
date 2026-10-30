import { describe, expect, it } from 'vitest';
import { ITEMS } from './catalog.ts';
import { addFound, currentDino, freshSave, missingBones, pickFresh, readSave } from './save.ts';

describe('reading a save', () => {
  it('survives junk', () => {
    for (const junk of [null, undefined, 3, 'hi', [], { found: 'x', place: 99, size: 'huge', patches: -1 }]) {
      expect(readSave(junk)).toEqual(freshSave());
    }
  });

  it('keeps what is good and drops what is not', () => {
    const save = readSave({ found: ['ruby', 'ruby', 'gone', 7], size: 'big', place: 2, patches: 4, sinceChest: 1.5, sinceEgg: 3 });
    expect(save).toEqual({ found: ['ruby'], size: 'big', place: 2, patches: 4, sinceChest: 0, sinceEgg: 3 });
  });
});

describe('collecting', () => {
  it('counts each thing once', () => {
    const save = freshSave();
    addFound(save, 'ruby');
    addFound(save, 'ruby');
    expect(save.found).toEqual(['ruby']);
  });

  it('finishes one dinosaur before starting the next', () => {
    const save = freshSave();
    expect(currentDino(save)).toBe('longneck');
    for (const id of missingBones(save, 'longneck')) addFound(save, id);
    expect(currentDino(save)).toBe('threehorn');
  });

  it('offers what is still missing first', () => {
    const save = freshSave();
    const [first, second] = ITEMS;
    addFound(save, first!.id);
    expect(pickFresh(save, [first!, second!], 1, Math.random)).toEqual([second]);
  });

  it('has unique ids', () => {
    expect(new Set(ITEMS.map((item) => item.id)).size).toBe(ITEMS.length);
  });
});
