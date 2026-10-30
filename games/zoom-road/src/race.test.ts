import { describe, expect, it } from 'vitest';
import { SPEED_IDS, type Item, type ObstacleKind, type Rng } from './course.ts';
import { advance, COUNTDOWN, createRace, GIANT_STARS, steer, type Race, type RaceEvent } from './race.ts';

const KINDS: ObstacleKind[] = ['cow', 'puddle', 'hay', 'duck', 'cone'];

function seeded(seed: number): Rng {
  // Small seeds would all start alike, so spread them out first.
  let state = (seed * 2654435761) % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function emptyRace(items: Item[] = []): Race {
  const race = createRace('slow', KINDS, seeded(1));
  race.items = items;
  return race;
}

function pastCountdown(race: Race): void {
  advance(race, COUNTDOWN + 0.05);
}

/** Runs frame by frame until something happens, returning everything that did. */
function runUntil(race: Race, type: RaceEvent['type']): RaceEvent[] {
  const events: RaceEvent[] = [];
  for (let frame = 0; frame < 3000 && !events.some((event) => event.type === type); frame++) {
    events.push(...advance(race, 1 / 60));
  }
  return events;
}

function runToEnd(race: Race, onFrame: (race: Race) => void = () => {}): { seconds: number; events: RaceEvent[] } {
  pastCountdown(race);
  const events: RaceEvent[] = [];
  let seconds = 0;
  while (race.phase !== 'finished' && seconds < 300) {
    onFrame(race);
    events.push(...advance(race, 1 / 60));
    seconds += 1 / 60;
  }
  return { seconds, events };
}

/** Steers straight at the nearest obstacle ahead: the bumpiest race a child can have. */
function chaseObstacles(race: Race): void {
  const next = race.items.find((item) => item.kind === 'obstacle' && item.at > race.position);
  if (!next || race.lane === next.lane) return;
  steer(race, next.lane < race.lane ? -1 : 1);
}

/** Steers away from anything in the way. */
function dodgeObstacles(race: Race): void {
  const next = race.items.find((item) => item.kind === 'obstacle' && item.at > race.position && item.at - race.position < 3);
  if (!next || race.lane !== next.lane) return;
  const free = race.items.filter((item) => item.kind === 'obstacle' && item.at === next.at).map((item) => item.lane);
  const open = [0, 1, 2].find((lane) => !free.includes(lane)) ?? 1;
  steer(race, open < race.lane ? -1 : 1);
}

describe('steering', () => {
  it('moves one lane at a time and stops at the edges', () => {
    const race = emptyRace();
    expect(steer(race, -1)).toBe('moved');
    expect(race.lane).toBe(0);
    expect(steer(race, -1)).toBe('edge');
    expect(race.lane).toBe(0);
    steer(race, 1);
    steer(race, 1);
    expect(steer(race, 1)).toBe('edge');
    expect(race.lane).toBe(2);
  });

  it('works during the countdown, so a child can try it straight away', () => {
    const race = emptyRace();
    steer(race, 1);
    advance(race, 0.5);
    expect(race.phase).toBe('countdown');
    expect(race.x).toBe(2);
    expect(race.position).toBe(0);
  });

  it('cancels out when two taps land together on both sides', () => {
    const race = emptyRace();
    steer(race, -1);
    steer(race, 1);
    expect(race.lane).toBe(1);
  });

  it('still works in the middle of a spin', () => {
    const race = emptyRace([{ kind: 'obstacle', lane: 1, at: 1, art: 'cow' }]);
    pastCountdown(race);
    runUntil(race, 'bonk');
    expect(race.spin).toBeGreaterThan(0);
    steer(race, 1);
    advance(race, 0.3);
    expect(race.x).toBe(2);
  });
});

describe('frame rate', () => {
  it('races the same at 30, 60 and 144 frames a second', () => {
    const positions = [30, 60, 144].map((fps) => {
      const race = emptyRace();
      for (let i = 0; i < fps * 8; i++) advance(race, 1 / fps);
      return race.position;
    });
    expect(positions[0]).toBeCloseTo(positions[1]!, 0);
    expect(positions[2]).toBeCloseTo(positions[1]!, 0);
  });
});

describe('race length', () => {
  it('takes 45 to 75 seconds however it goes', () => {
    for (const speed of SPEED_IDS) {
      for (let seed = 1; seed <= 25; seed++) {
        const plans = [undefined, chaseObstacles, dodgeObstacles];
        for (const plan of plans) {
          const { seconds } = runToEnd(createRace(speed, KINDS, seeded(seed)), plan);
          expect(seconds, `${speed} seed ${seed}`).toBeGreaterThanOrEqual(45);
          expect(seconds, `${speed} seed ${seed}`).toBeLessThanOrEqual(75);
        }
      }
    }
  });

  it('always reaches the finish, even with nobody touching the screen', () => {
    const race = createRace('slow', KINDS, seeded(3));
    const { events } = runToEnd(race);
    expect(race.phase).toBe('finished');
    expect(events.filter((event) => event.type === 'finish')).toHaveLength(1);
  });

  it('keeps rolling gently after the finish', () => {
    const race = emptyRace();
    race.position = race.length - 0.01;
    pastCountdown(race);
    advance(race, 5);
    expect(race.phase).toBe('finished');
    expect(race.speed).toBeGreaterThan(0);
  });
});

describe('collecting', () => {
  it('collects a star in the lane, and only there', () => {
    const race = emptyRace([
      { kind: 'star', lane: 1, at: 3, art: '⭐' },
      { kind: 'star', lane: 0, at: 3, art: '⭐' },
    ]);
    pastCountdown(race);
    const events = advance(race, 4);
    expect(race.stars).toBe(1);
    expect(events).toContainEqual({ type: 'star', lane: 1 });
  });

  it('collects every star once, however it is reached', () => {
    const race = emptyRace([{ kind: 'star', lane: 1, at: 3, art: '⭐' }]);
    pastCountdown(race);
    advance(race, 8);
    expect(race.stars).toBe(1);
    expect(race.items).toEqual([]);
  });

  it('counts a treat for more than a star', () => {
    const race = emptyRace([{ kind: 'treat', lane: 1, at: 3, art: '🍩' }]);
    pastCountdown(race);
    const events = advance(race, 4);
    expect(race.stars).toBe(2);
    expect(events).toContainEqual({ type: 'treat', lane: 1, art: '🍩' });
  });
});

describe('bonks', () => {
  const cow = (at: number): Item => ({ kind: 'obstacle', lane: 1, at, art: 'cow' });

  it('spins and slows the ride, then carries on at full speed', () => {
    const race = emptyRace([cow(3)]);
    pastCountdown(race);
    expect(runUntil(race, 'bonk')).toContainEqual({ type: 'bonk', kind: 'cow', lane: 1 });
    expect(race.spin).toBeGreaterThan(0);
    advance(race, 1);
    const slowed = race.speed;
    expect(slowed).toBeLessThan(1.2);
    advance(race, 4);
    expect(race.spin).toBe(0);
    expect(race.speed).toBeGreaterThan(slowed);
    expect(race.speed).toBeGreaterThan(1.95);
  });

  it('takes nothing away', () => {
    const race = emptyRace([{ kind: 'star', lane: 1, at: 2, art: '⭐' }, cow(3)]);
    pastCountdown(race);
    advance(race, 5);
    expect(race.stars).toBe(1);
  });

  it('misses you if you are in another lane', () => {
    const race = emptyRace([cow(3)]);
    steer(race, 1);
    pastCountdown(race);
    expect(advance(race, 5).some((event) => event.type === 'bonk')).toBe(false);
  });

  it('never stacks: a second bump during a spin passes through', () => {
    const race = emptyRace([cow(3), cow(3.3)]);
    pastCountdown(race);
    const events = advance(race, 6);
    expect(events.filter((event) => event.type === 'bonk')).toHaveLength(1);
  });
});

describe('rainbow ramp', () => {
  const ramp: Item = { kind: 'ramp', lane: 1, at: 3, art: 'ramp' };

  it('catches you in any lane and flies over obstacles', () => {
    const race = emptyRace([ramp, { kind: 'obstacle', lane: 0, at: 8, art: 'hay' }]);
    steer(race, -1);
    pastCountdown(race);
    const events = advance(race, 6);
    expect(events).toContainEqual({ type: 'ramp' });
    expect(events.some((event) => event.type === 'bonk')).toBe(false);
  });

  it('showers stars, whichever lane you stay in', () => {
    const race = emptyRace([ramp]);
    steer(race, -1);
    pastCountdown(race);
    const events = advance(race, 9);
    expect(events).toContainEqual({ type: 'land' });
    expect(race.stars).toBeGreaterThan(5);
    expect(race.flight).toBe(0);
  });
});

describe('UFO', () => {
  it('comes over, drops a giant star, and the star always lands with you', () => {
    const race = emptyRace([{ kind: 'ufo', lane: 1, at: 3, art: '🛸' }]);
    steer(race, 1);
    pastCountdown(race);
    const events = advance(race, 12);
    expect(events.map((event) => event.type).filter((type) => ['ufo', 'drop', 'giant'].includes(type))).toEqual([
      'ufo',
      'drop',
      'giant',
    ]);
    expect(race.stars).toBe(GIANT_STARS);
    expect(race.ufo).toBeNull();
  });
});
