import { describe, expect, it } from 'vitest';
import { availableCharacters, CHARACTERS, NEW_FRIENDS_AFTER_ROUNDS, STICKERS, stickersFor } from './characters.ts';

describe('characters', () => {
  it('holds two friends back until they have been earned by playing', () => {
    expect(availableCharacters(0)).toHaveLength(CHARACTERS.length - 2);
    expect(availableCharacters(NEW_FRIENDS_AFTER_ROUNDS)).toHaveLength(CHARACTERS.length);
  });

  it('gives every character its own color', () => {
    expect(new Set(CHARACTERS.map(({ color }) => color)).size).toBe(CHARACTERS.length);
  });
});

describe('stickersFor', () => {
  it('shows nothing before a win', () => {
    expect(stickersFor(0, 5)).toEqual([]);
  });

  it('puts the newest first and stops at the limit', () => {
    expect(stickersFor(3, 5)).toEqual([STICKERS[2], STICKERS[1], STICKERS[0]]);
    expect(stickersFor(10, 2)).toEqual([STICKERS[9], STICKERS[8]]);
  });

  it('starts the sheet over after the last sticker', () => {
    expect(stickersFor(STICKERS.length + 1, 1)).toEqual([STICKERS[0]]);
  });
});
