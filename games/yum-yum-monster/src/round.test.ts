import { describe, expect, it } from 'vitest';
import { makeRequests } from './requests.ts';
import type { Level } from './requests.ts';
import {
  currentRequest,
  feed,
  foodLeft,
  fullness,
  HINT_AFTER_MISSES,
  isFinished,
  newRound,
  nextReaction,
  REACTIONS,
  restoreRound,
  showsHint,
} from './round.ts';
import type { Round } from './round.ts';

function wrongId(round: Round): string {
  const request = currentRequest(round);
  return request.plate.find((item) => item.foodId !== request.correctId)!.foodId;
}

/** Feeds the right food until one request is done. */
function finishRequest(start: Round): Round {
  let round = start;
  const { index } = round;
  while (round.index === index) round = feed(round, currentRequest(round).correctId).round;
  return round;
}

describe('feed', () => {
  it('finishes a game in exactly the requested number of bites', () => {
    for (const level of [1, 2, 3, 4, 5] as Level[]) {
      let round = newRound(level);
      const wanted = round.requests.reduce((sum, request) => sum + request.count, 0);
      let bites = 0;
      while (!isFinished(round)) {
        round = feed(round, currentRequest(round).correctId).round;
        bites += 1;
      }
      expect(bites).toBe(wanted);
    }
  });

  it('counts bites up to the number asked, then moves on', () => {
    const round = newRound(5);
    const count = currentRequest(round).count;
    const seen: number[] = [];
    let state = round;
    for (let i = 0; i < count; i++) {
      const result = feed(state, currentRequest(state).correctId);
      if (result.outcome === 'wrong') throw new Error('should be right');
      seen.push(result.bites);
      expect(result.outcome).toBe(i === count - 1 ? 'request-done' : 'bite');
      state = result.round;
    }
    expect(seen).toEqual(Array.from({ length: count }, (_, i) => i + 1));
    expect(state.index).toBe(1);
    expect(state.eaten).toBe(0);
  });

  it('says round-done on the last bite of the last request', () => {
    let round = newRound(1);
    for (let i = 0; i < 4; i++) round = finishRequest(round);
    expect(feed(round, currentRequest(round).correctId).outcome).toBe('round-done');
  });

  it('never costs anything for a wrong food', () => {
    const round = { ...newRound(4), eaten: 0 };
    const item = currentRequest(round).plate[0]!;
    const result = feed(round, wrongId(round));
    expect(result.outcome).toBe('wrong');
    expect(result.round.index).toBe(0);
    expect(result.round.eaten).toBe(0);
    expect(foodLeft(result.round, item)).toBe(foodLeft(round, item));
  });

  it('does not change the round it was given', () => {
    const round = newRound(3);
    const copy = structuredClone(round);
    feed(round, wrongId(round));
    feed(round, currentRequest(round).correctId);
    expect(round).toEqual(copy);
  });

  it('takes eaten food off the plate, and never runs the right food out early', () => {
    let round = newRound(4);
    while (!isFinished(round)) {
      const request = currentRequest(round);
      const right = request.plate.find((item) => item.foodId === request.correctId)!;
      expect(foodLeft(round, right)).toBeGreaterThanOrEqual(request.count - round.eaten);
      round = feed(round, request.correctId).round;
    }
  });
});

describe('hints', () => {
  it('turns on after two wrong tries, and off for the next request', () => {
    let round = newRound(1);
    expect(showsHint(round)).toBe(false);
    for (let i = 0; i < HINT_AFTER_MISSES; i++) round = feed(round, wrongId(round)).round;
    expect(HINT_AFTER_MISSES).toBe(2);
    expect(showsHint(round)).toBe(true);
    expect(showsHint(finishRequest(round))).toBe(false);
  });

  it('stays on through the bites of a count', () => {
    let round = newRound(4);
    while (currentRequest(round).count < 2) round = finishRequest(round);
    for (let i = 0; i < HINT_AFTER_MISSES; i++) round = feed(round, wrongId(round)).round;
    round = feed(round, currentRequest(round).correctId).round;
    expect(showsHint(round)).toBe(true);
  });
});

describe('fullness', () => {
  it('grows from empty to stuffed', () => {
    let round = newRound(1);
    expect(fullness(round)).toBe(0);
    let last = 0;
    for (let i = 0; i < 5; i++) {
      round = finishRequest(round);
      expect(fullness(round)).toBeGreaterThan(last);
      last = fullness(round);
    }
    expect(last).toBe(1);
  });
});

describe('restoreRound', () => {
  it('brings back a saved round, even after going through JSON', () => {
    const round = feed(newRound(4), 'nothing-right').round;
    expect(restoreRound(JSON.parse(JSON.stringify(round)), 4)).toEqual(round);
  });

  it('ignores a round from another level', () => {
    expect(restoreRound(newRound(3), 4)).toBeNull();
  });

  it('ignores a finished round', () => {
    expect(restoreRound({ ...newRound(1), index: 5 }, 1)).toBeNull();
  });

  it.each([
    null,
    undefined,
    'junk',
    42,
    {},
    { level: 1 },
    { level: 1, requests: [], index: 0, eaten: 0, misses: 0 },
  ])('ignores junk: %j', (junk) => {
    expect(restoreRound(junk, 1)).toBeNull();
  });

  it('ignores a round with a food this version does not know', () => {
    const round = newRound(1);
    const requests = makeRequests(1);
    requests[2]!.plate[0]!.foodId = 'mystery';
    expect(restoreRound({ ...round, requests }, 1)).toBeNull();
  });

  it('ignores an impossible bite count', () => {
    const round = newRound(3);
    expect(restoreRound({ ...round, eaten: currentRequest(round).count }, 3)).toBeNull();
    expect(restoreRound({ ...round, eaten: -1 }, 3)).toBeNull();
  });
});

describe('nextReaction', () => {
  it('never repeats the last reaction', () => {
    let previous = null;
    for (let i = 0; i < 200; i++) {
      const reaction = nextReaction(previous);
      expect(reaction).not.toBe(previous);
      previous = reaction;
    }
  });

  it('includes a burp', () => {
    expect(REACTIONS.some((reaction) => reaction.mood === 'burp')).toBe(true);
  });
});
