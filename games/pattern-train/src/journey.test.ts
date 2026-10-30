import { describe, expect, it } from 'vitest';
import { furthestAfterTrain, readFurthest, TRAINS_PER_LEVEL } from './journey.ts';

describe('readFurthest', () => {
  it('keeps a real level', () => {
    expect(readFurthest(4)).toBe(4);
  });

  it.each([[0], [7], [2.5], ['3'], [null], [undefined], [{}]])('falls back to level 1 for %j', (saved) => {
    expect(readFurthest(saved)).toBe(1);
  });
});

describe('furthestAfterTrain', () => {
  it('counts a level once a train there is done', () => {
    expect(furthestAfterTrain(1, 3, 1)).toBe(3);
  });

  it('reaches the next level by finishing the journey', () => {
    expect(furthestAfterTrain(3, 3, TRAINS_PER_LEVEL)).toBe(4);
  });

  it('never goes backwards when replaying an easy level', () => {
    expect(furthestAfterTrain(5, 2, TRAINS_PER_LEVEL)).toBe(5);
  });

  it('stops at the last level', () => {
    expect(furthestAfterTrain(6, 6, TRAINS_PER_LEVEL)).toBe(6);
  });
});
