import { FRIENDS, type FriendId } from './friends.ts';

/** What the shelf remembers between visits. */
export interface Collection {
  found: FriendId[];
  /** Every friend ever popped, which is what slowly brings in the wilder bubbles. */
  pops: number;
  /** How many of the wilder bubbles have made their first appearance. */
  debuts: number;
}

export type Rng = () => number;

export interface Pick {
  id: FriendId;
  isNew: boolean;
}

/** Saved data can be old, cut short or edited, so only what still makes sense is kept. */
export function restoreCollection(saved: unknown): Collection {
  const data = (typeof saved === 'object' && saved !== null ? saved : {}) as Partial<Record<keyof Collection, unknown>>;
  const known = new Set<unknown>(Array.isArray(data.found) ? data.found : []);
  return {
    found: FRIENDS.filter((friend) => known.has(friend.id)).map((friend) => friend.id),
    pops: wholeNumber(data.pops),
    debuts: wholeNumber(data.debuts),
  };
}

function wholeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** New friends come thick and fast at first, then get more special as the shelf fills up. */
export function newFriendChance(foundCount: number): number {
  if (foundCount < 8) return 0.7;
  if (foundCount < 16) return 0.4;
  return 0.22;
}

function oneOf<T>(list: readonly T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)]!;
}

function missing(collection: Collection, rare: boolean): FriendId[] {
  return FRIENDS.filter((friend) => friend.rare === rare && !collection.found.includes(friend.id)).map(
    (friend) => friend.id,
  );
}

function repeatFriend(collection: Collection, rare: boolean, avoid: FriendId | null, rng: Rng): FriendId {
  const known = FRIENDS.filter((friend) => friend.rare === rare && collection.found.includes(friend.id));
  const fresh = known.filter((friend) => friend.id !== avoid);
  return oneOf(fresh.length > 0 ? fresh : known, rng).id;
}

/** Who is inside a golden bubble: a brand-new rare friend while any are left. */
export function pickRareFriend(collection: Collection, avoid: FriendId | null, rng: Rng): Pick {
  const waiting = missing(collection, true);
  if (waiting.length > 0) return { id: oneOf(waiting, rng), isNew: true };
  return { id: repeatFriend(collection, true, avoid, rng), isNew: false };
}

/**
 * Who is inside an ordinary bubble. It's decided at the pop, so a child mashing the
 * screen can't get ahead of the voice: `mayBeNew` is false right after a new friend.
 */
export function pickFriend(collection: Collection, mayBeNew: boolean, avoid: FriendId | null, rng: Rng): Pick {
  const waiting = missing(collection, false);
  const hasRepeats = collection.found.length > 0;
  const wantsNew = !hasRepeats || (mayBeNew && rng() < newFriendChance(collection.found.length));
  if (waiting.length > 0 && wantsNew) return { id: oneOf(waiting, rng), isNew: true };
  const commonFound = FRIENDS.some((friend) => !friend.rare && collection.found.includes(friend.id));
  if (commonFound) return { id: repeatFriend(collection, false, avoid, rng), isNew: false };
  return { id: oneOf(waiting, rng), isNew: true };
}

export function addFriend(collection: Collection, id: FriendId): void {
  if (!collection.found.includes(id)) collection.found.push(id);
}
