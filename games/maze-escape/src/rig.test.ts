import { describe, expect, it } from 'vitest';
import { fitDistance, framed, MOST_BELOW_MIDDLE, projected, reachOnScreen, wallShadow } from './rig.ts';
import { PLAYER_RADIUS, VIEW_RADIUS } from './tuning.ts';
import { fovForAspect } from '../../../packages/stage3d/src/quality.ts';

const SCREENS = [
  [390, 844],
  [768, 1024],
  [844, 390],
  [1280, 800],
  [360, 640],
] as const;
const FOV = 34;

describe('the follow camera', () => {
  it.each(SCREENS)('shows the whole view radius on %i x %i', (width, height) => {
    const aspect = width / height;
    const fov = fovForAspect(FOV, aspect);
    const distance = fitDistance(fov, aspect);
    for (const [x, z] of [[VIEW_RADIUS, 0], [-VIEW_RADIUS, 0], [0, VIEW_RADIUS], [0, -VIEW_RADIUS]] as const) {
      const spot = projected(x, z, distance, fov, aspect);
      expect(Math.abs(spot.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(spot.y)).toBeLessThanOrEqual(1);
    }
  });

  it.each(SCREENS)('keeps the view radius even while framing the maze on %i x %i', (width, height) => {
    const aspect = width / height;
    const fov = fovForAspect(FOV, aspect);
    const distance = fitDistance(fov, aspect);
    const reach = reachOnScreen(distance, fov, aspect);
    for (const player of [0.5, 3, 7, 12, 20, 30]) {
      const shiftX = player - framed(player, 31, reach.x);
      const shiftZ = player - framed(player, 21, reach.z, MOST_BELOW_MIDDLE);
      for (const [x, z] of [[VIEW_RADIUS, 0], [-VIEW_RADIUS, 0], [0, VIEW_RADIUS], [0, -VIEW_RADIUS]] as const) {
        const spot = projected(x + shiftX, z + shiftZ, distance, fov, aspect);
        expect(Math.abs(spot.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(spot.y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('centres a small maze on a big screen', () => {
    expect(framed(2, 11, { x: 20, z: 20 }.x)).toBeGreaterThan(2);
  });

  it('can never hide the player behind a wall', () => {
    expect(wallShadow()).toBeLessThan(PLAYER_RADIUS);
  });
});
