import { describe, expect, it } from 'vitest';
import { readProgress, withLevel, withStar } from './progress.ts';

const FRESH = { stars: { guess: 0, make: 0 }, level: { guess: 0, make: 0 } };

describe('progress', () => {
  it('starts from nothing', () => {
    expect(readProgress(null)).toEqual(FRESH);
    expect(readProgress('junk')).toEqual(FRESH);
  });

  it('keeps good saved values and drops bad ones', () => {
    const saved = { stars: { guess: 4, make: -2 }, level: { guess: 2, make: 9 } };
    expect(readProgress(saved)).toEqual({ stars: { guess: 4, make: 0 }, level: { guess: 2, make: 0 } });
  });

  it('counts stars per mode', () => {
    const progress = withStar(withStar(FRESH as ReturnType<typeof readProgress>, 'guess'), 'guess');
    expect(progress.stars).toEqual({ guess: 2, make: 0 });
  });

  it('remembers a level per mode', () => {
    expect(withLevel(readProgress(null), 'make', 2).level).toEqual({ guess: 0, make: 2 });
  });
});
