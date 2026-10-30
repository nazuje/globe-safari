import { expect, it } from 'vitest';
import { FRIENDS } from './friends.ts';
import { shelfLayout, slotCentre } from './shelf.ts';

const COUNT = FRIENDS.length;

it.each([320, 360, 390, 768, 844, 1280, 1920])('fits every friend on a %ipx screen', (width) => {
  const layout = shelfLayout(width, COUNT, 800);
  expect(layout.cols * layout.rows).toBeGreaterThanOrEqual(COUNT);
  expect(layout.slot).toBeGreaterThanOrEqual(28);
  for (let i = 0; i < COUNT; i++) {
    const { x, y } = slotCentre(layout, i, 800);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(width);
    expect(y).toBeGreaterThan(800 - layout.height);
    expect(y).toBeLessThan(800);
  }
});

it('keeps the shelf small on a wide screen', () => {
  expect(shelfLayout(1280, COUNT, 700).rows).toBe(1);
});

it('leaves the bubbles most of the stage on a phone on its side', () => {
  const layout = shelfLayout(844, COUNT, 310);
  expect(layout.rows).toBe(1);
  expect(layout.height).toBeLessThan(60);
});
