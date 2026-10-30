import { describe, expect, it } from 'vitest';
import { cleanLook, COLORS, FIRST_LOOK, randomLook, RARE_COLORS, sameLook } from './parts.ts';

describe('a random look', () => {
  it('only uses real options and never a rare color', () => {
    for (let i = 0; i < 300; i++) {
      const look = randomLook();
      expect(COLORS).toContain(look.color);
      expect(cleanLook(look, { ...FIRST_LOOK, hat: 'pirate', hair: 'horns' })).toEqual(look);
    }
  });
});

describe('reading a saved look', () => {
  it('keeps a rare color', () => {
    for (const color of RARE_COLORS) expect(cleanLook({ ...FIRST_LOOK, color }).color).toBe(color);
  });

  it('repairs anything broken, part by part', () => {
    expect(cleanLook({ ...FIRST_LOOK, hat: 'sombrero', eyes: 7 })).toEqual(FIRST_LOOK);
    expect(cleanLook(null)).toEqual(FIRST_LOOK);
    expect(cleanLook('hello')).toEqual(FIRST_LOOK);
  });
});

it('compares looks part by part', () => {
  expect(sameLook(FIRST_LOOK, { ...FIRST_LOOK })).toBe(true);
  expect(sameLook(FIRST_LOOK, { ...FIRST_LOOK, held: 'none' })).toBe(false);
});
