import { missingClips } from '@playroom/kit';
import { expect, it } from 'vitest';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines())).toEqual([]);
});

it('stays within the short list a fun game should say', () => {
  expect(spokenLines().length).toBeLessThanOrEqual(40);
});

it('talks about tickling and friends, never fighting', () => {
  const words = JSON.stringify([en, sl]).toLowerCase();
  for (const banned of ['enem', 'kill', 'shoot', 'explo', 'destroy', 'sovraž', 'streljaj', 'ubij', 'eksplo', 'uniči']) {
    expect(words).not.toContain(banned);
  }
});
