import { missingClips } from '@playroom/kit';
import { expect, it } from 'vitest';
import clips from './sl.clips.json';
import { spokenLines } from './sl.ts';

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

it('stays near thirty spoken lines', () => {
  expect(spokenLines().length).toBeLessThanOrEqual(32);
});
