export const FIXED_STEP_S = 1 / 60;
/**
 * The most physics steps one frame may run. A tablet that can't keep up then
 * shows slower action instead of spending ever longer catching up.
 */
export const MOST_STEPS_PER_FRAME = 2;
const SNAP_S = 0.002;

export interface Stepper {
  /** How many fixed steps to run for a frame that took this long. */
  stepsFor(seconds: number): number;
  reset(): void;
}

export function createStepper(): Stepper {
  let banked = 0;
  return {
    stepsFor(seconds) {
      // A frame that is almost exactly one step counts as one, or a 60 Hz screen stutters.
      const frame = Math.abs(seconds - FIXED_STEP_S) < SNAP_S ? FIXED_STEP_S : Math.max(seconds, 0);
      banked += frame;
      const steps = Math.floor(banked / FIXED_STEP_S + 1e-9);
      if (steps >= MOST_STEPS_PER_FRAME) {
        banked = 0;
        return MOST_STEPS_PER_FRAME;
      }
      banked -= steps * FIXED_STEP_S;
      return steps;
    },
    reset() {
      banked = 0;
    },
  };
}
