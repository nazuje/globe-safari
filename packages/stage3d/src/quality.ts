const LONGEST_STEP_S = 0.05;
const SLOW_FRAME_MS = 30;

export const BEST_PIXEL_RATIO = 1.75;
export const LOW_PIXEL_RATIO = 1;

/** A sleeping tab comes back with a huge time step, which would throw everything across the world. */
export const stepSeconds = (ms: number): number => Math.min(Math.max(ms, 0) / 1000, LONGEST_STEP_S);

/** Sharpness only costs frames, so a slow tablet gives some up rather than stutter. */
export const nextPixelRatio = (current: number, averageFrameMs: number): number =>
  averageFrameMs > SLOW_FRAME_MS ? LOW_PIXEL_RATIO : current;

/** Keeps the sideways view the same on a tall phone, where a fixed lens would crop the scene's sides. */
export function fovForAspect(fov: number, aspect: number, widestAt = 1.2): number {
  if (aspect >= widestAt) return fov;
  const half = (fov * Math.PI) / 360;
  return (Math.atan((Math.tan(half) * widestAt) / aspect) * 360) / Math.PI;
}
