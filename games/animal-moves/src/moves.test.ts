import { describe, expect, it } from 'vitest';
import { MOVES } from './moves.ts';

const words = (text: string) => text.trim().split(/\s+/).length;

describe('the move list', () => {
  it('has at least 24 moves, plenty of each kind', () => {
    expect(MOVES.length).toBeGreaterThanOrEqual(24);
    expect(MOVES.filter((move) => move.energy === 'energetic').length).toBeGreaterThanOrEqual(10);
    expect(MOVES.filter((move) => move.energy === 'calm').length).toBeGreaterThanOrEqual(10);
  });

  it('has no duplicate ids or animals', () => {
    expect(new Set(MOVES.map((move) => move.id)).size).toBe(MOVES.length);
    expect(new Set(MOVES.map((move) => move.emoji)).size).toBe(MOVES.length);
  });

  it('keeps spoken lines short enough for a 4-year-old', () => {
    for (const move of MOVES) {
      expect(words(move.line), move.line).toBeGreaterThanOrEqual(3);
      expect(words(move.line), move.line).toBeLessThanOrEqual(7);
      expect(words(move.chant), move.chant).toBeLessThanOrEqual(7);
      expect(words(`Dance like ${move.like}!`)).toBeLessThanOrEqual(7);
    }
  });

  it('never suggests anything unsafe indoors', () => {
    const unsafe = /\b(run|race|chase|jump off|climb|hold your breath|hold breath|across the room)\b/i;
    for (const move of MOVES) {
      expect(`${move.line} ${move.chant} ${move.tip}`).not.toMatch(unsafe);
    }
  });

  it('keeps the slow moves slow and low', () => {
    expect(MOVES.find((move) => move.id === 'ladybird')?.line).toMatch(/slowly/i);
    expect(MOVES.find((move) => move.id === 'snake')?.tip).toMatch(/low to the floor/i);
  });
});
