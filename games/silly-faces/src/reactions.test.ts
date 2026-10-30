import { describe, expect, it } from 'vitest';
import { newMood, nextReaction, SILLY, WILD, type Reaction } from './reactions.ts';

const isWild = (reaction: Reaction): boolean => (WILD as readonly string[]).includes(reaction);

describe('tapping the creature', () => {
  it('shows every silly reaction before repeating any', () => {
    const mood = newMood();
    const firstFive = Array.from({ length: 5 }, () => nextReaction(mood));
    expect(new Set(firstFive).size).toBe(5);
    expect(firstFive.every((reaction) => (SILLY as readonly string[]).includes(reaction))).toBe(true);
  });

  it('never does the same thing twice in a row', () => {
    const mood = newMood();
    let last: Reaction | null = null;
    for (let i = 0; i < 2000; i++) {
      const reaction = nextReaction(mood);
      expect(reaction).not.toBe(last);
      last = reaction;
    }
  });

  it('holds wild surprises back at first, then always gets to one', () => {
    const neverLucky = (): number => 0.99;
    const mood = newMood();
    const seen = Array.from({ length: 18 }, () => nextReaction(mood, neverLucky));
    expect(seen.slice(0, 17).some(isWild)).toBe(false);
    expect(isWild(seen[17]!)).toBe(true);
  });

  it('shows all the wild surprises before repeating one', () => {
    const mood = newMood();
    const wild: Reaction[] = [];
    while (wild.length < 3) {
      const reaction = nextReaction(mood);
      if (isWild(reaction)) wild.push(reaction);
    }
    expect(new Set(wild).size).toBe(3);
  });

  it('keeps wild surprises rare', () => {
    const mood = newMood();
    const taps = 5000;
    const wild = Array.from({ length: taps }, () => nextReaction(mood)).filter(isWild).length;
    expect(wild / taps).toBeLessThan(0.15);
    expect(wild / taps).toBeGreaterThan(0.04);
  });
});
