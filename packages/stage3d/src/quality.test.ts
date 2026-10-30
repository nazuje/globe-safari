import { describe, expect, it } from 'vitest';
import { BEST_PIXEL_RATIO, fovForAspect, LOW_PIXEL_RATIO, nextPixelRatio, stepSeconds } from './quality.ts';

describe('stepSeconds', () => {
  it('turns a normal frame into seconds', () => {
    expect(stepSeconds(16)).toBeCloseTo(0.016);
  });

  it('caps the jump after a tab has slept', () => {
    expect(stepSeconds(60_000)).toBe(0.05);
  });

  it('never runs time backwards', () => {
    expect(stepSeconds(-5)).toBe(0);
  });
});

describe('nextPixelRatio', () => {
  it('keeps the sharpness on a fast device', () => {
    expect(nextPixelRatio(BEST_PIXEL_RATIO, 17)).toBe(BEST_PIXEL_RATIO);
  });

  it('gives up sharpness on a slow one', () => {
    expect(nextPixelRatio(BEST_PIXEL_RATIO, 45)).toBe(LOW_PIXEL_RATIO);
  });
});

describe('fovForAspect', () => {
  it('leaves a wide screen alone', () => {
    expect(fovForAspect(55, 1.6)).toBe(55);
  });

  it('opens up on a tall phone', () => {
    expect(fovForAspect(55, 0.5)).toBeGreaterThan(90);
    expect(fovForAspect(55, 0.5)).toBeLessThan(180);
  });

  it('joins up smoothly where the two meet', () => {
    expect(fovForAspect(55, 1.2)).toBeCloseTo(55);
    expect(fovForAspect(55, 1.1999)).toBeCloseTo(55, 1);
  });
});
