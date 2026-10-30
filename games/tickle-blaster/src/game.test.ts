import { describe, expect, it } from 'vitest';
import { advance, BOSS_AT, createGame, fieldFor, resultOf, setField, setPush, setTarget, TICK, type Field, type Game, type GameEvent } from './game.ts';
import { LEVEL_IDS, SPEED_IDS, type LevelId, type SpeedId } from './levels.ts';
import type { Surprises } from './waves.ts';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NO_SURPRISES: Surprises = { golden: null, cat: null, sneeze: false };
/** The real play area on a 390x844 phone, as the page measures it below the top bar. */
const PHONE: Field = fieldFor(390, 776);
const WIDE: Field = { w: 150, h: 86 };
const STEP = 0.05;

type Bot = (game: Game) => void;

const idle: Bot = () => {};

/** A keen child: chases the nearest grumpy alien, and goes for falling power-ups. */
const keen: Bot = (game) => {
  const drop = game.drops[0];
  const star = game.bits.filter((bit) => bit.y > 0.45).sort((a, b) => b.y - a.y)[0];
  const grumpy = game.aliens.filter((alien) => alien.laughing < 0 && alien.y > 0 && alien.x > 0 && alien.x < 1);
  const nearest = grumpy.sort((a, b) => Math.abs(a.x - game.ship.x) - Math.abs(b.x - game.ship.x))[0];
  if (drop && drop.y > 0.6) setTarget(game, drop.x);
  else if (star) setTarget(game, star.x);
  else if (nearest) setTarget(game, nearest.x);
};

/** A small child sliding back and forth without looking. */
const sweep: Bot = (game) => setTarget(game, 0.5 + 0.45 * Math.sin(game.clock * 1.5));

function play(game: Game, bot: Bot): GameEvent[] {
  const events: GameEvent[] = [];
  for (let t = 0; t < 200 && game.phase !== 'finished'; t += STEP) {
    bot(game);
    events.push(...advance(game, STEP));
  }
  return events;
}

function count(events: GameEvent[], type: GameEvent['type']): number {
  return events.filter((event) => event.type === type).length;
}

function runUntil(game: Game, seconds: number, bot: Bot = idle): GameEvent[] {
  const events: GameEvent[] = [];
  while (game.clock < seconds && game.phase !== 'finished') {
    bot(game);
    events.push(...advance(game, STEP));
  }
  return events;
}

describe('a whole level', () => {
  for (const level of LEVEL_IDS) {
    for (const speed of SPEED_IDS) {
      it(`${level} on ${speed} lasts 60 to 90 seconds and always ends`, () => {
        for (const bot of [idle, keen, sweep]) {
          for (const field of [PHONE, WIDE]) {
            const game = createGame(level, speed, seeded(7), field);
            play(game, bot);
            expect(game.phase).toBe('finished');
            expect(game.clock).toBeGreaterThanOrEqual(60);
            expect(game.clock).toBeLessThanOrEqual(90);
          }
        }
      });
    }
  }

  it('gives a child who does nothing at all a finish, a score and a star', () => {
    const game = createGame('moon', 'easy', seeded(1), PHONE, NO_SURPRISES);
    const events = play(game, idle);
    expect(count(events, 'highFive')).toBe(1);
    expect(count(events, 'finish')).toBe(1);
    expect(game.score).toBeGreaterThan(0);
    expect(resultOf(game).stars).toBeGreaterThanOrEqual(1);
  });

  it('lets a keen child earn 3 stars on Easy on any screen', () => {
    for (const level of LEVEL_IDS) {
      for (const field of [PHONE, WIDE]) {
        const game = createGame(level, 'easy', seeded(3), field);
        play(game, keen);
        expect(resultOf(game).stars).toBe(3);
      }
    }
  });

  it('plays the same at any frame rate', () => {
    const final = (frames: number[]) => {
      const game = createGame('candy', 'wild', seeded(21), PHONE);
      setTarget(game, 0.3);
      for (let i = 0; game.phase !== 'finished'; i++) advance(game, frames[i % frames.length]);
      return { score: game.score, tickled: game.tickled, clock: game.clock };
    };
    const smooth = final([1 / 60]);
    expect(final([1 / 30])).toEqual(smooth);
    expect(final([1 / 144])).toEqual(smooth);
    expect(final([0.004, 0.05, 0.016, 0.1, 0.03])).toEqual(smooth);
  });

  it('stays the same game after a screen turns mid-level', () => {
    const game = createGame('ice', 'fast', seeded(4), PHONE, NO_SURPRISES);
    runUntil(game, 20, keen);
    setField(game, WIDE);
    expect(game.ship.y).toBeGreaterThan(0.7);
    expect(game.ship.y).toBeLessThan(1);
    play(game, keen);
    expect(game.phase).toBe('finished');
  });
});

