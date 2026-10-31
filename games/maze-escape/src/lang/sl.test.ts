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
    expect(spokenLines().length).toBeLessThanOrEqual(34);
  });

  it('has a word for every idea', () => {
    expect(Object.keys(sl.ideas)).toEqual(Object.keys(en.ideas));
  });
});
