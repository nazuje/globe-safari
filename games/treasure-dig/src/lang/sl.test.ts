import { missingClips } from '@playroom/kit';
import { expect, it } from 'vitest';
import clips from './sl.clips.json';
import { en } from './en.ts';
import { sl, spokenLines } from './sl.ts';

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

it('keeps the number of spoken lines small', () => {
  expect(spokenLines().length).toBeGreaterThanOrEqual(10);
  expect(spokenLines().length).toBeLessThanOrEqual(40);
});

it('has the same cheers and keys in both languages', () => {
  expect(sl.cheers).toHaveLength(en.cheers.length);
  expect(Object.keys(sl.finds).sort()).toEqual(Object.keys(en.finds).sort());
});

it('keeps every spoken line to a few words', () => {
  for (const line of spokenLines()) expect(line.split(' ').length, line).toBeLessThanOrEqual(7);
});
