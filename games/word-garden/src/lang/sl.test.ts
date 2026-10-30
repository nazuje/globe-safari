import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { flowerAt, FRIENDS, friendArriving } from '../garden.ts';
import { pickExtras } from '../picker.ts';
import { cleanSave } from '../save.ts';
import { findWord } from '../words.ts';
import clips from './sl.clips.json';
import { sl, slowLines, spokenLines } from './sl.ts';

/** A small repeatable random source, so failures can be replayed. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const ALPHABET = 'abcčdefghijklmnoprsštuvzž';
const all = sl.levels.flatMap((level) => level.words);

/** Same test the game must pass, written separately from the code it checks. */
function otherSpellings(word: string, extras: readonly string[]): string[] {
  const canSpell = (candidate: string) => {
    const tiles = [...word, ...extras];
    for (const letter of candidate) {
      const at = tiles.indexOf(letter);
      if (at === -1) return false;
      tiles.splice(at, 1);
    }
    return true;
  };
  const usesExtra = (candidate: string) => [...word].sort().join('') !== [...candidate].sort().join('');
  return sl.lexicon.filter(
    (candidate) => candidate.length === word.length && candidate !== word && usesExtra(candidate) && canSpell(candidate),
  );
}

describe('Slovenian clips', () => {
  it('has a clip for every Slovenian line', () => {
    expect(missingClips(clips, spokenLines(), slowLines())).toEqual([]);
  });

  it('declares every word, every letter and every friend line', () => {
    const lines = spokenLines();
    for (const { word } of all) expect(lines).toContain(word);
    for (const letter of ALPHABET) expect(lines).toContain(sl.letterSound(letter));
    for (const { name } of FRIENDS) expect(lines).toContain(sl.friendCame(name));
    for (const { word } of all) expect(slowLines()).toContain(word);
    for (const letter of ALPHABET) expect(slowLines()).toContain(sl.letterSound(letter));
  });
});

describe('Slovenian letters', () => {
  it('gives every letter its own sound', () => {
    const sounds = [...ALPHABET].map((letter) => sl.letterSound(letter));
    expect(new Set(sounds).size).toBe(25);
    expect(sl.letterSound('č')).toBe('če');
    expect(sl.letterSound('š')).toBe('še');
    expect(sl.letterSound('ž')).toBe('že');
  });

  it('shows capitals, carons included', () => {
    expect(sl.show('žaba')).toBe('ŽABA');
    expect(sl.show('č')).toBe('Č');
    expect(sl.show('š')).toBe('Š');
  });
});

describe('Slovenian word data', () => {
  it('uses only the 25 letters of the alphabet, as single characters', () => {
    for (const { word } of all) {
      expect(word).toMatch(/^[abcčdefghijklmnoprsštuvzž]+$/);
      expect(word).toBe(word.normalize('NFC'));
    }
    expect([...sl.letters.alphabet].sort()).toEqual([...ALPHABET].sort());
  });

  it.each(sl.levels.map((level) => [level.id, level] as const))('level %i has 15 or more unique words', (_, level) => {
    const words = level.words.map((entry) => entry.word);
    expect(new Set(words).size).toBe(words.length);
    expect(words.length).toBeGreaterThanOrEqual(15);
  });

  it.each(sl.levels.map((level) => [level.id, level] as const))('level %i practises č, š and ž', (_, level) => {
    const words = level.words.map((entry) => entry.word).join('');
    for (const letter of 'čšž') expect(words).toContain(letter);
  });

  it('never shares a word or a picture between entries', () => {
    expect(new Set(all.map((entry) => entry.word)).size).toBe(all.length);
    expect(new Set(all.map((entry) => entry.emoji)).size).toBe(all.length);
  });

  it('keeps each level to its word length', () => {
    expect(sl.levels.map((level) => [...new Set(level.words.map((entry) => entry.word.length))])).toEqual([[3], [4], [5]]);
  });

  it('finds a word and its level', () => {
    expect(findWord('žaba', sl.levels)?.level.id).toBe(2);
    expect(findWord('žaba', sl.levels)?.picture.emoji).toBe('🐸');
    expect(findWord('žaba')).toBeUndefined();
  });

  it('has its own lexicon, with no English spelling in it', () => {
    expect(sl.lexicon).toContain('pes');
    expect(sl.lexicon).not.toContain('cat');
    for (const word of sl.lexicon) expect(word).toMatch(/^[abcčdefghijklmnoprsštuvzž]+$/);
  });

  it('knows every game word as a real word', () => {
    for (const { word } of all) expect(sl.lexicon).toContain(word);
  });
});

describe('Slovenian extras', () => {
  it('never offers a sound-alike of č, š or ž', () => {
    for (let seed = 0; seed < 100; seed++) {
      const extras = pickExtras('kača', 2, seeded(seed), sl.lexicon, sl.letters);
      for (const trap of 'csšzž') expect(extras).not.toContain(trap);
      const zob = pickExtras('zob', 1, seeded(seed), sl.lexicon, sl.letters);
      for (const trap of 'žp') expect(zob).not.toContain(trap);
    }
  });

  it('avoids a letter that would spell another Slovenian word', () => {
    for (let seed = 0; seed < 100; seed++) {
      // "pes" and "a" would spell "pas", and "pes" and "t" would spell "pet".
      const extras = pickExtras('pes', 1, seeded(seed), sl.lexicon, sl.letters);
      expect(extras).not.toEqual(['a']);
      expect(extras).not.toEqual(['t']);
    }
  });

  it('never deals a letter Slovenian does not have', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const extra of pickExtras('sonce', 3, seeded(seed), sl.lexicon, sl.letters)) {
        expect('qwxy').not.toContain(extra);
      }
    }
  });

  it.each(sl.levels.map((level) => [level.id, level] as const))(
    'gives every level %i word its full set of fair extras',
    (_, level) => {
      for (const { word } of level.words) {
        for (let seed = 0; seed < 100; seed++) {
          const extras = pickExtras(word, level.extras, seeded(seed), sl.lexicon, sl.letters);
          expect(extras.length).toBe(level.extras);
          expect(new Set(extras).size).toBe(level.extras);
          for (const extra of extras) {
            expect(word).not.toContain(extra);
            expect(ALPHABET).toContain(extra);
          }
          expect(otherSpellings(word, extras)).toEqual([]);
        }
      }
    },
    30_000,
  );
});

describe('Slovenian garden', () => {
  it('keeps Slovenian words, and a word from another language does not get in', () => {
    const save = cleanSave({ garden: ['žaba', 'frog', 'miš'], seen: { 1: ['miš', 'cat'] } }, 'sl');
    expect(save.garden).toEqual(['žaba', 'miš']);
    expect(save.seen[1]).toEqual(['miš']);
  });

  it('leaves an English garden alone', () => {
    expect(cleanSave({ garden: ['frog', 'žaba'] }).garden).toEqual(['frog']);
  });

  it('keeps the flower and friend flow', () => {
    expect(flowerAt(0)).toBeTruthy();
    const friend = friendArriving(5);
    expect(friend && sl.friendCame(friend.name)).toBe('Čebela je priletela na tvoj vrt!');
  });
});
