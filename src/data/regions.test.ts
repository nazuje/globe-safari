import { describe, expect, it } from 'vitest';
import { REGIONS } from './regions.ts';
import type { OceanId } from './types.ts';

const OCEANS: OceanId[] = ['pacific', 'atlantic', 'indian', 'southern', 'arctic'];

describe('region data', () => {
  it('has about 25 to 35 regions with unique ids', () => {
    expect(REGIONS.length).toBeGreaterThanOrEqual(25);
    expect(REGIONS.length).toBeLessThanOrEqual(35);
    const ids = REGIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly one region for each ocean', () => {
    for (const ocean of OCEANS) {
      expect(REGIONS.filter((r) => r.ocean === ocean), ocean).toHaveLength(1);
    }
  });

  it('gives every non-ocean region at least one shape', () => {
    for (const region of REGIONS.filter((r) => !r.ocean)) {
      expect(region.shapes.length, region.id).toBeGreaterThan(0);
    }
  });

  it.each(REGIONS.map((r) => [r.id, r] as const))('%s is complete', (_id, region) => {
    expect(region.name.trim()).not.toBe('');
    expect(region.emoji.trim()).not.toBe('');
    expect(region.description.trim()).not.toBe('');
    expect(region.animals.length).toBeGreaterThanOrEqual(6);
    expect(region.animals.length).toBeLessThanOrEqual(8);

    const animalIds = region.animals.map((a) => a.id);
    expect(new Set(animalIds).size).toBe(animalIds.length);

    for (const animal of region.animals) {
      expect(animal.clues, animal.id).toHaveLength(3);
      for (const text of [animal.name, animal.emoji, animal.funFact, ...animal.clues]) {
        expect(text.trim(), animal.id).not.toBe('');
      }
      expect(animal.wikiTitle, animal.id).toMatch(/^\S+$/);
    }
  });

  it('uses the same Wikipedia title whenever an animal id repeats across regions', () => {
    const titles = new Map<string, string>();
    for (const animal of REGIONS.flatMap((r) => r.animals)) {
      const seen = titles.get(animal.id);
      if (seen) expect(animal.wikiTitle, animal.id).toBe(seen);
      titles.set(animal.id, animal.wikiTitle);
    }
  });
});
