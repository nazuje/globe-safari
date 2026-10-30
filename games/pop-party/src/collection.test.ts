import { describe, expect, it } from 'vitest';
import { addFriend, newFriendChance, pickFriend, pickRareFriend, restoreCollection, type Collection } from './collection.ts';
import { FRIENDS } from './friends.ts';

const empty = (): Collection => ({ found: [], pops: 0, debuts: 0 });
const always = (value: number) => (): number => value;

describe('restoreCollection', () => {
  it('starts empty from nothing or nonsense', () => {
    for (const saved of [null, undefined, 'hi', 7, [], {}]) expect(restoreCollection(saved)).toEqual(empty());
  });

  it('keeps known friends once, and drops unknown ones and bad numbers', () => {
    const restored = restoreCollection({ found: ['duck', 'duck', 'gremlin', 3], pops: -4, debuts: 2.5 });
    expect(restored).toEqual({ found: ['duck'], pops: 0, debuts: 2 });
  });
});

describe('pickFriend', () => {
  it('makes the very first pop a new friend, even right after another', () => {
    expect(pickFriend(empty(), false, null, always(0.5)).isNew).toBe(true);
  });

  it('holds back new friends while the last name is still being said', () => {
    const collection = { ...empty(), found: FRIENDS.slice(0, 3).map((friend) => friend.id) };
    for (let i = 0; i < 50; i++) expect(pickFriend(collection, false, null, Math.random).isNew).toBe(false);
  });

  it('avoids the same friend twice in a row when it can', () => {
    const collection: Collection = { ...empty(), found: ['kitten', 'puppy'] };
    for (let i = 0; i < 50; i++) expect(pickFriend(collection, false, 'kitten', Math.random).id).toBe('puppy');
  });

  it('never hands out a rare friend', () => {
    const collection = empty();
    for (let i = 0; i < 300; i++) {
      const { id } = pickFriend(collection, true, null, Math.random);
      addFriend(collection, id);
      expect(FRIENDS.find((friend) => friend.id === id)?.rare).toBe(false);
    }
    expect(collection.found.length).toBe(FRIENDS.filter((friend) => !friend.rare).length);
  });

  it('still works when only rare friends have been found', () => {
    const collection: Collection = { ...empty(), found: ['dragon'] };
    expect(pickFriend(collection, false, null, always(0.1)).isNew).toBe(true);
  });

  it('makes new friends scarcer as the shelf fills', () => {
    expect(newFriendChance(2)).toBeGreaterThan(newFriendChance(10));
    expect(newFriendChance(10)).toBeGreaterThan(newFriendChance(20));
  });
});

describe('pickRareFriend', () => {
  it('finds every rare friend, then repeats them', () => {
    const collection = empty();
    const rares = FRIENDS.filter((friend) => friend.rare);
    for (let i = 0; i < rares.length; i++) {
      const pick = pickRareFriend(collection, null, Math.random);
      expect(pick.isNew).toBe(true);
      addFriend(collection, pick.id);
    }
    expect(pickRareFriend(collection, null, Math.random).isNew).toBe(false);
  });
});

it('has unique friends with old enough emoji for an old tablet', () => {
  expect(new Set(FRIENDS.map((friend) => friend.id)).size).toBe(FRIENDS.length);
  expect(new Set(FRIENDS.map((friend) => friend.emoji)).size).toBe(FRIENDS.length);
});
