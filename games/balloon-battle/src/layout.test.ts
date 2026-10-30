import { describe, expect, it } from 'vitest';
import { defaultOpposite, layoutFor } from './layout.ts';

describe('layoutFor', () => {
  it('stacks opposite players on a tall screen, with the first half turned', () => {
    expect(layoutFor(768, 1024, true)).toEqual({ split: 'stacked', flipFirst: true });
  });

  it('keeps left and right on a wide screen, still turning the first half', () => {
    expect(layoutFor(1024, 768, true)).toEqual({ split: 'columns', flipFirst: true });
  });

  it('never turns anything for players side by side', () => {
    expect(layoutFor(390, 844, false)).toEqual({ split: 'columns', flipFirst: false });
    expect(layoutFor(844, 390, false)).toEqual({ split: 'columns', flipFirst: false });
  });
});

describe('defaultOpposite', () => {
  it('is on for tablets only', () => {
    expect(defaultOpposite(768, 1024, true)).toBe(true);
    expect(defaultOpposite(390, 844, true)).toBe(false);
    expect(defaultOpposite(1280, 800, false)).toBe(false);
  });
});
