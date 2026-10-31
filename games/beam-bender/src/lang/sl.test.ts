import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('keeps to about 30 spoken lines', () => {
    expect(spokenLines().length).toBeLessThanOrEqual(30);
  });

  it('has a line for every idea and a name for every world', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
    expect(Object.keys(sl.worlds)).toEqual(Object.keys(en.worlds));
    expect(sl.lost).toHaveLength(en.lost.length);
  });
});
