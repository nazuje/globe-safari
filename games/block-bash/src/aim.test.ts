import { describe, expect, it } from 'vitest';
import { add, launchVelocity, nearestToRay, pointOnFacingSheet } from './aim.ts';

describe('aiming', () => {
  const origin = { x: 0, y: 2, z: 20 };
  const forward = { x: 0, y: 0, z: -1 };

  it('picks the block closest to a tap that missed', () => {
    const near = { x: 1, y: 2, z: 0 };
    const far = { x: 6, y: 2, z: 0 };
    expect(nearestToRay(origin, forward, [far, near])).toEqual(near);
  });

  it('has nothing to pick when no block is left', () => {
    expect(nearestToRay(origin, forward, [])).toBeNull();
  });

  it('lands a missed tap on a sheet through the structure', () => {
    const hit = pointOnFacingSheet(origin, forward, { x: 0, y: 0, z: 0 });
    expect(hit.z).toBeCloseTo(0);
    expect(hit.y).toBeCloseTo(2);
  });

  it('never aims under the table', () => {
    expect(pointOnFacingSheet({ x: 0, y: 1, z: 20 }, { x: 0, y: -0.6, z: -0.8 }, { x: 0, y: 0, z: 0 }).y).toBeGreaterThan(0);
  });

  it('launches a ball that arrives where it was aimed', () => {
    const from = { x: 1, y: 8, z: 18 };
    const to = { x: -1, y: 3, z: 0 };
    const seconds = 0.8;
    const gravity = 19;
    const v = launchVelocity(from, to, seconds, gravity);
    const landed = add(from, v, seconds);
    expect(landed.x).toBeCloseTo(to.x);
    expect(landed.z).toBeCloseTo(to.z);
    expect(landed.y - (gravity * seconds ** 2) / 2).toBeCloseTo(to.y);
  });
});