describe('playing beats sitting still', () => {
  const FIELDS: [string, Field][] = [
    ['portrait', PHONE],
    ['tablet', { w: 82, h: 100 }],
    ['landscape', WIDE],
    ['phone on its side', { w: 150, h: 57 }],
  ];
  const SEEDS = [1, 2, 3, 4];

  function rounds(speed: SpeedId, field: Field, bot: Bot): { score: number; stars: number; most: number; longest: number } {
    let score = 0;
    let stars = 0;
    let most = 0;
    let longest = 0;
    for (const level of LEVEL_IDS) {
      for (const seed of SEEDS) {
        const game = createGame(level, speed, seeded(seed * 13), field);
        play(game, bot);
        const earned = resultOf(game).stars;
        score += game.score;
        stars += earned;
        most = Math.max(most, earned);
        longest = Math.max(longest, game.clock);
      }
    }
    const games = LEVEL_IDS.length * SEEDS.length;
    return { score: score / games, stars: stars / games, most, longest };
  }

  const parkedAt = (x: number): Bot => (game) => setTarget(game, x);

  for (const speed of SPEED_IDS) {
    for (const [name, field] of FIELDS) {
      it(`${speed} on ${name}: chasing beats sliding beats parking anywhere`, () => {
        const chasing = rounds(speed, field, keen);
        const sliding = rounds(speed, field, sweep);
        expect(chasing.score).toBeGreaterThan(sliding.score);
        for (const x of [0.5, 0.25, 0.75, 0.05]) {
          const parked = rounds(speed, field, parkedAt(x));
          expect(sliding.score).toBeGreaterThan(parked.score);
          expect(sliding.stars).toBeGreaterThan(parked.stars);
          expect(parked.most).toBeLessThan(3);
          expect(parked.longest).toBeLessThanOrEqual(90);
        }
      });
    }
  }

  // Averages hid Moon Base once, so every planet and speed answers for itself, with the page's real size and frame step.
  for (const level of LEVEL_IDS) {
    for (const speed of SPEED_IDS) {
      it(`${level} on ${speed}: no touch at all earns exactly 1 star, far below sliding`, () => {
        const random = seeded(level.length * 101 + speed.length);
        for (let run = 0; run < 25; run++) {
          const parked = createGame(level, speed, random, PHONE);
          while (parked.phase !== 'finished') advance(parked, 1 / 60);
          const sliding = createGame(level, speed, random, PHONE);
          play(sliding, sweep);
          expect(resultOf(parked).stars).toBe(1);
          expect(sliding.score).toBeGreaterThan(parked.score * 2);
        }
      });
    }
  }

  it('stays generous on Easy for a child who just slides around', () => {
    for (const [, field] of FIELDS) expect(rounds('easy', field, sweep).stars).toBeGreaterThanOrEqual(2.4);
  });

  it('keeps 3 stars on harder speeds for attentive play', () => {
    for (const speed of ['fast', 'wild'] as const) {
      for (const [, field] of FIELDS) {
        expect(rounds(speed, field, keen).stars).toBeGreaterThanOrEqual(2.9);
        expect(rounds(speed, field, sweep).stars).toBeLessThan(2.6);
        // Racing from side to side without looking is still not attentive play.
        const frantic: Bot = (game) => setTarget(game, 0.5 + 0.45 * Math.sin(game.clock * 4));
        expect(rounds(speed, field, frantic).stars).toBeLessThan(2.6);
      }
    }
  });
});

