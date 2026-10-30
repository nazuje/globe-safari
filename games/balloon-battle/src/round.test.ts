import { describe, expect, it } from 'vitest';
import { newRound, pickSurprise, pump, REMATCH_AFTER_MS, REMATCH_QUIET_MS, rematchArmed, type Round, type Surprise } from './round.ts';
import { seededRandom } from './simulate.ts';
import { levelInfo, PUFF_GAP_MS } from './tuning.ts';

function tapsToWin(round: Round): number {
  let current = round;
  let taps = 0;
  while (current.winner === null) {
    taps++;
    current = pump(current, 0, taps * 200);
  }
  return taps;
}

describe('pump', () => {
  it('fills only the side that was tapped', () => {
    const round = pump(newRound(['little', 'little']), 0, 0);
    expect(round.fill[0]).toBeGreaterThan(0);
    expect(round.fill[1]).toBe(0);
  });

  it('wins on exactly the level’s number of taps when alone', () => {
    expect(tapsToWin(newRound(['little', 'big']))).toBe(levelInfo('little').tapsToFill);
    expect(tapsToWin(newRound(['grownup', 'big']))).toBe(levelInfo('grownup').tapsToFill);
  });

  it('never fills past full, and a finished round ignores more taps', () => {
    let round = newRound(['little', 'little']);
    for (let tap = 0; tap < 100; tap++) round = pump(round, 1, tap * 100);
    expect(round.winner).toBe(1);
    expect(round.fill[1]).toBe(1);
    expect(pump(round, 0, 99999)).toBe(round);
  });

  it('gives a player who has stopped tapping no air', () => {
    let round = newRound(['little', 'grownup']);
    for (let tap = 0; tap < 200 && round.winner === null; tap++) round = pump(round, 1, tap * 100);
    expect(round.winner).toBe(1);
    expect(round.fill[0]).toBe(0);
  });

  it('treats a flat hand slapping one half as one puff, but not two sides or two taps', () => {
    let round = newRound(['big', 'big']);
    round = pump(round, 0, 1000);
    const afterOne = round.fill[0];
    for (let finger = 1; finger < 5; finger++) round = pump(round, 0, 1000 + finger);
    expect(round.fill[0]).toBe(afterOne);
    round = pump(round, 1, 1000);
    expect(round.fill[1]).toBeGreaterThan(0);
    round = pump(round, 0, 1000 + PUFF_GAP_MS);
    expect(round.fill[0]).toBeGreaterThan(afterOne);
  });

  it('finishes sooner when behind than when alone', () => {
    let round = newRound(['big', 'big']);
    for (let tap = 0; tap < 30; tap++) round = pump(round, 1, tap * 100);
    let taps = 0;
    while (round.winner === null) {
      taps++;
      round = pump(round, 0, 10000 + taps * 100);
    }
    expect(taps).toBeLessThan(levelInfo('big').tapsToFill);
  });
});

describe('pickSurprise', () => {
  it('keeps the first rounds plain', () => {
    expect(pickSurprise(0, 'none', () => 0)).toBe('none');
    expect(pickSurprise(1, 'none', () => 0)).toBe('none');
  });

  it('never repeats a surprise', () => {
    const random = seededRandom(5);
    let last: Surprise = 'none';
    for (let round = 2; round < 2000; round++) {
      const next = pickSurprise(round, last, random);
      if (next !== 'none') expect(next).not.toBe(last);
      last = next;
    }
  });

  it('is rare, and every surprise turns up', () => {
    const random = seededRandom(9);
    const seen: Record<Surprise, number> = { none: 0, gold: 0, bird: 0, sputter: 0 };
    let last: Surprise = 'none';
    for (let round = 0; round < 5000; round++) {
      last = pickSurprise(10, last, random);
      seen[last]++;
    }
    expect(seen.none / 5000).toBeGreaterThan(0.6);
    expect(seen.gold).toBeGreaterThan(200);
    expect(seen.bird).toBeGreaterThan(200);
    expect(seen.sputter).toBeGreaterThan(200);
  });
});

describe('rematchArmed', () => {
  it('waits after the bang, however still the hands are', () => {
    expect(rematchArmed(1000, 0, 1000 + REMATCH_AFTER_MS - 1)).toBe(false);
    expect(rematchArmed(1000, 0, 1000 + REMATCH_AFTER_MS)).toBe(true);
  });

  it('waits while anyone is still tapping', () => {
    const now = 1000 + REMATCH_AFTER_MS * 2;
    expect(rematchArmed(1000, now - REMATCH_QUIET_MS + 1, now)).toBe(false);
    expect(rematchArmed(1000, now - REMATCH_QUIET_MS, now)).toBe(true);
  });
});
