import { describe, expect, it } from 'vitest';
import { CAR_HEIGHT, fitTrain, GAP, ROW_GAP } from './layout.ts';

describe('fitTrain', () => {
  it('keeps a short train on one track on a wide screen', () => {
    expect(fitTrain(6, 1200, 400).rows).toBe(1);
  });

  it('keeps a tablet train in one unbroken line while its cars are big enough', () => {
    expect(fitTrain(7, 736, 680).rows).toBe(1);
  });

  it('wraps the longest train so a phone still gets big cars', () => {
    const fit = fitTrain(15, 328, 330);
    expect(fit.rows).toBeGreaterThan(1);
    expect(fit.size).toBeGreaterThanOrEqual(56);
  });

  it('never overflows, and always has room for every car', () => {
    for (const cells of [6, 8, 10, 12, 15]) {
      for (const [width, height] of [[328, 300], [328, 180], [736, 420], [1100, 300]]) {
        const fit = fitTrain(cells, width, height);
        expect(fit.columns * fit.rows).toBeGreaterThanOrEqual(cells);
        expect(fit.columns * fit.size + (fit.columns - 1) * GAP).toBeLessThanOrEqual(width);
        expect(fit.rows * fit.size * CAR_HEIGHT + (fit.rows - 1) * ROW_GAP).toBeLessThanOrEqual(height);
      }
    }
  });
});