describe('the ship', () => {
  it('slides to where the finger is, a side at a time', () => {
    const game = createGame('moon', 'easy', seeded(2));
    setTarget(game, 0.9);
    advance(game, 0.1);
    expect(game.ship.x).toBeGreaterThan(0.55);
    expect(game.ship.x).toBeLessThan(0.9);
    advance(game, 1);
    expect(game.ship.x).toBeCloseTo(0.9);
  });

  it('stays on the screen', () => {
    const game = createGame('moon', 'easy', seeded(2));
    setTarget(game, 7);
    advance(game, 1);
    expect(game.ship.x).toBe(1);
    setPush(game, -1);
    advance(game, 2);
    expect(game.ship.x).toBe(0);
    setPush(game, 0);
    const parked = game.ship.x;
    advance(game, 0.5);
    expect(game.ship.x).toBe(parked);
  });

  it('fires by itself from the very start, feathers and bubbles in turn', () => {
    const game = createGame('moon', 'easy', seeded(2));
    const events = advance(game, 1.1);
    const shots = events.filter((event) => event.type === 'shot');
    expect(shots.length).toBeGreaterThanOrEqual(5);
    expect(new Set(shots.map((shot) => shot.kind))).toEqual(new Set(['feather', 'bubble']));
  });
});

describe('tickling', () => {
  it('turns a grumpy alien into a laughing one that floats off, and never removes it by force', () => {
    const game = createGame('moon', 'easy', seeded(8), PHONE, NO_SURPRISES);
    const events: GameEvent[] = [];
    while (!events.some((event) => event.type === 'tickle') && game.clock < 30) {
      keen(game);
      events.push(...advance(game, STEP));
    }
    const laughing = game.aliens.find((alien) => alien.laughing >= 0);
    expect(laughing).toBeDefined();
    const y = laughing!.y;
    advance(game, 0.5);
    expect(laughing!.y).toBeLessThan(y);
    expect(game.bits.length + count(events, 'star')).toBeGreaterThan(0);
  });

  it('raises the combo, and a pause only lets it fade quietly', () => {
    const game = createGame('moon', 'easy', seeded(8), PHONE, NO_SURPRISES);
    runUntil(game, 30, keen);
    expect(game.bestCombo).toBeGreaterThanOrEqual(5);
    game.aliens = [];
    game.spawns = [];
    const meter = game.meter;
    advance(game, 3);
    expect(game.combo).toBe(0);
    expect(game.meter).toBeGreaterThanOrEqual(meter > 0.99 ? 0 : meter);
  });

  it('fills the laugh meter into a Tickle Storm that tickles the whole screen', () => {
    const game = createGame('moon', 'fast', seeded(6), PHONE, NO_SURPRISES);
    const events = runUntil(game, BOSS_AT, keen);
    expect(count(events, 'storm')).toBeGreaterThanOrEqual(1);
    expect(events.filter((event) => event.type === 'tickle' && event.storm).length).toBeGreaterThan(0);
  });

  it('empties the meter once the storm has passed', () => {
    const game = createGame('moon', 'fast', seeded(6), PHONE, NO_SURPRISES);
    game.meter = 0.99;
    game.spawns = [{ at: 0, pattern: 'vee', slot: 0.5, side: 1, seconds: 8, kind: 'puff', tickles: 1, center: 0.5, width: 0.5, goo: [] }];
    game.total = 1;
    const events = runUntil(game, 8);
    expect(count(events, 'storm')).toBe(1);
    expect(count(events, 'stormEnd')).toBe(1);
    expect(game.meter).toBe(0);
  });

  it('needs two tickles for a tough alien', () => {
    const game = createGame('moon', 'fast', seeded(6), PHONE, NO_SURPRISES);
    game.spawns = [{ at: 0, pattern: 'vee', slot: 0.5, side: 1, seconds: 12, kind: 'puff', tickles: 2, center: 0.5, width: 0.5, goo: [] }];
    game.total = 1;
    const events = runUntil(game, 6);
    expect(count(events, 'nudge')).toBe(1);
    expect(count(events, 'tickle')).toBe(1);
  });
});

