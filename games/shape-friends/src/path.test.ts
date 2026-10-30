import { describe, expect, it } from 'vitest';
import { pathStones } from './path.ts';

const from = { x: 200, y: 600 };
const to = { x: 60, y: 200 };

describe('pathStones', () => {
  it('ends exactly at the door', () => {
    const stones = pathStones(from, to, 0.15);
    expect(stones.at(-1)?.x).toBeCloseTo(to.x);
    expect(stones.at(-1)?.y).toBeCloseTo(to.y);
  });

  it('leaves room around the friend at the start', () => {
    const first = pathStones(from, to, 0)[0];
    expect(Math.hypot(first.x - from.x, first.y - from.y)).toBeGreaterThan(100);
  });

  it('always heads toward the door', () => {
    const ys = pathStones(from, to, 0.2).map((stone) => stone.y);
    ys.slice(1).forEach((y, i) => expect(y).toBeLessThan(ys[i]));
  });

  it('keeps a sensible number of hops on tiny and huge screens', () => {
    expect(pathStones({ x: 0, y: 0 }, { x: 10, y: 0 }, 0).length).toBe(3);
    expect(pathStones({ x: 0, y: 0 }, { x: 5000, y: 0 }, 0).length).toBe(6);
  });

  it('bends to the chosen side', () => {
    const left = pathStones({ x: 0, y: 400 }, { x: 0, y: 0 }, 0.2)[1];
    const right = pathStones({ x: 0, y: 400 }, { x: 0, y: 0 }, -0.2)[1];
    expect(left.x).toBeGreaterThan(0);
    expect(right.x).toBeLessThan(0);
  });
});
