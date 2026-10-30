import { describe, expect, it } from 'vitest';
import { MAX_TINY, TINY_FRIENDS } from './band.ts';
import { cleanFans, Director, MAX_AUDIENCE, type Surprise } from './director.ts';

const lowest = (): number => 0;

function fresh(random = lowest): Director {
  return new Director(random, cleanFans(null));
}

/** A number of bars with a child tapping in each, gathering what came of them. */
function play(director: Director, bars: number, busy = false): Surprise[] {
  const found: Surprise[] = [];
  for (let bar = 0; bar < bars; bar++) {
    director.tap();
    const surprise = director.bar(busy);
    if (surprise) found.push(surprise);
  }
  return found;
}

describe('surprises', () => {
  it('need a while of play first, and the first is the egg', () => {
    const director = fresh();
    expect(play(director, 13)).toEqual([]);
    expect(play(director, 1)).toEqual(['egg']);
  });

  it('do not happen to a band nobody is playing', () => {
    const director = fresh();
    for (let bar = 0; bar < 500; bar++) expect(director.bar(false)).toBeNull();
  });

  it('wait for the band to be free', () => {
    const director = fresh();
    expect(play(director, 40, true)).toEqual([]);
    expect(play(director, 1)).toEqual(['egg']);
  });

  it('stay rare and never repeat twice in a row', () => {
    const random = Math.random;
    const director = fresh(random);
    const found = play(director, 2000);
    expect(found.length).toBeLessThan(2000 / 14);
    expect(found.length).toBeGreaterThan(2000 / 40);
    for (let i = 1; i < found.length; i++) expect(found[i]).not.toBe(found[i - 1]);
  });

  it('stop laying eggs once the little band is full', () => {
    const fans = cleanFans({ tiny: TINY_FRIENDS.slice(0, MAX_TINY) });
    const found = play(new Director(Math.random, fans), 1000);
    expect(found).not.toContain('egg');
    expect(found.length).toBeGreaterThan(5);
  });
});

describe('hatching', () => {
  it('brings a different friend each time, up to the limit', () => {
    const director = fresh(Math.random);
    const friends = Array.from({ length: MAX_TINY }, () => director.hatch());
    expect(new Set(friends).size).toBe(MAX_TINY);
    expect(director.hatch()).toBeNull();
  });
});

describe('the audience', () => {
  it('grows as a child plays and stops at the limit', () => {
    const director = fresh();
    const start = director.fans.audience;
    for (let tap = 0; tap < 28; tap++) director.tap();
    expect(director.fans.audience).toBe(start + 2);
    for (let tap = 0; tap < 5000; tap++) director.tap();
    expect(director.fans.audience).toBe(MAX_AUDIENCE);
  });
});

describe('saved fans', () => {
  it('fall back to a small crowd', () => {
    expect(cleanFans(null)).toEqual({ audience: 3, tiny: [] });
  });

  it('survive odd data', () => {
    expect(cleanFans({ audience: 9000, tiny: ['🐞', '🐞', 'x'] })).toEqual({ audience: MAX_AUDIENCE, tiny: ['🐞'] });
    expect(cleanFans({ audience: Number.NaN })).toEqual({ audience: 3, tiny: [] });
  });
});
