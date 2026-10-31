import { expect, it } from 'vitest';
import { cameraStep, cameraTarget } from './camera.ts';

it('keeps more of the tower above the hero than below, inside the tower', () => {
  expect(cameraTarget(1000, 400, 2000)).toBeCloseTo(752);
  expect(cameraTarget(10, 400, 2000)).toBe(0);
  expect(cameraTarget(1990, 400, 2000)).toBe(1600);
});

it('eases the same at any frame rate', () => {
  let slow = 0;
  let fast = 0;
  slow = cameraStep(slow, 100, 0.1);
  for (let frame = 0; frame < 10; frame += 1) fast = cameraStep(fast, 100, 0.01);
  expect(fast).toBeCloseTo(slow, 6);
});
