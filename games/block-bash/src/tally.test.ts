import { describe, expect, it } from 'vitest';
import { bothHaveGone, newTally, nextLevel, together, turnFinished } from './tally.ts';

describe('two players', () => {
  it('alternates turns and keeps each tally', () => {
    let tally = newTally();
    expect(tally.turn).toBe('fox');
    tally = turnFinished(tally, 7);
    expect(tally.turn).toBe('frog');
    expect(bothHaveGone(tally)).toBe(false);
    tally = turnFinished(tally, 12);
    expect(tally).toMatchObject({ fox: 7, frog: 12, turn: 'fox' });
    expect(bothHaveGone(tally)).toBe(true);
    expect(together(tally)).toBe(19);
  });

  it('keeps the score going into a new level', () => {
    const tally = nextLevel(turnFinished(turnFinished(newTally(), 3), 4));
    expect(tally).toMatchObject({ fox: 3, frog: 4, turnsOnLevel: 0 });
  });
});
