import { describe, expect, it } from 'vitest';
import { applyFilter, restoreFilter, skillsIn } from './filter.ts';
import type { Game, Skill } from './games.ts';

function game(slug: string, skills: Skill[]): Game {
  return { slug, title: slug, emoji: '🎲', tagline: '', skills, ages: '4-9', color: '#000000', status: 'ready' };
}

const GAMES = [game('a', ['reading']), game('b', ['world', 'reading']), game('c', ['memory'])];

describe('skillsIn', () => {
  it('lists each used skill once, in the fixed order', () => {
    expect(skillsIn(GAMES)).toEqual(['world', 'memory', 'reading']);
  });
});

describe('applyFilter', () => {
  it('shows every game for all', () => {
    expect(applyFilter(GAMES, 'all')).toEqual(GAMES);
  });

  it('keeps only games with the chosen skill', () => {
    expect(applyFilter(GAMES, 'reading').map((g) => g.slug)).toEqual(['a', 'b']);
  });
});

describe('restoreFilter', () => {
  it('keeps a saved skill that is still available', () => {
    expect(restoreFilter('world', ['world', 'memory'])).toBe('world');
  });

  it('falls back to all for anything else', () => {
    expect(restoreFilter('numbers', ['world'])).toBe('all');
    expect(restoreFilter(null, ['world'])).toBe('all');
  });
});
