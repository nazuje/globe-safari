import { describe, expect, it } from 'vitest';
import { FIRST_LOOK, HATS, HELD, type Look } from './parts.ts';
import { cleanWall, hang, WALL_SIZE } from './wall.ts';

function manyLooks(count: number): Look[] {
  const looks: Look[] = [];
  for (const hat of HATS) for (const held of HELD) looks.push({ ...FIRST_LOOK, hat, held });
  return looks.slice(0, count);
}

describe('the friends wall', () => {
  it('hangs a new friend and copies the look', () => {
    const friends: Look[] = [];
    const look = { ...FIRST_LOOK };
    expect(hang(friends, look)).toBe('added');
    look.hat = 'pirate';
    expect(friends[0]!.hat).toBe(FIRST_LOOK.hat);
  });

  it('does not hang the same friend twice', () => {
    const friends: Look[] = [];
    hang(friends, FIRST_LOOK);
    expect(hang(friends, { ...FIRST_LOOK })).toBe('known');
    expect(friends).toHaveLength(1);
  });

  it('lets the oldest friend go when full', () => {
    const friends: Look[] = [];
    const looks = manyLooks(WALL_SIZE + 2);
    for (const look of looks) hang(friends, look);
    expect(friends).toHaveLength(WALL_SIZE);
    expect(friends[0]).toEqual(looks[2]);
  });

  it('reads back saved friends safely', () => {
    expect(cleanWall(null)).toEqual([]);
    expect(cleanWall('nope')).toEqual([]);
    expect(cleanWall([{ ...FIRST_LOOK, hat: 'sombrero' }])).toEqual([FIRST_LOOK]);
    expect(cleanWall(manyLooks(40))).toHaveLength(WALL_SIZE);
  });
});
