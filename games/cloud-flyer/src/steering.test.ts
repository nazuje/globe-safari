import { describe, expect, it } from 'vitest';
import { MAX_U, MAX_V } from './course.ts';
import { NO_KEYS, screenFromSteer, steerFromKeys, steerFromScreen } from './steering.ts';

const span = { u: 12, v: 9, restY: 0.2 };

describe('steerFromScreen', () => {
  it('keeps the flyer where it is for a finger on its resting spot', () => {
    expect(steerFromScreen(0, 0.2, span)).toEqual({ u: 0, v: 0 });
  });

  it('goes towards the finger', () => {
    const { u, v } = steerFromScreen(0.5, -0.5, span);
    expect(u).toBeGreaterThan(0);
    expect(v).toBeGreaterThan(0);
    expect(steerFromScreen(-0.5, 0.9, span).u).toBeLessThan(0);
    expect(steerFromScreen(-0.5, 0.9, span).v).toBeLessThan(0);
  });

  it('stays within the sky road', () => {
    const { u, v } = steerFromScreen(1, -1, { u: 100, v: 100, restY: 0 });
    expect(u).toBe(MAX_U);
    expect(v).toBe(MAX_V);
  });
});

describe('screenFromSteer', () => {
  it('finds the spot on screen that steers to a place', () => {
    const spot = screenFromSteer(5, -3, span);
    const back = steerFromScreen(spot.x, spot.y, span);
    expect(back.u).toBeCloseTo(5);
    expect(back.v).toBeCloseTo(-3);
  });
});

describe('steerFromKeys', () => {
  it('lets go when no key is held', () => {
    expect(steerFromKeys(NO_KEYS)).toBeNull();
    expect(steerFromKeys({ ...NO_KEYS, left: true, right: true })).toBeNull();
  });

  it('moves the way the arrow points', () => {
    expect(steerFromKeys({ ...NO_KEYS, right: true })?.u).toBeGreaterThan(0);
    expect(steerFromKeys({ ...NO_KEYS, down: true })?.v).toBeLessThan(0);
  });
});
