import { describe, expect, it } from 'vitest';
import { STICKERS, addSticker, cleanCollection, pickSticker } from './stickers.ts';

describe('the sticker catalog', () => {
  it('has 24 different friends', () => {
    expect(STICKERS).toHaveLength(24);
    expect(new Set(STICKERS.map((item) => item.id)).size).toBe(24);
  });

  it('gives each shape three friends that look different', () => {
    const looks = new Set(STICKERS.map(({ friend, accessory }) => `${friend.shape}:${friend.color}:${accessory}`));
    expect(looks.size).toBe(24);
    const circles = STICKERS.filter((item) => item.friend.shape === 'circle');
    expect(new Set(circles.map((item) => item.friend.color)).size).toBe(3);
  });
});

describe('pickSticker', () => {
  it('always gives a new sticker while any are missing', () => {
    let collected: string[] = [];
    for (let i = 0; i < STICKERS.length; i++) {
      const pick = pickSticker(collected, () => 0.7);
      expect(pick.isNew).toBe(true);
      expect(collected).not.toContain(pick.sticker.id);
      collected = addSticker(collected, pick.sticker.id);
    }
    expect(collected).toHaveLength(STICKERS.length);
  });

  it('still rewards a child with a full book', () => {
    const everything = STICKERS.map((item) => item.id);
    const pick = pickSticker(everything, () => 0.2);
    expect(pick.isNew).toBe(false);
    expect(everything).toContain(pick.sticker.id);
  });
});

describe('addSticker', () => {
  it('never adds a sticker twice', () => {
    expect(addSticker(['a'], 'a')).toEqual(['a']);
  });
});

describe('cleanCollection', () => {
  const real = STICKERS[0].id;

  it('keeps real stickers once each', () => {
    expect(cleanCollection([real, real])).toEqual([real]);
  });

  it('drops anything unknown', () => {
    expect(cleanCollection([real, 'nope', 7, null])).toEqual([real]);
  });

  it('survives data that is not a list', () => {
    expect(cleanCollection('oops')).toEqual([]);
    expect(cleanCollection(null)).toEqual([]);
  });
});
