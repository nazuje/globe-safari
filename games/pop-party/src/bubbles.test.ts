import { describe, expect, it } from 'vitest';
import { bubbleTarget, bubbleUnit, chooseKind, DEBUTS, findHit, HIT_PADDING, isShowpiece, KINDS } from './bubbles.ts';
import type { Collection } from './collection.ts';

const collection = (pops: number, debuts: number): Collection => ({ found: [], pops, debuts });

describe('chooseKind', () => {
  it('stays with plain and tiny bubbles at the start', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(chooseKind(collection(0, 0), false, Math.random));
    expect([...seen].sort()).toEqual(['plain', 'tiny']);
  });

  it('brings every wilder bubble in once, in order', () => {
    const state = collection(1000, 0);
    const arrivals = DEBUTS.map(() => chooseKind(state, false, Math.random));
    expect(arrivals).toEqual(DEBUTS.map((debut) => debut.kind));
    expect(state.debuts).toBe(DEBUTS.length);
  });

  it('waits to debut a showpiece while another is out', () => {
    const state = collection(1000, 1);
    expect(isShowpiece(chooseKind(state, true, () => 0.99))).toBe(false);
    expect(state.debuts).toBe(1);
  });

  it('allows only one showpiece at a time, after debuts', () => {
    for (let i = 0; i < 3000; i++) {
      expect(isShowpiece(chooseKind(collection(1000, DEBUTS.length), true, Math.random))).toBe(false);
    }
  });

  it('makes golden bubbles the rarest', () => {
    let golden = 0;
    let toot = 0;
    const state = collection(1000, DEBUTS.length);
    for (let i = 0; i < 40000; i++) {
      const kind = chooseKind(state, false, Math.random);
      if (kind === 'golden') golden += 1;
      if (kind === 'toot') toot += 1;
    }
    expect(golden).toBeGreaterThan(0);
    expect(golden).toBeLessThan(toot);
  });
});

describe('sizes', () => {
  it('keeps even the smallest bubble an easy target', () => {
    const smallest = bubbleUnit(320, 400) * Math.min(...Object.values(KINDS).map((kind) => kind.size));
    expect((smallest + HIT_PADDING) * 2).toBeGreaterThanOrEqual(64);
  });

  it('keeps the bubble count sensible on any screen', () => {
    for (const [width, height] of [[320, 400], [390, 650], [1280, 680], [2560, 1300]] as const) {
      const unit = bubbleUnit(width, height);
      for (const slow of [false, true]) {
        const target = bubbleTarget(width, height, unit, slow);
        expect(target).toBeGreaterThanOrEqual(4);
        expect(target).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('findHit', () => {
  const round = (x: number, y: number, r: number, alive = true) => ({ x, y, r, alive });

  it('counts a tap just outside a bubble', () => {
    const bubble = round(100, 100, 50);
    expect(findHit([bubble], 100 + 50 + HIT_PADDING - 1, 100, () => true)).toBe(bubble);
    expect(findHit([bubble], 100 + 50 + HIT_PADDING + 1, 100, () => true)).toBeNull();
  });

  it('picks the closest of overlapping bubbles and skips gone or busy ones', () => {
    const near = round(100, 100, 40);
    const far = round(150, 100, 40);
    expect(findHit([far, near], 105, 100, () => true)).toBe(near);
    expect(findHit([far, near], 105, 100, (bubble) => bubble !== near)).toBe(far);
    expect(findHit([round(100, 100, 40, false)], 100, 100, () => true)).toBeNull();
  });
});
