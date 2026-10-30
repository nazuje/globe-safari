import { describe, expect, it } from 'vitest';
import { aimHelp, ballsLeft, ballThrown, blockFell, canThrow, enoughToDrop, LONGEST_SETTLE_S, newRound, shouldEnd, tick, waveDropped, waveDue, waveSize, type Round } from './round.ts';
import { BALLS_PER_TURN } from './scoring.ts';

const wait = (round: Round, seconds: number, calm = true): Round => tick(round, seconds, calm).round;

function afterThrows(count: number, base = 20): Round {
  let round = newRound(base);
  for (let i = 0; i < count; i += 1) round = wait(blockFell(ballThrown(round)), 3);
  return round;
}

describe('a turn', () => {
  it('starts ready, with a full set of balls', () => {
    const round = newRound(20);
    expect(canThrow(round)).toBe(true);
    expect(ballsLeft(round)).toBe(BALLS_PER_TURN);
  });

  it('lets a crash play out before the next ball', () => {
    const thrown = ballThrown(newRound(20));
    expect(canThrow(thrown)).toBe(false);
    expect(canThrow(wait(thrown, 1, true))).toBe(false);
    expect(canThrow(wait(thrown, 3, false))).toBe(false);
    expect(canThrow(wait(thrown, 3, true))).toBe(true);
  });

  it('does not wait for ever for something still rolling', () => {
    expect(canThrow(wait(ballThrown(newRound(20)), LONGEST_SETTLE_S, false))).toBe(true);
  });

  it('runs out of balls', () => {
    expect(canThrow(afterThrows(BALLS_PER_TURN))).toBe(false);
  });

  it('never ends before the balls are gone', () => {
    expect(shouldEnd(wait(newRound(20), 100))).toBe(false);
    expect(shouldEnd(wait(afterThrows(BALLS_PER_TURN - 1), 100))).toBe(false);
  });

  it('takes a last look at the final crash', () => {
    const done = afterThrows(BALLS_PER_TURN);
    expect(shouldEnd(done)).toBe(false);
    expect(shouldEnd(wait(done, 1))).toBe(true);
  });

  it('reports a big crash once per throw', () => {
    let round = ballThrown(newRound(20));
    for (let i = 0; i < 10; i += 1) round = blockFell(round);
    const first = tick(round, 0.1, false);
    expect(first.bigCrash).toBe(true);
    expect(tick(first.round, 0.1, false).bigCrash).toBe(false);
  });

  it('cannot count more blocks than have been in play', () => {
    expect(blockFell(blockFell(newRound(1))).fallen).toBe(1);
  });
});

describe('a miss', () => {
  it('is a settled throw that moved nothing', () => {
    expect(tick(ballThrown(newRound(20)), 3, true).missed).toBe(true);
    expect(tick(blockFell(ballThrown(newRound(20))), 3, true).missed).toBe(false);
  });

  it('builds a streak that a hit clears', () => {
    const twice = wait(ballThrown(wait(ballThrown(newRound(20)), 3)), 3);
    expect(twice.missStreak).toBe(2);
    expect(wait(blockFell(ballThrown(twice)), 3).missStreak).toBe(0);
  });

  it('turns the aim help up after two misses, until a hit', () => {
    expect(aimHelp(false, 0)).toBe(0);
    expect(aimHelp(true, 0)).toBe(1);
    expect(aimHelp(false, 1)).toBe(0);
    expect(aimHelp(false, 2)).toBe(2);
    expect(aimHelp(true, 2)).toBe(2);
  });

  it('does not count a wave landing as a miss', () => {
    const round = waveDropped(afterThrows(3), 8);
    expect(tick(round, 3, true).missed).toBe(false);
  });
});

describe('waves', () => {
  function mostlyDown(): Round {
    let round = ballThrown(newRound(20));
    for (let i = 0; i < 15; i += 1) round = blockFell(round);
    return wait(round, 3);
  }

  it('comes when most of the structure is down', () => {
    expect(waveDue(mostlyDown(), 4)).toBe(true);
    expect(waveDue(mostlyDown(), 15)).toBe(false);
  });

  it('comes at halfway even if the structure is holding out', () => {
    expect(waveDue(afterThrows(2), 18)).toBe(false);
    expect(waveDue(afterThrows(3), 17)).toBe(true);
  });

  it('comes before the last ball', () => {
    const halfway = wait(ballThrown(wait(waveDropped(afterThrows(3), 8), 3)), 3);
    expect(waveDue(halfway, 12)).toBe(false);
    expect(waveDue(afterThrows(BALLS_PER_TURN - 1), 12)).toBe(true);
  });

  it('never comes twice without a ball between, or with no balls left', () => {
    const landed = wait(waveDropped(mostlyDown(), 0), 3);
    expect(waveDue(landed, 0)).toBe(false);
    expect(waveDue(afterThrows(BALLS_PER_TURN), 0)).toBe(false);
  });

  it('adds to the blocks in play and holds the next ball until it lands', () => {
    const round = waveDropped(mostlyDown(), 8);
    expect(round.total).toBe(28);
    expect(round.base).toBe(20);
    expect(canThrow(round)).toBe(false);
    expect(canThrow(wait(round, 3))).toBe(true);
  });

  it('stays a sensible size', () => {
    expect(waveSize(14)).toBe(8);
    expect(waveSize(60)).toBe(16);
    expect(enoughToDrop(1)).toBe(false);
    expect(enoughToDrop(8)).toBe(true);
  });
});
