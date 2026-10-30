import { describe, expect, it } from 'vitest';
import { DEFAULT_SETUP, FACES, nextFace, readBests, readSetup, recordBest } from './setup.ts';

describe('readSetup', () => {
  it('falls back to the defaults for nothing or nonsense', () => {
    expect(readSetup(null)).toEqual(DEFAULT_SETUP);
    expect(readSetup('oops')).toEqual(DEFAULT_SETUP);
    expect(readSetup({ mode: 'party', pairs: 99, faces: 'x' })).toEqual(DEFAULT_SETUP);
  });

  it('keeps good saved values', () => {
    const saved = { mode: 'solo', pairs: 12, faces: ['👵', '🦸'] };
    expect(readSetup(saved)).toEqual(saved);
  });

  it('will not let both players have the same face', () => {
    expect(readSetup({ faces: ['👵', '👵'] }).faces).toEqual(DEFAULT_SETUP.faces);
  });
});

describe('readBests', () => {
  it('keeps only sensible scores for real board sizes', () => {
    expect(readBests({ 6: 14, 8: 3, 12: 'lots', 7: 20 })).toEqual({ 6: 14 });
    expect(readBests(null)).toEqual({});
  });
});

describe('recordBest', () => {
  it('counts the first finish as a new best', () => {
    expect(recordBest({}, 6, 20)).toEqual({ bests: { 6: 20 }, isNew: true });
  });

  it('takes fewer flips as a new best, per board size', () => {
    expect(recordBest({ 6: 20, 8: 30 }, 6, 18)).toEqual({ bests: { 6: 18, 8: 30 }, isNew: true });
  });

  it('keeps the old best for more flips or the same flips', () => {
    expect(recordBest({ 6: 20 }, 6, 24)).toEqual({ bests: { 6: 20 }, isNew: false });
    expect(recordBest({ 6: 20 }, 6, 20)).toEqual({ bests: { 6: 20 }, isNew: false });
  });
});

describe('nextFace', () => {
  it('moves along the list and wraps round', () => {
    expect(nextFace(FACES[2], FACES[0])).toBe(FACES[3]);
    expect(nextFace(FACES[FACES.length - 1], FACES[1])).toBe(FACES[0]);
  });

  it("skips the other player's face", () => {
    expect(nextFace(FACES[0], FACES[1])).toBe(FACES[2]);
  });
});
