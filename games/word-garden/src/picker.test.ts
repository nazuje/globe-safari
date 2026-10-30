import { describe, expect, it } from 'vitest';
import { pickExtras, pickNext } from './picker.ts';
import { LEXICON } from './lexicon.ts';
import { LEVELS } from './words.ts';

/** A small repeatable random source, so failures can be replayed. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const POOL = ['cat', 'dog', 'sun', 'pig'];

describe('pickNext', () => {
  it('uses every word once before any word repeats', () => {
    const random = seeded(1);
    let seen: string[] = [];
    const played: string[] = [];
    for (let i = 0; i < POOL.length; i++) {
      const next = pickNext(POOL, seen, random);
      played.push(next.word);
      seen = next.seen;
    }
    expect([...played].sort()).toEqual([...POOL].sort());
  });

  it('starts a new pass without repeating the last word', () => {
    for (let seed = 0; seed < 50; seed++) {
      const next = pickNext(POOL, ['pig', 'dog', 'cat', 'sun'], seeded(seed));
      expect(next.word).not.toBe('sun');
      expect(next.seen).toEqual([next.word]);
    }
  });

  it('never repeats across many passes', () => {
    const random = seeded(7);
    let seen: string[] = [];
    let last = '';
    for (let i = 0; i < 200; i++) {
      const next = pickNext(POOL, seen, random);
      expect(next.word).not.toBe(last);
      last = next.word;
      seen = next.seen;
    }
  });

  it('ignores saved words that left the pool', () => {
    const next = pickNext(POOL, ['gone', 'cat', 'dog', 'sun'], seeded(3));
    expect(next.word).toBe('pig');
    expect(next.seen).not.toContain('gone');
  });

  it('copes with a pool of one', () => {
    expect(pickNext(['cat'], ['cat'], seeded(1)).word).toBe('cat');
  });
});

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
  return LEXICON.filter(
    (candidate) => candidate.length === word.length && candidate !== word && usesExtra(candidate) && canSpell(candidate),
  );
}

describe('pickExtras', () => {
  it('avoids a letter that would spell another word', () => {
    // Every letter but "x" would spell a rival here, so "x" is the only fair pick.
    const rivals = [...'abcdefghijklmnoprstuvwyz'].map((letter) => `${letter}at`);
    for (let seed = 0; seed < 20; seed++) {
      expect(pickExtras('cat', 1, seeded(seed), rivals)).toEqual(['x']);
    }
  });

  it('avoids a pair of letters that together spell another word', () => {
    for (let seed = 0; seed < 100; seed++) {
      const extras = pickExtras('cat', 2, seeded(seed), ['cat', 'hog']);
      expect(extras.length).toBe(2);
      expect(extras.includes('h') && extras.includes('o')).toBe(false);
    }
  });

  it('never offers a sound-alike or mirror-image letter', () => {
    for (let seed = 0; seed < 100; seed++) {
      const extras = pickExtras('cake', 3, seeded(seed));
      expect(extras).not.toContain('k');
      expect(extras).not.toContain('q');
      expect(extras).not.toContain('s');
      expect(pickExtras('bed', 1, seeded(seed))).not.toContain('p');
      expect(pickExtras('sun', 1, seeded(seed))).not.toContain('z');
    }
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    'gives every level %i word its full set of fair extras',
    (_, level) => {
      for (const { word } of level.words) {
        for (let seed = 0; seed < 100; seed++) {
          const extras = pickExtras(word, level.extras, seeded(seed));
          expect(extras.length).toBe(level.extras);
          expect(new Set(extras).size).toBe(level.extras);
          for (const extra of extras) {
            expect(word).not.toContain(extra);
            expect(extra).toMatch(/^[a-z]$/);
          }
          expect(otherSpellings(word, extras)).toEqual([]);
        }
      }
    },
    30_000,
  );
});
