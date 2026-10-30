import { missingClips } from '@playroom/kit';
import { expect, it } from 'vitest';
import clips from './sl.clips.json';
import { spokenLines } from './sl.ts';

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

it('stays within the short list a fun game should say', () => {
  expect(spokenLines().length).toBeLessThanOrEqual(40);
});
