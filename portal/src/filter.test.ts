import { describe, expect, it } from 'vitest';
import { NO_FILTERS, applyFilter, parseAges, restoreFilter, skillsIn, type Filters } from './filter.ts';
import { GAMES as REGISTRY, MODE_LABELS, type Game, type Mode, type Skill } from './games.ts';

function game(slug: string, skills: Skill[], ages = '4-9', modes: Mode[] = ['solo', 'together']): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills, ages, modes, color: '#000000', status: 'ready' };
}

const GAMES = [
  game('a', ['reading'], '3-4'),
  game('b', ['world', 'reading'], '4-6', ['together']),
  game('c', ['memory'], '6-9', ['solo']),
];

describe('skillsIn', () => {
  it('lists each used skill once, in the fixed order', () => {
    expect(skillsIn(GAMES)).toEqual(['world', 'memory', 'reading']);
  });
});

describe('parseAges', () => {
  it('reads a range', () => {
    expect(parseAges('3-9')).toEqual({ min: 3, max: 9 });
    expect(parseAges('10-12')).toEqual({ min: 10, max: 12 });
  });

  it('gives null for anything else', () => {
    expect(parseAges('')).toBeNull();
    expect(parseAges('4')).toBeNull();
    expect(parseAges('4 to 9')).toBeNull();
  });
});

describe('applyFilter', () => {
  const slugs = (filters: Partial<Filters>) => applyFilter(GAMES, { ...NO_FILTERS, ...filters }).map((g) => g.slug);

  it('shows every game with no filters', () => {
    expect(applyFilter(GAMES, NO_FILTERS)).toEqual(GAMES);
  });

  it('keeps only games with the chosen skill', () => {
    expect(slugs({ skill: 'reading' })).toEqual(['a', 'b']);
  });

  it('keeps only games with the chosen mode', () => {
    expect(slugs({ mode: 'solo' })).toEqual(['a', 'c']);
    expect(slugs({ mode: 'together' })).toEqual(['a', 'b']);
  });

  it('counts both ends of the age range', () => {
    expect(slugs({ age: 4 })).toEqual(['a', 'b']);
    expect(slugs({ age: 6 })).toEqual(['b', 'c']);
  });

  it('never matches an age on a game with an unreadable range', () => {
    const broken = game('x', ['memory'], 'soon');
    expect(applyFilter([broken], { ...NO_FILTERS, age: 4 })).toEqual([]);
  });

  it('combines all three filters with AND', () => {
    expect(slugs({ mode: 'together', skill: 'reading' })).toEqual(['a', 'b']);
    expect(slugs({ mode: 'together', age: 6 })).toEqual(['b']);
    expect(slugs({ mode: 'solo', age: 4, skill: 'reading' })).toEqual(['a']);
  });

  it('can come up empty', () => {
    expect(slugs({ mode: 'solo', age: 6, skill: 'reading' })).toEqual([]);
  });
});

describe('the registry', () => {
  it('gives every game a readable age range and at least one mode', () => {
    for (const entry of REGISTRY) {
      expect(parseAges(entry.ages), entry.slug).not.toBeNull();
      expect(entry.modes.length, entry.slug).toBeGreaterThan(0);
      expect(entry.modes.every((mode) => mode in MODE_LABELS), entry.slug).toBe(true);
    }
  });
});

describe('restoreFilter', () => {
  it('keeps a saved skill that is still available', () => {
    expect(restoreFilter('world', ['world', 'memory'])).toBe('world');
  });

  it('keeps a saved age', () => {
    expect(restoreFilter(6, [4, 6])).toBe(6);
  });

  it('falls back to all for anything else', () => {
    expect(restoreFilter('numbers', ['world'])).toBe('all');
    expect(restoreFilter(null, ['world'])).toBe('all');
  });
});
