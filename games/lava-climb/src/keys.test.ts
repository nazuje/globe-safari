import { describe, expect, it } from 'vitest';
import { Held } from './keys.ts';

describe('held buttons', () => {
  it('lets the newest of left and right win, and a slide swap them', () => {
    const held = new Held();
    held.press('a', 'left');
    held.press('b', 'right');
    expect(held.dir).toBe(1);
    held.release('b');
    expect(held.dir).toBe(-1);
    held.press('a', 'right');
    expect(held.dir).toBe(1);
  });

  it('keeps a button down while any finger is on it', () => {
    const held = new Held();
    held.press('a', 'jump');
    held.press('b', 'jump');
    held.release('a');
    expect(held.has('jump')).toBe(true);
    held.releaseAll();
    expect(held.has('jump')).toBe(false);
  });
});
