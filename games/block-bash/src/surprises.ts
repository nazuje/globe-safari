/** Share of the blocks that must be flying at once. */
const SLOW_MOTION_SHARE = 0.4;
const SLOW_MOTION_BLOCKS = 10;
/** Throws between slow-motion moments, so it stays a treat. */
const THROWS_BETWEEN_SLOW_MOTION = 6;
export const SLOW_MOTION_SCALE = 0.3;
export const SLOW_MOTION_S = 1.3;

const MOUSE_CHANCE = 0.14;
const TURNS_BETWEEN_MICE = 4;

export function startsSlowMotion(flying: number, total: number, throwsSinceLast: number): boolean {
  return (
    flying >= SLOW_MOTION_BLOCKS && flying >= total * SLOW_MOTION_SHARE && throwsSinceLast >= THROWS_BETWEEN_SLOW_MOTION
  );
}

export function mouseVisits(chance: number, turnsSinceLast: number): boolean {
  return turnsSinceLast >= TURNS_BETWEEN_MICE && chance < MOUSE_CHANCE;
}

/** Eases time back to full speed at the end, so the moment doesn't snap off. */
export function timeScale(secondsIn: number): number {
  if (secondsIn >= SLOW_MOTION_S) return 1;
  const ramp = SLOW_MOTION_S * 0.7;
  if (secondsIn <= ramp) return SLOW_MOTION_SCALE;
  return SLOW_MOTION_SCALE + ((secondsIn - ramp) / (SLOW_MOTION_S - ramp)) * (1 - SLOW_MOTION_SCALE);
}
