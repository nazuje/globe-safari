import { describe, expect, it } from 'vitest';
import { bestGrid } from './layout.ts';

describe('bestGrid', () => {
  it('fits 24 big cards on a small phone', () => {
    const { cols, rows, size } = bestGrid(24, 328, 480, 8, 180);
    expect([cols, rows]).toEqual([4, 6]);
    expect(size).toBeGreaterThanOrEqual(64);
    expect(rows * size + (rows - 1) * 8).toBeLessThanOrEqual(480);
    expect(cols * size + (cols - 1) * 8).toBeLessThanOrEqual(328);
  });

  it('goes wide on a wide screen', () => {
    const { cols, rows } = bestGrid(24, 1248, 600, 8, 180);
    expect(cols).toBeGreaterThan(rows);
  });

  it('only uses full rows', () => {
    for (const count of [12, 16, 24]) {
      const { cols, rows } = bestGrid(count, 500, 420, 8, 180);
      expect(cols * rows).toBe(count);
    }
  });

  it('never goes past the largest size', () => {
    expect(bestGrid(12, 2000, 2000, 8, 180).size).toBe(180);
  });

  it('gives size 0 for a space that has no room yet', () => {
    expect(bestGrid(12, 0, 0, 8, 180).size).toBe(0);
  });
});
