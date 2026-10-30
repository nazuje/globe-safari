import { describe, expect, it } from 'vitest';
import { slCount, slCounted, slNumber, type SlNoun } from './slovenian.ts';

const JABOLKO: SlNoun = { gender: 'n', one: 'jabolko', two: 'jabolki', few: 'jabolka', many: 'jabolk' };
const BANANA_ACC: SlNoun = { gender: 'f', one: 'banano', two: 'banani', few: 'banane', many: 'banan' };
const PISKOT_NOM: SlNoun = { gender: 'm', one: 'piškot', two: 'piškota', few: 'piškoti', many: 'piškotov' };
const PISKOT_ACC: SlNoun = { gender: 'm', one: 'piškot', two: 'piškota', few: 'piškote', many: 'piškotov' };

describe('slCount', () => {
  it('picks the singular, dual, few and many forms', () => {
    expect([1, 2, 3, 4, 5, 10].map((n) => slCount(n, JABOLKO))).toEqual([
      'jabolko',
      'jabolki',
      'jabolka',
      'jabolka',
      'jabolk',
      'jabolk',
    ]);
  });

  it('uses the many form for zero', () => {
    expect(slCount(0, JABOLKO)).toBe('jabolk');
  });

  it('looks at the last two digits, not the last one', () => {
    expect(slCount(21, JABOLKO)).toBe('jabolk');
    expect(slCount(23, JABOLKO)).toBe('jabolk');
    expect(slCount(101, JABOLKO)).toBe('jabolko');
    expect(slCount(102, JABOLKO)).toBe('jabolki');
    expect(slCount(111, JABOLKO)).toBe('jabolk');
  });
});

describe('slNumber', () => {
  it('agrees with the gender for one and two', () => {
    expect(['m', 'f', 'n'].map((gender) => slNumber(1, gender as SlNoun['gender']))).toEqual(['en', 'ena', 'eno']);
    expect(['m', 'f', 'n'].map((gender) => slNumber(2, gender as SlNoun['gender']))).toEqual(['dva', 'dve', 'dve']);
  });

  it('gives masculine its own three and four', () => {
    expect(slNumber(3, 'm')).toBe('trije');
    expect(slNumber(4, 'm')).toBe('štirje');
    expect(slNumber(3, 'f')).toBe('tri');
    expect(slNumber(4, 'n')).toBe('štiri');
  });

  it('changes in the accusative', () => {
    expect(slNumber(1, 'f', 'acc')).toBe('eno');
    expect(slNumber(3, 'm', 'acc')).toBe('tri');
    expect(slNumber(4, 'm', 'acc')).toBe('štiri');
  });

  it('is the same for every gender from five to ten', () => {
    expect([5, 6, 7, 8, 9, 10].map((n) => slNumber(n, 'm'))).toEqual(['pet', 'šest', 'sedem', 'osem', 'devet', 'deset']);
    expect(slNumber(5, 'f', 'acc')).toBe('pet');
  });

  it('falls back to digits past ten', () => {
    expect(slNumber(11, 'n')).toBe('11');
    expect(slNumber(0, 'n')).toBe('0');
  });
});

describe('slCounted', () => {
  it('says the apple sentence from the grammar book', () => {
    expect([1, 2, 3, 4, 5].map((n) => slCounted(n, JABOLKO))).toEqual([
      'eno jabolko',
      'dve jabolki',
      'tri jabolka',
      'štiri jabolka',
      'pet jabolk',
    ]);
  });

  it('agrees for a feminine noun in the accusative', () => {
    expect([1, 2, 3, 5].map((n) => slCounted(n, BANANA_ACC, 'acc'))).toEqual([
      'eno banano',
      'dve banani',
      'tri banane',
      'pet banan',
    ]);
  });

  it('agrees for a masculine noun in both cases', () => {
    expect(slCounted(3, PISKOT_NOM)).toBe('trije piškoti');
    expect(slCounted(3, PISKOT_ACC, 'acc')).toBe('tri piškote');
    expect(slCounted(2, PISKOT_ACC, 'acc')).toBe('dva piškota');
    expect(slCounted(5, PISKOT_ACC, 'acc')).toBe('pet piškotov');
  });
});
