import { describe, expect, it } from 'vitest';
import { SCENES, sceneForRace, thingAt } from './scenery.ts';

describe('scenery', () => {
  it('changes between races and comes back round', () => {
    const order = [0, 1, 2, 3, 4, 5].map((race) => sceneForRace(race).id);
    expect(order).toEqual(['city', 'farm', 'beach', 'space', 'candy', 'city']);
  });

  it('copes with a broken saved count', () => {
    expect(sceneForRace(-1).id).toBe('city');
    expect(sceneForRace(Number.NaN).id).toBe('city');
  });

  it('can throw any obstacle at you anywhere', () => {
    for (const scene of SCENES) {
      expect(new Set(scene.obstacles)).toEqual(new Set(['cow', 'puddle', 'hay', 'duck', 'cone']));
    }
  });

  it('always puts the same thing in the same spot, so nothing flickers while scrolling', () => {
    const { thingsLeft } = SCENES[0]!;
    for (let row = -5; row < 50; row++) expect(thingAt(thingsLeft, row, 1)).toBe(thingAt(thingsLeft, row, 1));
  });

  it('mixes things and gaps along the road', () => {
    const { thingsLeft } = SCENES[1]!;
    const row = Array.from({ length: 300 }, (_, i) => thingAt(thingsLeft, i, 0));
    const gaps = row.filter((thing) => thing === null).length;
    expect(gaps).toBeGreaterThan(30);
    expect(gaps).toBeLessThan(150);
    expect(new Set(row).size).toBe(thingsLeft.length + 1 - (new Set(thingsLeft).size === thingsLeft.length ? 0 : 1));
  });
});
