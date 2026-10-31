import { describe, expect, it } from 'vitest';
import { NO_KEYS, STILL_PX, steerFromFinger, steerFromKeys } from './steering.ts';

describe('touch', () => {
  it('runs from the character towards the finger', () => {
    expect(steerFromFinger({ x: 5, y: 2 }, { x: 2, y: 2 }, 200)).toEqual({ x: 1, y: 0 });
    expect(steerFromFinger({ x: 2, y: 1 }, { x: 2, y: 2 }, 200)).toEqual({ x: 0, y: -1 });
  });

  it('stands still with a finger right on the character', () => {
    expect(steerFromFinger({ x: 2.1, y: 2 }, { x: 2, y: 2 }, STILL_PX - 1)).toBeNull();
  });
});

describe('keys', () => {
  it('stops with nothing held', () => {
    expect(steerFromKeys(NO_KEYS)).toBeNull();
  });

  it('runs at the same speed on a diagonal', () => {
    const steer = steerFromKeys({ ...NO_KEYS, up: true, right: true });
    expect(Math.hypot(steer?.x ?? 0, steer?.y ?? 0)).toBeCloseTo(1);
  });

  it('cancels out opposite keys', () => {
    expect(steerFromKeys({ ...NO_KEYS, left: true, right: true })).toBeNull();
  });
});