describe('goo', () => {
  function goo(game: Game): void {
    game.goos.push({ x: game.ship.x, y: game.ship.y, vx: 0, age: 0 });
  }

  it('makes the ship wobble and fire slower for a couple of seconds, and that is all', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    const shotsIn = (seconds: number) => count(advance(game, seconds), 'shot');
    const before = shotsIn(2);
    const { score, meter, combo } = game;
    goo(game);
    const events = advance(game, TICK * 2);
    expect(count(events, 'goo')).toBe(1);
    expect(game.ship.goo).toBeGreaterThan(1.5);
    expect(shotsIn(2)).toBeLessThan(before);
    expect(game.score).toBeGreaterThanOrEqual(score);
    expect(game.meter).toBeGreaterThanOrEqual(meter);
    expect(game.combo).toBeGreaterThanOrEqual(combo);
    advance(game, 1);
    expect(game.ship.goo).toBe(0);
    expect(shotsIn(2)).toBe(before);
  });

  it('gives a moment of grace, so one wobble never turns into two', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    goo(game);
    advance(game, TICK * 2);
    goo(game);
    expect(count(advance(game, TICK * 2), 'goo')).toBe(0);
  });

  it('only comes from silly aliens', () => {
    for (const level of LEVEL_IDS) {
      const game = createGame(level, 'wild', seeded(13), PHONE, NO_SURPRISES);
      const silly = game.spawns.filter((spawn) => spawn.kind === 'goober').length;
      expect(count(play(game, idle), 'gooDrop')).toBeLessThanOrEqual(silly * 2);
    }
  });
});

describe('power-ups', () => {
  function give(game: Game, power: Game['drops'][number]['power']): GameEvent[] {
    game.powersGiven = 99;
    game.drops.push({ power, x: game.ship.x, y: game.ship.y, vx: 0, age: 0 });
    return advance(game, TICK * 2);
  }

  it('hands out all four kinds in a level', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    const events = play(game, keen);
    const powers = new Set(events.flatMap((event) => (event.type === 'power' ? [event.power] : [])));
    expect(powers.size).toBe(4);
  });

  it('triple feathers fire three at once and then wear off', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    give(game, 'triple');
    expect(count(advance(game, 1), 'shot')).toBeGreaterThanOrEqual(12);
    advance(game, 8);
    expect(game.ship.triple).toBe(0);
  });

  it('the helper ship fires too, beside the ship, on the screen', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    setTarget(game, 1);
    advance(game, 1);
    give(game, 'helper');
    const shots = advance(game, 1).filter((event) => event.type === 'shot');
    expect(shots.length).toBeGreaterThanOrEqual(8);
    expect(game.shots.every((shot) => shot.x < 1.05)).toBe(true);
  });

  it('the magnet pulls stars in from anywhere', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    game.bits.push({ x: 0.1, y: 0.1, vx: 0, age: 0 });
    give(game, 'magnet');
    const events = advance(game, 3);
    expect(count(events, 'star')).toBe(1);
  });

  it('the wide giggle wave tickles everyone on screen as it rises', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, NO_SURPRISES);
    runUntil(game, 4);
    const grumpy = game.aliens.filter((alien) => alien.laughing < 0 && alien.y > 0.05 && alien.x > 0 && alien.x < 1).length;
    expect(grumpy).toBeGreaterThan(0);
    const events = give(game, 'wave');
    events.push(...advance(game, 1.5));
    expect(count(events, 'tickle')).toBeGreaterThanOrEqual(grumpy);
  });
});

