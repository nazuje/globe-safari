import { describe, expect, it } from 'vitest';
import { createFrameWatch, createVoicePace, partyGoal, popNote } from './party.ts';

it('spaces parties out a little, up to a limit', () => {
  expect(partyGoal(0)).toBe(10);
  expect(partyGoal(1)).toBeGreaterThan(partyGoal(0));
  expect(partyGoal(100)).toBe(18);
});

it('climbs the scale, and stays in hearing range however long the run', () => {
  expect(popNote(1)).toBeGreaterThan(popNote(0));
  expect(popNote(1000)).toBeLessThan(4000);
});

it('holds a cheer back while a name is being said', () => {
  const pace = createVoicePace();
  expect(pace.mayCheer(0)).toBe(true);
  pace.nameSpoken(1000);
  expect(pace.mayCheer(1500)).toBe(false);
  expect(pace.mayCheer(3000)).toBe(true);
});

describe('createFrameWatch', () => {
  it('forgives the odd slow frame', () => {
    const watch = createFrameWatch();
    for (let i = 0; i < 1000; i++) expect(watch(i % 3 === 0 ? 50 : 16)).toBe(false);
  });

  it('speaks up once on a device that keeps falling behind', () => {
    const watch = createFrameWatch();
    const results = Array.from({ length: 300 }, () => watch(50));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
