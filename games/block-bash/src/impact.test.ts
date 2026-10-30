import { describe, expect, it } from 'vitest';
import { clackFor } from './impact.ts';

describe('how a hit sounds', () => {
  it('gets louder with force', () => {
    expect(clackFor(12, 1).gain).toBeGreaterThan(clackFor(3, 1).gain);
  });

  it('gets higher with force', () => {
    expect(clackFor(12, 1).hz).toBeGreaterThan(clackFor(3, 1).hz);
  });

  it('gets deeper as blocks get bigger', () => {
    expect(clackFor(6, 4).hz).toBeLessThan(clackFor(6, 0.5).hz);
  });

  it('stays within safe limits', () => {
    expect(clackFor(9999, 1).gain).toBeLessThanOrEqual(1);
    expect(clackFor(0, 1).gain).toBeGreaterThan(0);
  });
});
