import { describe, expect, it } from 'vitest';
import { activeSpots, FRIENDS, LEVELS, SCENES, surpriseFor } from './scenes.ts';

describe.each(SCENES.map((scene) => [scene.id, scene] as const))('%s', (_id, scene) => {
  it('has nine spots, one to a cell of the room', () => {
    const cells = new Set(scene.spots.map((spot) => `${spot.col},${spot.row}`));
    expect(cells.size).toBe(9);
    expect(new Set(scene.spots.map((spot) => spot.id)).size).toBe(9);
  });

  it('gives each level its number of spots, and harder levels only add to easier ones', () => {
    const [easy, middle, hard] = LEVELS.map((level) => activeSpots(scene, level.id));
    expect([easy.length, middle.length, hard.length]).toEqual([6, 8, 9]);
    expect(middle).toEqual(expect.arrayContaining(easy));
    expect(hard).toEqual(expect.arrayContaining(middle));
  });

  it('keeps every row of the room busy on easy', () => {
    const rows = activeSpots(scene, 'easy').map((spot) => spot.row);
    expect(new Set(rows).size).toBe(3);
  });

  it('has one landmark above each column', () => {
    expect(scene.landmarks.map((landmark) => landmark.col).toSorted()).toEqual([0, 1, 2]);
  });

  it('never surprises you with a friend, so "found" stays clear', () => {
    const friends = FRIENDS.map((friend) => friend.emoji);
    expect(scene.surprises.some((surprise) => friends.includes(surprise.emoji))).toBe(false);
  });

  it('has a different surprise behind each spot, and it changes between rounds', () => {
    const roundOne = scene.spots.map((spot) => surpriseFor(scene, spot.id, 0).emoji);
    const roundTwo = scene.spots.map((spot) => surpriseFor(scene, spot.id, 1).emoji);
    expect(new Set(roundOne).size).toBe(9);
    expect(roundOne).not.toEqual(roundTwo);
  });
});
