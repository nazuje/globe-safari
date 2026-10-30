import { describe, expect, it } from 'vitest';
import { buttonsReady, buttonsWait, QUIET_MS, screenSettled, STARS_LEAST_MS } from './gate.ts';

describe('a new screen', () => {
  it('ignores the second half of a double tap, up to half a second later', () => {
    expect(screenSettled(1000, 1000 + 450)).toBe(false);
    expect(screenSettled(1000, 1000 + 500)).toBe(true);
  });
});

describe('the end screen buttons', () => {
  it('always leave the stars up long enough to enjoy', () => {
    expect(buttonsReady(0, -9999, STARS_LEAST_MS - 1)).toBe(false);
    expect(buttonsReady(0, -9999, STARS_LEAST_MS)).toBe(true);
  });

  it('stay asleep for as long as the child keeps tapping', () => {
    for (let now = STARS_LEAST_MS; now < 20000; now += 300) expect(buttonsReady(0, now - 200, now)).toBe(false);
  });

  it('wake after a quiet moment', () => {
    const lastTap = 5000;
    expect(buttonsReady(0, lastTap, lastTap + QUIET_MS - 1)).toBe(false);
    expect(buttonsReady(0, lastTap, lastTap + QUIET_MS)).toBe(true);
    expect(buttonsWait(0, lastTap, lastTap + 100)).toBe(QUIET_MS - 100);
  });
});
