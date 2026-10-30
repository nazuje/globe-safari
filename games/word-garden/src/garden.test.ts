import { describe, expect, it } from 'vitest';
import { flowerAt, FLOWERS, friendArriving, friendsFor, FRIENDS } from './garden.ts';

describe('garden', () => {
  it('cycles through the flowers', () => {
    expect(flowerAt(0)).toBe(FLOWERS[0]);
    expect(flowerAt(FLOWERS.length)).toBe(FLOWERS[0]);
  });

  it('brings a friend every five words', () => {
    expect(friendArriving(0)).toBeNull();
    expect(friendArriving(4)).toBeNull();
    expect(friendArriving(5)).toBe(FRIENDS[0]);
    expect(friendArriving(6)).toBeNull();
    expect(friendArriving(10)).toBe(FRIENDS[1]);
  });

  it('remembers every friend, looping once all have come', () => {
    expect(friendsFor(4)).toEqual([]);
    expect(friendsFor(14).map((friend) => friend.name)).toEqual(['bee', 'butterfly']);
    expect(friendsFor(30).at(-1)).toBe(FRIENDS[0]);
  });
});
