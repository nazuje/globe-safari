/** How much of the view sits above the hero. Climbing needs to see what's next. */
const HEADROOM = 0.62;
const FOLLOW_PER_SECOND = 7;

export function cameraTarget(heroY: number, viewHeight: number, worldHeight: number): number {
  const wanted = heroY - viewHeight * HEADROOM;
  return Math.max(0, Math.min(Math.max(0, worldHeight - viewHeight), wanted));
}

/** Eases towards the target, by the same curve at any frame rate. */
export function cameraStep(top: number, target: number, seconds: number): number {
  return target + (top - target) * Math.exp(-FOLLOW_PER_SECOND * seconds);
}
