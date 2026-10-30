import { describe, expect, it } from 'vitest';
import { mouseVisits, SLOW_MOTION_S, SLOW_MOTION_SCALE, startsSlowMotion, timeScale } from './surprises.ts';
import { swayAngle, frameStructure } from './view.ts';

describe('rare surprises', () => {
  it('saves slow motion for a really big crash', () => {
    expect(startsSlowMotion(20, 30, 10)).toBe(true);
    expect(startsSlowMotion(4, 30, 10)).toBe(false);
    expect(startsSlowMotion(9, 12, 10)).toBe(false);
  });

  it('does not repeat slow motion straight away', () => {
    expect(startsSlowMotion(20, 30, 2)).toBe(false);
  });

  it('eases time back to normal', () => {
    expect(timeScale(0)).toBe(SLOW_MOTION_SCALE);
    expect(timeScale(SLOW_MOTION_S * 0.85)).toBeGreaterThan(SLOW_MOTION_SCALE);
    expect(timeScale(SLOW_MOTION_S)).toBe(1);
  });

  it('keeps the mouse rare', () => {
    expect(mouseVisits(0.01, 0)).toBe(false);
    expect(mouseVisits(0.01, 9)).toBe(true);
    expect(mouseVisits(0.9, 9)).toBe(false);
  });
});

describe('the camera', () => {
  it('sways gently and never swings round the back', () => {
    for (let t = 0; t < 120; t += 0.5) expect(Math.abs(swayAngle(t))).toBeLessThan(0.7);
  });

  it('steps back for a taller structure and a narrower screen', () => {
    expect(frameStructure(12, 5, 1.5, 42).distance).toBeGreaterThan(frameStructure(4, 5, 1.5, 42).distance);
    expect(frameStructure(4, 5, 0.6, 42).distance).toBeGreaterThan(frameStructure(4, 5, 1.5, 42).distance);
  });
});
