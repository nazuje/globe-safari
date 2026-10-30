import { describe, expect, it } from 'vitest';
import { emit, liveCount, makePool, setLimit, stepPool } from './pool.ts';

describe('particle pool', () => {
  it('never holds more than its capacity, however much is emitted', () => {
    const pool = makePool(32);
    for (let i = 0; i < 5000; i++) emit(pool, 1, i, i, 0, 0, 5, 10);
    expect(liveCount(pool)).toBe(32);
  });

  it('reuses the same arrays, so nothing is allocated while playing', () => {
    const pool = makePool(8);
    const { x } = pool;
    for (let i = 0; i < 100; i++) {
      emit(pool, 1, 0, 0, 1, 1, 1, 10);
      stepPool(pool, 0.016);
    }
    expect(pool.x).toBe(x);
  });

  it('moves particles and lets them go when their time is up', () => {
    const pool = makePool(4);
    emit(pool, 1, 0, 0, 10, 0, 0.5, 10, 100, 2);
    stepPool(pool, 0.1);
    expect(pool.x[0]).toBeCloseTo(1);
    expect(pool.vy[0]).toBeCloseTo(10);
    expect(pool.angle[0]).toBeCloseTo(0.2);
    stepPool(pool, 0.5);
    expect(liveCount(pool)).toBe(0);
  });

  it('the oldest gives way to the newest', () => {
    const pool = makePool(2);
    emit(pool, 1, 1, 0, 0, 0, 1, 1);
    emit(pool, 2, 2, 0, 0, 0, 1, 1);
    emit(pool, 3, 3, 0, 0, 0, 1, 1);
    expect(pool.art[0]).toBe(3);
    expect(pool.art[1]).toBe(2);
  });

  it('a slow device can shrink it mid-game', () => {
    const pool = makePool(16);
    for (let i = 0; i < 16; i++) emit(pool, 1, 0, 0, 0, 0, 5, 1);
    setLimit(pool, 6);
    expect(liveCount(pool)).toBe(6);
    for (let i = 0; i < 40; i++) emit(pool, 1, 0, 0, 0, 0, 5, 1);
    expect(liveCount(pool)).toBe(6);
  });
});
