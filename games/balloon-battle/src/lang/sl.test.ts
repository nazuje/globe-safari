import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../characters.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('never repeats a line', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('has a winner line for every character', () => {
    const lines = spokenLines();
    for (const { id } of CHARACTERS) expect(lines).toContain(sl.wins(sl.names[id]));
    expect(sl.wins(sl.names.frog)).toBe('Žaba zmaga!');
  });

  it('counts wins with the right word', () => {
    expect(sl.winsLabel(1)).toBe('1 zmaga');
    expect(sl.winsLabel(2)).toBe('2 zmagi');
    expect(sl.winsLabel(3)).toBe('3 zmage');
    expect(sl.winsLabel(5)).toBe('5 zmag');
  });

  it('never uses a gendered past form about a player', () => {
    expect(spokenLines().filter((line) => /(zmagal|zmagala|priden|pridna|velik si|mala si)/i.test(line))).toEqual([]);
  });

  it('counts down in the same order in both languages', () => {
    expect(sl.countdown).toHaveLength(en.countdown.length);
  });
});
