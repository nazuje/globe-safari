import { describe, expect, it } from 'vitest';
import { landingPoint, pickTarget, rayGap, rayMeetsBox, type Aimable, type Ray } from './aim.ts';
import { BACK_Z, boxesOf, CAMERA, cameraFor, LAYOUTS, SCENE_IDS, spotsOf } from './layout.ts';
import { arcPoint, flightSeconds } from './throwArc.ts';

const down: Ray = { origin: { x: 0, y: 5, z: 10 }, dir: { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 } };
const level: Ray = { origin: { x: 0, y: 5, z: 10 }, dir: { x: 0, y: 0, z: -1 } };

describe('landingPoint', () => {
  it('finds the exact spot on the ground', () => {
    const spot = landingPoint(down, [], BACK_Z);
    expect(spot.y).toBeCloseTo(0);
    expect(spot.z).toBeCloseTo(5);
  });

  it('stops at something standing in the way', () => {
    const box = { x0: -1, x1: 1, y0: 0, y1: 10, z0: 6, z1: 7 };
    expect(landingPoint(down, [box], BACK_Z).z).toBeCloseTo(7);
  });

  it('goes no further than the hills', () => {
    expect(landingPoint(level, [], BACK_Z).z).toBeCloseTo(BACK_Z);
  });
});

describe('rayMeetsBox', () => {
  it('misses a box off to the side', () => {
    expect(rayMeetsBox(level, { x0: 4, x1: 5, y0: 0, y1: 9, z0: -5, z1: 5 })).toBeNull();
  });
});

describe('pickTarget', () => {
  const near: Aimable = { id: 1, center: { x: 0, y: 5, z: 0 }, radius: 1, pull: 1 };
  const assist = { size: 0.5, angle: 0.1 };

  it('takes a direct hit', () => {
    expect(pickTarget(level, [near], { size: 0, angle: 0 })).toBe(1);
  });

  it('pulls a near-miss in, more with a bigger assist', () => {
    const off: Aimable = { ...near, center: { x: 2, y: 5, z: 0 } };
    expect(pickTarget(level, [off], { size: 0, angle: 0 })).toBeNull();
    expect(pickTarget(level, [off], assist)).toBe(1);
  });

  it('prefers the target the tap was closest to', () => {
    const other: Aimable = { id: 2, center: { x: 1.2, y: 5, z: 0 }, radius: 1, pull: 1 };
    const closer: Aimable = { id: 3, center: { x: 0.2, y: 5, z: 0 }, radius: 1, pull: 1 };
    expect(pickTarget(level, [other, closer], assist)).toBe(3);
  });

  it('never aims backwards', () => {
    const behind: Aimable = { ...near, center: { x: 0, y: 5, z: 20 } };
    expect(pickTarget(level, [behind], assist)).toBeNull();
  });

  it('measures the gap to the ray', () => {
    expect(rayGap(level, { x: 3, y: 5, z: 0 }).gap).toBeCloseTo(3);
  });
});

describe('the arc', () => {
  const from = { x: 0, y: 0, z: 0 };
  const to = { x: 4, y: 2, z: -8 };

  it('starts at the hand and ends exactly on the spot', () => {
    expect(arcPoint(from, to, 3, 0)).toEqual(from);
    expect(arcPoint(from, to, 3, 1)).toEqual(to);
  });

  it('rises above the straight line in the middle', () => {
    expect(arcPoint(from, to, 3, 0.5).y).toBeCloseTo(4);
  });

  it('takes longer to go further', () => {
    expect(flightSeconds(30)).toBeGreaterThan(flightSeconds(5));
  });
});

describe('cameraFor', () => {
  /** How far down the screen the horizon sits, from 0 at the top to 1 at the bottom. */
  function horizon(aspect: number): number {
    const { position, lookAt } = cameraFor(aspect);
    const pitch = Math.atan2(position.y - lookAt.y, position.z - lookAt.z);
    const halfHeight = (Math.tan((55 * Math.PI) / 360) * Math.max(1.2 / aspect, 1));
    return (1 - Math.tan(pitch) / halfHeight) / 2;
  }

  it('leaves wide screens with the plain first-person view', () => {
    expect(cameraFor(1.6)).toEqual({ position: CAMERA.position, lookAt: CAMERA.lookAt });
  });

  it.each([390 / 844, 360 / 640])('keeps the sky to the top part of a phone at aspect %f', (aspect) => {
    expect(horizon(aspect)).toBeLessThan(0.3);
  });
});

describe('every scene', () => {
  it.each(SCENE_IDS)('%s has places for every kind of snowman', (scene) => {
    const spots = spotsOf(LAYOUTS[scene]);
    for (const motion of ['rise', 'slide', 'waddle', 'sled', 'window']) {
      expect(spots.some((spot) => spot.motion === motion)).toBe(true);
    }
    for (const band of ['near', 'mid', 'far']) {
      expect(spots.some((spot) => spot.band === band)).toBe(true);
    }
    expect(new Set(spots.map((spot) => spot.id)).size).toBe(spots.length);
  });

  it.each(SCENE_IDS)('%s keeps nearby snowmen clear of anything solid', (scene) => {
    const boxes = boxesOf(LAYOUTS[scene]);
    for (const spot of spotsOf(LAYOUTS[scene])) {
      if (spot.motion !== 'rise') continue;
      const inside = boxes.some((box) => spot.x > box.x0 && spot.x < box.x1 && spot.z > box.z0 && spot.z < box.z1);
      expect(inside).toBe(false);
    }
  });
});
