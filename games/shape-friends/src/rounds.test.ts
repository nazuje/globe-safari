import { describe, expect, it } from 'vitest';
import {
  DOORS_PER_QUESTION,
  HOME_COLOR,
  LEVELS,
  ROUND_LENGTH,
  doorFits,
  judgeTap,
  makeRound,
  questionKey,
  type Door,
  type LevelId,
  type Round,
} from './rounds.ts';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function manyRounds(level: LevelId): Round[] {
  return Array.from({ length: 300 }, (_, seed) => makeRound(level, seeded(seed)));
}

const LEVEL_IDS = LEVELS.map((level) => level.id);
const doorId = (door: Door) => JSON.stringify(door);

describe.each(LEVEL_IDS)('every round on level %i', (level) => {
  const rounds = manyRounds(level);

  it('has six questions with three different doors', () => {
    for (const round of rounds) {
      expect(round.questions).toHaveLength(ROUND_LENGTH);
      for (const { doors } of round.questions) {
        expect(doors).toHaveLength(DOORS_PER_QUESTION);
        expect(new Set(doors.map(doorId)).size).toBe(DOORS_PER_QUESTION);
      }
    }
  });

  it('always has the right door, and only that door fits', () => {
    for (const round of rounds) {
      for (const { friend, doors, answer } of round.questions) {
        expect(doors.map((door) => doorFits(door, friend))).toEqual(doors.map((_, i) => i === answer));
      }
    }
  });

  it('never asks the same question twice in a row', () => {
    for (const { questions } of rounds) {
      const keys = questions.map(questionKey);
      keys.slice(1).forEach((key, i) => expect(key).not.toBe(keys[i]));
    }
  });

  it('does not always hide the answer behind the same door', () => {
    const spots = new Set(rounds.flatMap((round) => round.questions.map((question) => question.answer)));
    expect(spots).toEqual(new Set([0, 1, 2]));
  });
});

describe('the shape levels', () => {
  it('level 1 uses only the three first shapes, each one each round', () => {
    for (const round of manyRounds(1)) {
      const shapes = round.questions.map((question) => question.friend.shape);
      expect(new Set(shapes)).toEqual(new Set(['circle', 'square', 'triangle']));
    }
  });

  it('level 2 meets all six shapes in a round', () => {
    for (const round of manyRounds(2)) {
      expect(new Set(round.questions.map((question) => question.friend.shape)).size).toBe(6);
    }
  });

  it('level 3 always brings the oval and the diamond', () => {
    for (const round of manyRounds(3)) {
      const shapes = round.questions.map((question) => question.friend.shape);
      expect(shapes).toContain('oval');
      expect(shapes).toContain('diamond');
    }
  });

  it('keeps each shape in its own color on levels 1 to 3', () => {
    for (const level of [1, 2, 3] as const) {
      for (const round of manyRounds(level)) {
        for (const { friend } of round.questions) {
          expect(friend.color).toBe(HOME_COLOR[friend.shape]);
          expect(friend.size).toBe('middle');
        }
      }
    }
  });
});

describe('level 4', () => {
  it('sends a big and a small friend of different colors to the same door', () => {
    for (const round of manyRounds(4)) {
      const shapes = new Set(round.questions.map((question) => question.friend.shape));
      expect(shapes.size).toBe(3);
      for (const shape of shapes) {
        const pair = round.questions.filter((question) => question.friend.shape === shape);
        expect(pair).toHaveLength(2);
        const [one, two] = pair.map((question) => question.friend);
        expect(one.color).not.toBe(two.color);
        expect(new Set([one.size, two.size])).toEqual(new Set(['big', 'small']));
        expect(pair[0].doors[pair[0].answer]).toEqual(pair[1].doors[pair[1].answer]);
      }
    }
  });

  it('only ever uses shape doors', () => {
    const kinds = manyRounds(4).flatMap((round) => round.questions.flatMap((question) => question.doors.map((door) => door.kind)));
    expect(new Set(kinds)).toEqual(new Set(['shape']));
  });
});

describe('level 5', () => {
  it('changes the rule once in the middle of the round', () => {
    for (const round of manyRounds(5)) {
      const rules = round.questions.map((question) => question.doors[0].kind);
      expect(rules.slice(0, 3).every((rule) => rule === rules[0])).toBe(true);
      expect(rules.slice(3).every((rule) => rule === rules[3])).toBe(true);
      expect(rules[0]).not.toBe(rules[3]);
    }
  });

  it('asks only for big or small, and offers all three door sizes', () => {
    for (const round of manyRounds(5)) {
      for (const { doors, answer, friend } of round.questions) {
        if (doors[answer].kind !== 'size') continue;
        expect(friend.size).not.toBe('middle');
        expect(new Set(doors.map(doorId)).size).toBe(3);
      }
    }
  });

  it('starts with either rule', () => {
    const firstRules = manyRounds(5).map((round) => round.questions[0].doors[0].kind);
    expect(new Set(firstRules)).toEqual(new Set(['color', 'size']));
  });
});

describe('judgeTap', () => {
  const question = makeRound(1, seeded(1)).questions[0];
  const wrong = (question.answer + 1) % DOORS_PER_QUESTION;

  it('takes the friend home from the right door', () => {
    expect(judgeTap(question, question.answer, 0).home).toBe(true);
  });

  it('gives no hint after one miss', () => {
    expect(judgeTap(question, wrong, 0)).toEqual({ home: false, misses: 1, hint: false });
  });

  it('shows the hint from the second miss on', () => {
    expect(judgeTap(question, wrong, 1)).toEqual({ home: false, misses: 2, hint: true });
    expect(judgeTap(question, wrong, 5).hint).toBe(true);
  });

  it('still takes the friend home after many misses', () => {
    expect(judgeTap(question, question.answer, 9).home).toBe(true);
  });
});
