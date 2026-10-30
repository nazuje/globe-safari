import { describe, expect, it } from 'vitest';
import { addParts, COLORS, mix, PAINTS, recipeText, sameColor, totalParts } from './mix.ts';
import type { ColorId, Parts } from './mix.ts';

describe('mix: what real paint does', () => {
  const truth: [Parts, ColorId][] = [
    [{ red: 1, yellow: 1 }, 'orange'],
    [{ yellow: 1, blue: 1 }, 'green'],
    [{ red: 1, blue: 1 }, 'purple'],
    [{ red: 1, white: 1 }, 'pink'],
    [{ blue: 1, white: 1 }, 'lightBlue'],
    [{ black: 1, white: 1 }, 'grey'],
    [{ red: 1, yellow: 1, blue: 1 }, 'brown'],
    [{ red: 1, black: 1 }, 'maroon'],
    [{ blue: 1, black: 1 }, 'navy'],
    [{ yellow: 1, black: 1 }, 'olive'],
    [{ yellow: 1, blue: 1, white: 1 }, 'mint'],
    [{ red: 1, blue: 1, white: 1 }, 'lilac'],
    [{ red: 1, yellow: 1, white: 1 }, 'peach'],
    [{ red: 1, yellow: 1, black: 1 }, 'brown'],
    [{ red: 1, yellow: 1, blue: 1, white: 1 }, 'tan'],
    [{ red: 1, yellow: 1, blue: 1, black: 1 }, 'darkBrown'],
    [{ red: 1, white: 1, black: 1 }, 'dustyRose'],
  ];

  it.each(truth)('%j makes %s', (parts, expected) => {
    expect(mix(parts)).toBe(expected);
  });

  it('red and green make brown', () => {
    expect(mix(addParts({ red: 1 }, { yellow: 1, blue: 1 }))).toBe('brown');
  });

  it('a single paint stays itself, whatever the amount', () => {
    for (const paint of PAINTS) expect(mix({ [paint]: 4 })).toBe(paint);
  });

  it('an empty beaker has no color', () => {
    expect(mix({})).toBeNull();
    expect(mix({ red: 0 })).toBeNull();
  });
});

describe('mix: ratio rules', () => {
  it('leans toward a paint with at least 3 times the parts', () => {
    expect(mix({ red: 3, yellow: 1 })).toBe('redOrange');
    expect(mix({ red: 1, yellow: 3 })).toBe('golden');
    expect(mix({ yellow: 3, blue: 1 })).toBe('lime');
    expect(mix({ yellow: 1, blue: 3 })).toBe('teal');
    expect(mix({ red: 3, blue: 1 })).toBe('magenta');
    expect(mix({ red: 1, blue: 3 })).toBe('indigo');
    expect(mix({ white: 3, black: 1 })).toBe('lightGrey');
    expect(mix({ white: 1, black: 3 })).toBe('darkGrey');
  });

  it('does not lean below that, and ratios matter rather than totals', () => {
    expect(mix({ red: 2, yellow: 1 })).toBe('orange');
    expect(mix({ red: 5, yellow: 5 })).toBe('orange');
  });

  it('a drop of white does not show', () => {
    expect(mix({ red: 3, white: 1 })).toBe('red');
    expect(mix({ red: 2, white: 1 })).toBe('pink');
  });

  it('white is measured against the strongest color, so three-paint mixes still lighten', () => {
    expect(mix({ red: 1, yellow: 1, blue: 1, white: 1 })).toBe('tan');
  });

  it('any black darkens, because black is strong', () => {
    expect(mix({ red: 9, black: 1 })).toBe('maroon');
  });

  it('leaning stops once white or black shows', () => {
    expect(mix({ red: 3, yellow: 1, white: 2 })).toBe('peach');
  });
});

describe('mix: every possible beaker', () => {
  function everyBeaker(): Parts[] {
    const amounts = [0, 1, 2, 3, 6];
    let beakers: Parts[] = [{}];
    for (const paint of PAINTS) {
      beakers = beakers.flatMap((parts) =>
        amounts.map((amount): Parts => (amount ? { ...parts, [paint]: amount } : parts)),
      );
    }
    return beakers;
  }

  it('always has a name and a color unless empty', () => {
    const beakers = everyBeaker();
    expect(beakers).toHaveLength(5 ** PAINTS.length);
    for (const parts of beakers) {
      const color = mix(parts);
      if (totalParts(parts) === 0) {
        expect(color).toBeNull();
      } else {
        expect(color).not.toBeNull();
        if (color) {
          expect(COLORS[color].name).not.toBe('');
          expect(COLORS[color].hex).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });
});

describe('COLORS', () => {
  it('gives every color its own name and swatch', () => {
    const all = Object.values(COLORS);
    expect(new Set(all.map((color) => color.name)).size).toBe(all.length);
    expect(new Set(all.map((color) => color.hex)).size).toBe(all.length);
  });
});

describe('helpers', () => {
  it('adds parts and drops the zeros', () => {
    expect(addParts({ red: 1 }, { red: 2, blue: 1 })).toEqual({ red: 3, blue: 1 });
    expect(addParts({ red: 0 }, {})).toEqual({});
  });

  it('sameColor forgives leaning but not a change of tone', () => {
    expect(sameColor('redOrange', 'orange')).toBe(true);
    expect(sameColor('pink', 'red')).toBe(false);
    expect(sameColor('lime', 'orange')).toBe(false);
  });

  it('writes a recipe for grown-ups', () => {
    expect(recipeText({ white: 1, red: 2 })).toBe('2 red + 1 white');
  });
});
