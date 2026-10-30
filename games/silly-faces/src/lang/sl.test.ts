import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { OPTIONS, PARTS, TABS } from '../parts.ts';
import { SILLY, WILD } from '../reactions.ts';
import { en } from './en.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

const REACTION_IDS = [...SILLY, ...WILD];

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('keeps every line short and each one different', () => {
    const lines = spokenLines();
    expect(new Set(lines).size).toBe(lines.length);
    expect(lines.length).toBeGreaterThanOrEqual(10);
    expect(lines.length).toBeLessThanOrEqual(40);
    for (const line of lines) expect(line.split(' ').length, line).toBeLessThanOrEqual(7);
  });

  it('never leaves a word the voice would spell out', () => {
    const words = spokenLines().flatMap((line) => line.split(/[^\p{L}]+/u).filter(Boolean));
    for (const word of words) expect(word, word).toMatch(/[aeiou]/i);
  });

  it('has a spoken line for every reaction', () => {
    for (const id of REACTION_IDS) expect(sl.reactions[id]).toBeTruthy();
    expect(Object.keys(sl.reactions).sort()).toEqual([...REACTION_IDS].sort());
  });
});

describe('labels', () => {
  it('names every tab and option in both languages', () => {
    for (const tab of TABS) {
      expect(en.tabs[tab]).toBeTruthy();
      expect(sl.tabs[tab]).toBeTruthy();
    }
    for (const part of PARTS) {
      for (const id of OPTIONS[part]) {
        const key = id as string;
        expect((en.options[part] as Record<string, string>)[key], `${part} ${key}`).toBeTruthy();
        expect((sl.options[part] as Record<string, string>)[key], `${part} ${key}`).toBeTruthy();
      }
    }
  });
});
