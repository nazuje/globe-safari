import { describe, expect, it } from 'vitest';
import { PICTURES, readFills } from './pictures.ts';

describe('pictures', () => {
  it('each has 6 to 8 regions with their own ids', () => {
    for (const picture of PICTURES) {
      expect(picture.regions.length).toBeGreaterThanOrEqual(6);
      expect(picture.regions.length).toBeLessThanOrEqual(8);
      expect(new Set(picture.regions.map((region) => region.id)).size).toBe(picture.regions.length);
    }
  });
});

describe('readFills', () => {
  it('keeps real paint on real regions', () => {
    expect(readFills({ house: { roof: '#e2232e' } })).toEqual({ house: { roof: '#e2232e' } });
  });

  it('drops anything damaged or unknown', () => {
    expect(readFills(null)).toEqual({});
    expect(readFills({ castle: { roof: '#e2232e' } })).toEqual({});
    expect(readFills({ house: { roof: 'url(evil)', moat: '#e2232e' } })).toEqual({ house: {} });
  });
});
