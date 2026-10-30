import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import clips from './sl.clips.json';
import { en } from './en.ts';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('stays a game that hardly talks', () => {
    expect(spokenLines().length).toBeGreaterThanOrEqual(10);
    expect(spokenLines().length).toBeLessThanOrEqual(40);
  });

  it('declares every name and style the game can shout', () => {
    const lines = new Set(spokenLines());
    for (const name of [...Object.values(sl.names), ...Object.values(sl.styles)]) expect(lines).toContain(sl.say.name(name));
  });

  it('has the same words as English', () => {
    expect(Object.keys(sl.names)).toEqual(Object.keys(en.names));
    expect(Object.keys(sl.styles)).toEqual(Object.keys(en.styles));
    expect(sl.say.cheers).toHaveLength(en.say.cheers.length);
  });
});
