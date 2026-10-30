const QUIETEST = 0.05;
const LOUDEST = 0.95;
const HARDEST_HIT = 16;

export interface Clack {
  hz: number;
  gain: number;
  seconds: number;
}

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

/** A hit sounds like its size and force: small blocks ring higher, and harder hits are louder and a little brighter. */
export function clackFor(speed: number, size: number): Clack {
  const force = clamp(speed / HARDEST_HIT, 0, 1);
  const body = 760 / Math.cbrt(clamp(size, 0.05, 8));
  return {
    hz: body * (0.85 + force * 0.55),
    gain: clamp(force ** 1.2, QUIETEST, LOUDEST),
    seconds: 0.05 + force * 0.05,
  };
}