describe('the boss', () => {
  function bossed(speed: SpeedId = 'easy', level: LevelId = 'moon', surprises = NO_SURPRISES): { game: Game; events: GameEvent[] } {
    const game = createGame(level, speed, seeded(10), PHONE, surprises);
    const events = runUntil(game, BOSS_AT + 0.1);
    return { game, events };
  }

  it('arrives after the waves', () => {
    const { game, events } = bossed();
    expect(count(events, 'bossComing')).toBe(1);
    expect(game.phase).toBe('boss');
    expect(game.boss?.kind).toBe('bossMoon');
  });

  it('cracks up in stages, slowly, then gives a high five', () => {
    const { game } = bossed();
    const start = game.clock;
    const events = play(game, idle);
    const order = events
      .filter((event) => ['bossGiggle', 'bossDone', 'highFive', 'finish'].includes(event.type))
      .map((event) => event.type);
    expect(order).toEqual(['bossGiggle', 'bossGiggle', 'bossDone', 'highFive', 'finish']);
    expect(game.clock - start).toBeGreaterThan(12);
  });

  it('only laughs when it is tickled', () => {
    const { game } = bossed();
    game.ship.fireIn = 1000;
    advance(game, 30);
    expect(game.boss!.laugh).toBe(0);
    expect(game.phase).toBe('boss');
  });

  it('comes over to a ship that is stuck in a corner', () => {
    const game = createGame('moon', 'wild', seeded(10), WIDE, NO_SURPRISES);
    runUntil(game, BOSS_AT + 0.1);
    setTarget(game, 0);
    advance(game, 1.5);
    game.ship.fireIn = 1000;
    advance(game, 5);
    expect(game.boss!.x).toBeLessThan(0.15);
  });

  it('cannot be rushed, even by a storm', () => {
    const { game } = bossed('easy');
    game.ship.triple = 60;
    game.ship.helper = 60;
    game.meter = 0.99;
    advance(game, 9);
    expect(game.boss!.laugh).toBeLessThan(1);
    expect(game.phase).toBe('boss');
  });

  it('is tickled on a wide screen by a ship that never moves', () => {
    const game = createGame('moon', 'easy', seeded(10), WIDE, NO_SURPRISES);
    const events = play(game, idle);
    expect(count(events, 'bossHit')).toBeGreaterThanOrEqual(30);
  });

  it('stops the ship shooting and flies it up for the high five', () => {
    const { game } = bossed();
    const before = game.ship.y;
    while (game.phase === 'boss') advance(game, STEP);
    const events = advance(game, 1.5);
    expect(count(events, 'shot')).toBe(0);
    expect(game.ship.y).toBeLessThan(before);
    expect(game.ship.x).toBeCloseTo(0.5, 0);
  });
});

describe('rare surprises', () => {
  it('a golden alien zips across and is worth a lot', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, { golden: 3, cat: null, sneeze: false });
    const events = runUntil(game, 3.2);
    expect(count(events, 'golden')).toBe(1);
    const golden = game.aliens.find((alien) => alien.spawn.kind === 'goldie');
    expect(golden).toBeDefined();
    runUntil(game, 7);
    expect(game.aliens.some((alien) => alien.spawn.kind === 'goldie' && alien.laughing < 0)).toBe(false);
  });

  it('does not count surprise guests against the stars', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, { golden: 3, cat: 4, sneeze: true });
    const planned = game.spawns.length;
    play(game, keen);
    expect(game.total).toBe(planned);
    expect(game.tickled).toBeLessThanOrEqual(planned);
  });

  it('the space cat shares its stars with everyone, tickled or not', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, { golden: null, cat: 3, sneeze: false });
    const events = runUntil(game, 7);
    expect(count(events, 'cat')).toBe(1);
    expect(game.bits.length).toBeGreaterThanOrEqual(4);
    runUntil(game, 12);
    expect(game.cat).toBeNull();
  });

  it('a boss can sneeze out little aliens, once', () => {
    const game = createGame('moon', 'easy', seeded(2), PHONE, { golden: null, cat: null, sneeze: true });
    const events = play(game, idle);
    expect(count(events, 'sneeze')).toBe(1);
    expect(events.filter((event) => event.type === 'tickle' && event.kind === 'achoo').length).toBeGreaterThanOrEqual(0);
  });
});

describe('stars', () => {
  it('always gives at least one and at most three', () => {
    const game = createGame('sleepy', 'wild', seeded(1), PHONE, NO_SURPRISES);
    game.total = 100;
    for (const [tickled, caught, stars] of [
      [0, 0, 1],
      [50, 30, 1],
      [80, 40, 2],
      [100, 60, 2],
      [100, 75, 3],
    ] as const) {
      game.tickled = tickled;
      game.caught = caught;
      expect(resultOf(game).stars).toBe(stars);
    }
  });
});
