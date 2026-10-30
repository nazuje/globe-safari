import { describe, expect, it } from 'vitest';
import type { Animal } from './animals.ts';
import { ANIMALS } from './animals.ts';
import {
  buildDeck,
  endPeek,
  flipCard,
  leader,
  matchLine,
  newGame,
  shuffle,
  turnLine,
  winnerLine,
  type GameState,
} from './game.ts';

/** A repeatable random: a small linear congruential generator. */
function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const LION = ANIMALS[0];
const TIGER = ANIMALS[1];

/** A two-player game with a known layout: L T L T. */
function knownGame(cards: readonly Animal[] = [LION, TIGER, LION, TIGER], players = 2): GameState {
  return { ...newGame(1, players, ANIMALS), cards };
}

function flipAll(game: GameState, ...indexes: number[]): GameState {
  return indexes.reduce((state, index) => flipCard(state, index).game, game);
}

describe('shuffle', () => {
  it('keeps every item and leaves the input alone', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const mixed = shuffle(items, seeded(1));
    expect([...mixed].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('gives the same order for the same random', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)));
  });

  it('gives different orders for different randoms', () => {
    const items = [...Array(20).keys()];
    expect(shuffle(items, seeded(1))).not.toEqual(shuffle(items, seeded(2)));
  });

  it('copes with a random right at the top of its range', () => {
    expect(shuffle([1, 2, 3], () => 0.999999).sort()).toEqual([1, 2, 3]);
  });
});

describe('buildDeck', () => {
  it.each([6, 8, 12])('makes exactly two of each of %i animals', (pairs) => {
    const deck = buildDeck(pairs, ANIMALS, seeded(3));
    expect(deck).toHaveLength(pairs * 2);
    const counts = new Map<Animal, number>();
    for (const animal of deck) counts.set(animal, (counts.get(animal) ?? 0) + 1);
    expect(counts.size).toBe(pairs);
    expect([...counts.values()].every((count) => count === 2)).toBe(true);
  });

  it('picks different animals from game to game', () => {
    expect(new Set(buildDeck(6, ANIMALS, seeded(1)))).not.toEqual(new Set(buildDeck(6, ANIMALS, seeded(2))));
  });

  it('refuses more pairs than there are animals', () => {
    expect(() => buildDeck(3, ANIMALS.slice(0, 2))).toThrow();
  });
});

describe('flipCard', () => {
  it('turns up the first card and counts the flip', () => {
    const { game, event } = flipCard(knownGame(), 0);
    expect(event).toBe('first');
    expect(game.faceUp).toEqual([0]);
    expect(game.flips).toBe(1);
  });

  it('a match gives a star, keeps both up, and the same player goes again', () => {
    const { game, event } = flipCard(flipAll(knownGame(), 0), 2);
    expect(event).toBe('match');
    expect(game.matched).toEqual([0, 2]);
    expect(game.faceUp).toEqual([]);
    expect(game.stars).toEqual([1, 0]);
    expect(game.current).toBe(0);
    expect(game.phase).toBe('picking');
  });

  it('a miss leaves both showing and gives no star', () => {
    const { game, event } = flipCard(flipAll(knownGame(), 0), 1);
    expect(event).toBe('miss');
    expect(game.faceUp).toEqual([0, 1]);
    expect(game.stars).toEqual([0, 0]);
    expect(game.phase).toBe('peeking');
  });

  it('ignores the same card tapped twice, and does not count it', () => {
    const start = flipAll(knownGame(), 0);
    const { game, event } = flipCard(start, 0);
    expect(event).toBe('ignored');
    expect(game).toBe(start);
  });

  it('ignores a card that is already matched', () => {
    const start = flipAll(knownGame(), 0, 2);
    expect(flipCard(start, 0).event).toBe('ignored');
  });

  it('ignores every tap while a missed pair is showing', () => {
    const start = flipAll(knownGame(), 0, 1);
    expect(flipCard(start, 2).event).toBe('ignored');
  });

  it('ignores positions off the board', () => {
    expect(flipCard(knownGame(), -1).event).toBe('ignored');
    expect(flipCard(knownGame(), 4).event).toBe('ignored');
  });

  it('finishes on the last pair', () => {
    const { game, event } = flipCard(flipAll(knownGame(), 0, 2, 1), 3);
    expect(event).toBe('finished');
    expect(game.phase).toBe('finished');
    expect(game.stars).toEqual([2, 0]);
    expect(game.flips).toBe(4);
    expect(flipCard(game, 0).event).toBe('ignored');
  });
});

