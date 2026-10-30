import { describe, expect, it } from 'vitest';
import { LEXICON } from './lexicon.ts';
import { findWord, LEVELS } from './words.ts';

describe('word data', () => {
  const all = LEVELS.flatMap((level) => level.words);

  it('uses only lowercase a to z', () => {
    for (const { word } of all) expect(word).toMatch(/^[a-z]+$/);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('level %i has 15 or more unique words', (_, level) => {
    const words = level.words.map((entry) => entry.word);
    expect(new Set(words).size).toBe(words.length);
    expect(words.length).toBeGreaterThanOrEqual(15);
  });

  it('never shares a word or a picture between entries', () => {
    expect(new Set(all.map((entry) => entry.word)).size).toBe(all.length);
    expect(new Set(all.map((entry) => entry.emoji)).size).toBe(all.length);
  });

  it('keeps each level to its word length', () => {
    expect(LEVELS.map((level) => [...new Set(level.words.map((entry) => entry.word.length))])).toEqual([[3], [4], [5]]);
  });

  it('finds a word and its level', () => {
    expect(findWord('frog')?.level.id).toBe(2);
    expect(findWord('frog')?.picture.emoji).toBe('🐸');
    expect(findWord('nope')).toBeUndefined();
  });

  it('knows every game word as a real word', () => {
    for (const { word } of all) expect(LEXICON).toContain(word);
  });
});
