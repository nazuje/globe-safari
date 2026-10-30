import { missingClips } from '@playroom/kit';
import { expect, it } from 'vitest';
import { FRIENDS } from '../friends.ts';
import clips from './sl.clips.json';
import { en } from './en.ts';
import { sl, spokenLines } from './sl.ts';

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

it('stays a game that talks little', () => {
  expect(spokenLines().length).toBeLessThanOrEqual(42);
  expect(new Set(spokenLines()).size).toBe(spokenLines().length);
});

it('names every friend in both languages', () => {
  for (const { id } of FRIENDS) {
    expect(en.friends[id]).toBeTruthy();
    expect(sl.friends[id]).toBeTruthy();
  }
});
