import { describe, expect, it } from 'vitest';
import { createStepper, FIXED_STEP_S, MOST_STEPS_PER_FRAME } from './stepper.ts';

describe('the physics clock', () => {
  it('runs one step on each frame of a 60 Hz screen, even with a jittery clock', () => {
    const stepper = createStepper();
    for (const ms of [16.1, 17.4, 16.6, 15.9, 17.2]) expect(stepper.stepsFor(ms / 1000)).toBe(1);
  });

  it('runs half as often on a 120 Hz screen', () => {
    const stepper = createStepper();
    let steps = 0;
    for (let i = 0; i < 120; i += 1) steps += stepper.stepsFor(1 / 120);
    expect(steps).toBeGreaterThanOrEqual(59);
    expect(steps).toBeLessThanOrEqual(60);
  });

  it('caps a slow frame, so a slow tablet slows the action instead of exploding it', () => {
    const stepper = createStepper();
    expect(stepper.stepsFor(0.05)).toBe(MOST_STEPS_PER_FRAME);
    expect(stepper.stepsFor(FIXED_STEP_S)).toBe(1);
  });

  it('drops the time it could not run', () => {
    const stepper = createStepper();
    stepper.stepsFor(5);
    expect(stepper.stepsFor(0)).toBe(0);
  });

  it('forgets banked time on reset', () => {
    const stepper = createStepper();
    stepper.stepsFor(FIXED_STEP_S * 0.2);
    stepper.reset();
    expect(stepper.stepsFor(FIXED_STEP_S * 0.2)).toBe(0);
  });
});
