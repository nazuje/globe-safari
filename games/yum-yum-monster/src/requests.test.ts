import { describe, expect, it } from 'vitest';
import { COLORS, FOODS, foodById } from './foods.ts';
import { FOOD_WORDS } from './lang/en.ts';
import {
  countsForLevel,
  countWord,
  LEVELS,
  makeRequests,
  PLATE_SIZE,
  requestLine,
  REQUESTS_PER_ROUND,
  shuffle,
} from './requests.ts';
import type { Level, Rng } from './requests.ts';

/** A small repeatable random source, so a failure can be replayed. */
function seeded(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

function everyRound(run: (level: Level, rng: Rng) => void): void {
  for (const level of LEVELS) for (const seed of SEEDS) run(level, seeded(seed));
}

describe('foods', () => {
  it('names only the colors a food really is', () => {
    const colorOf = Object.fromEntries(FOODS.filter((food) => food.color).map((food) => [food.id, food.color]));
    expect(colorOf).toMatchObject({ apple: 'red', banana: 'yellow', pear: 'green', carrot: 'orange', grapes: 'purple' });
  });

  it('has no duplicate ids or emoji', () => {
    expect(new Set(FOODS.map((food) => food.id)).size).toBe(FOODS.length);
    expect(new Set(FOODS.map((food) => food.emoji)).size).toBe(FOODS.length);
  });

  it('has food for every color', () => {
    for (const color of COLORS) expect(FOODS.some((food) => food.color === color)).toBe(true);
  });
});

describe('makeRequests, on every level', () => {
  it('makes a game of five requests', () => {
    everyRound((level, rng) => expect(makeRequests(level, rng)).toHaveLength(REQUESTS_PER_ROUND));
  });

  it('is never impossible: the right food is on the plate, and there is enough of it', () => {
    everyRound((level, rng) => {
      for (const request of makeRequests(level, rng)) {
        const right = request.plate.filter((item) => item.foodId === request.correctId);
        expect(right).toHaveLength(1);
        expect(right[0]!.stock).toBeGreaterThanOrEqual(request.count);
      }
    });
  });

  it('puts three different foods on the plate, each with something to tap', () => {
    everyRound((level, rng) => {
      for (const { plate } of makeRequests(level, rng)) {
        expect(plate).toHaveLength(PLATE_SIZE);
        expect(new Set(plate.map((item) => item.foodId)).size).toBe(PLATE_SIZE);
        for (const item of plate) expect(item.stock).toBeGreaterThanOrEqual(1);
      }
    });
  });

  it('keeps a pile small enough to draw', () => {
    everyRound((level, rng) => {
      for (const { plate } of makeRequests(level, rng)) {
        for (const item of plate) expect(item.stock).toBeLessThanOrEqual(11);
      }
    });
  });

  it('never asks for the same food twice in a game', () => {
    everyRound((level, rng) => {
      const wanted = makeRequests(level, rng).map((request) => request.correctId);
      expect(new Set(wanted).size).toBe(wanted.length);
    });
  });

  it('moves the right answer to a new spot each time', () => {
    everyRound((level, rng) => {
      const spots = makeRequests(level, rng).map((request) =>
        request.plate.findIndex((item) => item.foodId === request.correctId),
      );
      spots.forEach((spot, i) => {
        if (i > 0) expect(spot).not.toBe(spots[i - 1]);
      });
    });
  });

  it('keeps spoken lines to 2 to 7 short words', () => {
    everyRound((level, rng) => {
      for (const request of makeRequests(level, rng)) {
        const line = requestLine(request);
        expect(line.split(' ').length).toBeGreaterThanOrEqual(2);
        expect(line.split(' ').length).toBeLessThanOrEqual(7);
      }
    });
  });

  it('survives a random source stuck at either end', () => {
    for (const level of LEVELS) {
      for (const stuck of [0, 0.999]) {
        const requests = makeRequests(level, () => stuck);
        expect(requests).toHaveLength(REQUESTS_PER_ROUND);
        for (const request of requests) {
          expect(request.plate.some((item) => item.foodId === request.correctId)).toBe(true);
        }
      }
    }
  });
});

describe('level 1: name a food', () => {
  it('asks for one food by name, out of three', () => {
    for (const seed of SEEDS) {
      for (const request of makeRequests(1, seeded(seed))) {
        expect(request.kind).toBe('name');
        expect(request.count).toBe(1);
        expect(requestLine(request).toLowerCase()).toContain(FOOD_WORDS[request.correctId as keyof typeof FOOD_WORDS].a);
      }
    }
  });
});

describe('level 2: colors', () => {
  it('has exactly one food of the asked color on the plate, and only real colors', () => {
    for (const seed of SEEDS) {
      for (const request of makeRequests(2, seeded(seed))) {
        const colors = request.plate.map((item) => foodById(item.foodId).color);
        expect(colors).not.toContain(undefined);
        expect(colors.filter((color) => color === request.color)).toHaveLength(1);
        expect(foodById(request.correctId).color).toBe(request.color);
        expect(requestLine(request)).toContain(request.color);
      }
    }
  });

  it('asks for five different colors', () => {
    for (const seed of SEEDS) {
      const asked = makeRequests(2, seeded(seed)).map((request) => request.color);
      expect(new Set(asked).size).toBe(REQUESTS_PER_ROUND);
    }
  });
});

describe('levels 3 to 5: counting', () => {
  const RANGES = [
    [3, 1, 3],
    [4, 1, 5],
    [5, 6, 10],
  ] as const;

  it.each(RANGES)('level %i stays in range and ends on the biggest number', (level, low, high) => {
    for (const seed of SEEDS) {
      const counts = makeRequests(level, seeded(seed)).map((request) => request.count);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(low);
      expect(Math.max(...counts)).toBe(high);
      expect(counts.at(-1)).toBe(high);
    }
  });

  it('never asks to count something that is not one thing, like a bunch of grapes', () => {
    for (const level of [3, 4, 5] as const) {
      for (const seed of SEEDS) {
        for (const { plate } of makeRequests(level, seeded(seed))) {
          for (const item of plate) expect(foodById(item.foodId).countable).toBe(true);
        }
      }
    }
  });

  it('says the number and the right word', () => {
    const lines = SEEDS.flatMap((seed) => makeRequests(3, seeded(seed))).map((request) => ({
      request,
      food: FOOD_WORDS[request.correctId as keyof typeof FOOD_WORDS],
    }));
    for (const { request, food } of lines) {
      const word = countWord(request.count).replace('!', '').toLowerCase();
      expect(requestLine(request).toLowerCase()).toContain(`${word} ${request.count === 1 ? food.one : food.many}`);
    }
  });

  it('never asks for the same count twice in a row', () => {
    for (const level of [3, 4, 5] as const) {
      for (const seed of SEEDS) {
        const counts = countsForLevel(level, seeded(seed));
        counts.forEach((count, i) => {
          if (i > 0) expect(count).not.toBe(counts[i - 1]);
        });
      }
    }
  });
});

describe('helpers', () => {
  it('counts out loud in words', () => {
    expect(countWord(1)).toBe('One!');
    expect(countWord(10)).toBe('Ten!');
  });

  it('shuffle keeps every item and leaves the original alone', () => {
    const items = [1, 2, 3, 4, 5];
    const mixed = shuffle(items, seeded(7));
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect([...mixed].sort()).toEqual(items);
  });
});
