import { describe, expect, it } from 'vitest';
import { boundsOf, LEVELS, FURTHEST_REACH, MAX_BLOCKS, topPlainBlock } from './levels.ts';

function overlap(a: number, aSize: number, b: number, bSize: number): number {
  return Math.min(a + aSize / 2, b + bSize / 2) - Math.max(a - aSize / 2, b - bSize / 2);
}

describe('levels', () => {
  it('has about fifteen open levels and a hidden one', () => {
    expect(LEVELS.filter((level) => !level.bonus)).toHaveLength(15);
    expect(LEVELS.filter((level) => level.bonus)).toHaveLength(1);
  });

  it('every level is a different structure', () => {
    const shapes = LEVELS.map((level) => JSON.stringify(level.blocks.map(({ x, y, z, w, h, d }) => [x, y, z, w, h, d])));
    expect(new Set(shapes).size).toBe(LEVELS.length);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s stays small enough for a slow tablet', (_id, level) => {
    expect(level.blocks.length).toBeGreaterThanOrEqual(12);
    expect(level.blocks.length).toBeLessThanOrEqual(MAX_BLOCKS);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s fits a sensible table', (_id, level) => {
    expect(boundsOf(level).reach).toBeLessThanOrEqual(FURTHEST_REACH);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s has no blocks inside each other', (_id, level) => {
    const unturned = level.blocks.filter((block) => block.turn === 0);
    unturned.forEach((a, i) => {
      unturned.slice(i + 1).forEach((b) => {
        const inside = overlap(a.x, a.w, b.x, b.w) > 0.01 && overlap(a.y, a.h, b.y, b.h) > 0.01 && overlap(a.z, a.d, b.z, b.d) > 0.01;
        expect(inside, JSON.stringify([a, b])).toBe(false);
      });
    });
  });

  it('gives a mouse somewhere to sit on every level', () => {
    for (const level of LEVELS) {
      const top = level.blocks[topPlainBlock(level)];
      expect(top).toBeDefined();
      expect(top?.kind === 'pop' || top?.kind === 'jelly').toBe(false);
    }
  });

  it('has silly faces, pop blocks and jelly somewhere', () => {
    const kinds = new Set(LEVELS.flatMap((level) => level.blocks.map((block) => block.kind)));
    expect([...kinds].sort()).toEqual(['face', 'jelly', 'plain', 'pop']);
  });
});