describe('endPeek', () => {
  it('turns the pair back and passes the turn', () => {
    const game = endPeek(flipAll(knownGame(), 0, 1));
    expect(game.faceUp).toEqual([]);
    expect(game.current).toBe(1);
    expect(game.phase).toBe('picking');
  });

  it('passes the turn back again', () => {
    const game = endPeek(flipAll(endPeek(flipAll(knownGame(), 0, 1)), 0, 1));
    expect(game.current).toBe(0);
  });

  it('keeps the same player in a solo game', () => {
    const game = endPeek(flipAll(knownGame(undefined, 1), 0, 1));
    expect(game.current).toBe(0);
  });

  it('does nothing unless a pair is showing', () => {
    const start = knownGame();
    expect(endPeek(start)).toBe(start);
  });

  it('keeps counting flips across turns', () => {
    const game = flipAll(endPeek(flipAll(knownGame(), 0, 1)), 2);
    expect(game.flips).toBe(3);
  });

  it('gives stars to whoever made the match after the turn passes', () => {
    const game = flipAll(endPeek(flipAll(knownGame(), 0, 1)), 0, 2);
    expect(game.stars).toEqual([0, 1]);
    expect(game.current).toBe(1);
  });
});

describe('winner', () => {
  it('finds the leader, or null when level', () => {
    expect(leader([5, 3])).toBe(0);
    expect(leader([2, 6])).toBe(1);
    expect(leader([4, 4])).toBeNull();
    expect(leader([0, 0])).toBeNull();
  });

  it('says who found the most, and ties are a shared win', () => {
    expect(winnerLine(['Kid', 'Grown-up'], [2, 4])).toBe('Grown-up found the most!');
    expect(winnerLine(['Kid', 'Grown-up'], [3, 3])).toBe('You both win!');
  });
});

describe('spoken lines', () => {
  it('uses real plurals', () => {
    const named = (name: string): Animal => ANIMALS.find((animal) => animal.name === name) as Animal;
    expect(matchLine(LION, false)).toBe('Two lions!');
    expect(matchLine(named('Mouse'), false)).toBe('Two mice!');
    expect(matchLine(named('Sheep'), false)).toBe('Two sheep!');
    expect(matchLine(named('Wolf'), true)).toBe('Two wolves! Go again!');
  });

  it('names the player whose turn it is', () => {
    expect(turnLine('Grown-up')).toBe("Grown-up's turn!");
  });
});

describe('the animal pool', () => {
  it('has at least 24 distinct animals', () => {
    expect(ANIMALS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(ANIMALS.map((animal) => animal.emoji)).size).toBe(ANIMALS.length);
    expect(new Set(ANIMALS.map((animal) => animal.name)).size).toBe(ANIMALS.length);
  });
});

describe('a whole game', () => {
  it('always ends with every pair found and all stars handed out', () => {
    for (let seed = 1; seed < 30; seed++) {
      const random = seeded(seed);
      let game = newGame(12, 2, ANIMALS, random);
      let guard = 0;
      while (game.phase !== 'finished' && guard++ < 10000) {
        const hidden = game.cards.map((_, index) => index).filter((index) => !game.matched.includes(index));
        const pick = hidden[Math.floor(random() * hidden.length)];
        game = endPeek(flipCard(game, pick).game);
      }
      expect(game.phase).toBe('finished');
      expect(game.stars[0] + game.stars[1]).toBe(12);
    }
  });
});
