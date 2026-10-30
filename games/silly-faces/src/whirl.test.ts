import { expect, it } from 'vitest';
import { FIRST_LOOK, PARTS } from './parts.ts';
import { whirlFrames } from './whirl.ts';

it('ends on the final look', () => {
  expect(whirlFrames(FIRST_LOOK).at(-1)).toEqual(FIRST_LOOK);
});

it('stops one part at a time and never restarts a stopped part', () => {
  const frames = whirlFrames(FIRST_LOOK);
  for (const part of PARTS) {
    const lastDifferent = frames.findLastIndex((frame) => frame[part] !== FIRST_LOOK[part]);
    for (const frame of frames.slice(lastDifferent + 1)) expect(frame[part]).toBe(FIRST_LOOK[part]);
  }
  expect(frames.length).toBeGreaterThan(PARTS.length);
});
