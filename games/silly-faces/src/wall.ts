import { cleanLook, sameLook, type Look } from './parts.ts';

export const WALL_SIZE = 24;

export type Saved = 'added' | 'known';

/**
 * Hangs a look on the wall and says what happened. A look already there isn't
 * hung twice, so a child leaning on the camera can't fill the wall with copies.
 * A full wall lets its oldest friend go to make room.
 */
export function hang(friends: Look[], look: Look): Saved {
  if (friends.some((friend) => sameLook(friend, look))) return 'known';
  friends.push({ ...look });
  if (friends.length > WALL_SIZE) friends.shift();
  return 'added';
}

/** Saved data can be old or broken, so everything read back goes through here. */
export function cleanWall(saved: unknown): Look[] {
  if (!Array.isArray(saved)) return [];
  return saved.slice(-WALL_SIZE).map((look) => cleanLook(look));
}
