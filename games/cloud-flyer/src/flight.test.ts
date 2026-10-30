import { describe, expect, it } from 'vitest';
import { buildCourse, LEVEL_IDS, LEVELS, makeRandom, type Course, type LevelId } from './course.ts';
import {
  flightStars,
  glide,
  newFlight,
  ringNote,
  ringNow,
  ringPoints,
  stepFlight,
  type Flight,
  type FlightEvent,
  type Steer,
} from './flight.ts';

const STEP = 1 / 60;

type Pilot = (flight: Flight) => Steer;

const handsOff: Pilot = () => null;

const aimForRings: Pilot = (flight) => {
  const ring = flight.course.rings[flight.nextRing];
  return ring ? { u: ring.u, v: ring.v } : null;
};

function fly(course: Course, pilot: Pilot, seconds = STEP): { flight: Flight; events: FlightEvent[] } {
  const flight = newFlight(course);
  const events: FlightEvent[] = [];
  for (let frame = 0; frame < 20 / seconds * 10 && flight.phase !== 'landed'; frame += 1) {
    events.push(...stepFlight(flight, pilot(flight), seconds));
  }
  return { flight, events };
}

const courseFor = (id: LevelId, seed = 3): Course => buildCourse(LEVELS[id], seed);

describe('glide', () => {
  it('gives the same answer for one long step as for many short ones', () => {
    const [position, speed] = glide(4, -2, 1, 3, 1);
    let many: [number, number] = [4, -2];
    for (let step = 0; step < 1000; step += 1) many = glide(many[0], many[1], 1, 3, 0.001);
    expect(many[0]).toBeCloseTo(position, 6);
    expect(many[1]).toBeCloseTo(speed, 6);
  });

  it('settles on the target without overshooting', () => {
    let state: [number, number] = [0, 0];
    for (let step = 0; step < 300; step += 1) {
      state = glide(state[0], state[1], 5, 3.4, STEP);
      expect(state[0]).toBeLessThanOrEqual(5.0001);
    }
    expect(state[0]).toBeCloseTo(5, 2);
  });
});

describe('a whole flight', () => {
  it.each(LEVEL_IDS)('on %s lasts 60 to 90 seconds and always lands', (id) => {
    for (let seed = 1; seed < 30; seed += 1) {
      const course = courseFor(id, seed);
      for (const pilot of [handsOff, aimForRings]) {
        const { flight } = fly(course, pilot);
        expect(flight.phase).toBe('landed');
        expect(flight.time).toBeGreaterThan(60);
        expect(flight.time).toBeLessThan(90);
        expect(flight.s).toBeCloseTo(course.length, 3);
      }
    }
  });

  it('is the same flight at 20 frames a second as at 60', () => {
    const course = courseFor('swoopy');
    const smooth = fly(course, aimForRings, 1 / 60).flight;
    const choppy = fly(course, aimForRings, 1 / 20).flight;
    expect(Math.abs(choppy.time - smooth.time)).toBeLessThan(1.5);
    expect(Math.abs(choppy.rings - smooth.rings)).toBeLessThanOrEqual(1);
    expect(Math.abs(choppy.score - smooth.score)).toBeLessThan(smooth.score * 0.1);
  });

  it.each(LEVEL_IDS)('on %s lets a good pilot catch nearly every ring', (id) => {
    for (let seed = 1; seed < 12; seed += 1) {
      const course = courseFor(id, seed);
      const { flight } = fly(course, aimForRings);
      expect(flight.rings / course.rings.length).toBeGreaterThan(0.9);
      expect(flightStars(flight.ownRings, course.rings.length, id)).toBe(3);
    }
  });

  it('still gives a child who never touches the screen some rings on Easy', () => {
    const course = courseFor('easy');
    const { flight } = fly(course, handsOff);
    expect(flight.rings).toBeGreaterThan(course.rings.length * 0.2);
    expect(flight.ownRings).toBeLessThan(course.rings.length * 0.2);
  });

  it('rises in speed towards the end', () => {
    const course = courseFor('easy', 2);
    const flight = newFlight(course);
    let early = 0;
    while (flight.phase === 'flying') {
      stepFlight(flight, null, STEP);
      if (flight.time < 5) early = flight.speed;
      if (flight.s > course.length * 0.9) break;
    }
    expect(flight.speed).toBeGreaterThan(early * 1.25);
  });
});

describe('rings', () => {
  const course = courseFor('easy');
  const aimAll = fly(course, aimForRings);

  it('builds a chain and scores more for longer chains', () => {
    const chains = aimAll.events.flatMap((event) => (event.type === 'ring' ? [event.chain] : []));
    expect(chains.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(ringPoints(1)).toBe(10);
    expect(ringPoints(4)).toBe(20);
    expect(ringPoints(100)).toBe(50);
  });

  it('plays a rising note for each ring in a chain, then holds the top', () => {
    for (let chain = 2; chain < 12; chain += 1) expect(ringNote(chain)).toBeGreaterThan(ringNote(chain - 1));
    expect(ringNote(50)).toBe(ringNote(11));
  });

  it('starts the chain again after a miss, with no points lost', () => {
    const { rings } = course;
    const ring = rings[0];
    if (!ring) throw new Error('no rings');
    const flight = newFlight(course);
    flight.chain = 4;
    flight.s = ring.s - 0.1;
    flight.u = ring.u + 20;
    const events = stepFlight(flight, null, STEP);
    expect(events).toContainEqual({ type: 'miss', index: 0, streak: 1 });
    expect(flight.chain).toBe(0);
    expect(flight.score).toBe(0);
  });
});

describe('helping rings', () => {
  const course = courseFor('wild');
  const stubborn: Pilot = () => ({ u: 9, v: -5.5 });

  function missTwo(): Flight {
    const flight = newFlight(course);
    flight.u = 40;
    flight.missStreak = 2;
    flight.nextStar = course.stars.length;
    flight.nextArch = course.arches.length;
    flight.nextBump = course.bumps.length;
    return flight;
  }

  it('does nothing after one miss', () => {
    const flight = newFlight(course);
    flight.missStreak = 1;
    stepFlight(flight, null, STEP);
    expect(flight.help).toBe(0);
  });

  it('brings the next ring nearer and makes it bigger after two', () => {
    const ring = course.rings[0];
    if (!ring) throw new Error('no rings');
    const flight = missTwo();
    for (let step = 0; step < 60; step += 1) stepFlight(flight, null, STEP);
    const now = ringNow(flight, ring);
    expect(now.radius).toBeGreaterThan(ring.radius * 1.3);
    expect(Math.hypot(now.u - flight.u, now.v - flight.v)).toBeLessThan(Math.hypot(ring.u - flight.u, ring.v - flight.v) * 0.6);
  });

  it('moves only the next ring', () => {
    const ring = course.rings[1];
    if (!ring) throw new Error('no rings');
    const flight = missTwo();
    flight.help = 1;
    expect(ringNow(flight, ring)).toBe(ring);
  });

  it('lets go once a ring is caught', () => {
    const { flight } = fly(course, handsOff);
    expect(flight.rings).toBeGreaterThan(5);
    const events = fly(course, handsOff).events.filter((event) => event.type === 'miss');
    expect(Math.max(...events.map((event) => (event.type === 'miss' ? event.streak : 0)))).toBeLessThanOrEqual(3);
  });

  it('never leaves a stubborn child going long without a ring', () => {
    for (const id of LEVEL_IDS) {
      for (let seed = 1; seed < 20; seed += 1) {
        const { events } = fly(courseFor(id, seed), stubborn);
        const streaks = events.flatMap((event) => (event.type === 'miss' ? [event.streak] : []));
        expect(Math.max(0, ...streaks)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('bots', () => {
  const SEEDS = 300;

  const sweeping =
    (rate: number, reach = 1): Pilot =>
    (flight) => ({ u: 8.5 * reach * Math.sin(flight.time * rate), v: 3 * reach * Math.sin(flight.time * rate * 0.37) });

  /** Short random taps, like a child poking the screen. */
  const tapping = (seed: number): Pilot => {
    const random = makeRandom(seed);
    let spot: Steer = null;
    let until = 0;
    return (flight) => {
      if (flight.time < until) return spot;
      const pressed = spot === null;
      spot = pressed ? { u: (random() - 0.5) * 18, v: (random() - 0.5) * 11 } : null;
      until = flight.time + (pressed ? 0.2 : 0.5 + random());
      return spot;
    };
  };

  const looseAim: Pilot = (flight) => {
    const ring = flight.course.rings[flight.nextRing];
    return ring ? { u: Math.sign(ring.u) * 7, v: 0 } : null;
  };

  const corner: Pilot = () => ({ u: 9, v: 5.5 });

  function average(id: LevelId, pilot: (seed: number) => Pilot, seeds = 60): { score: number; stars: number } {
    let score = 0;
    let stars = 0;
    for (let seed = 1; seed <= seeds; seed += 1) {
      const course = courseFor(id, seed);
      const { flight } = fly(course, pilot(seed));
      score += flight.score / seeds;
      stars += flightStars(flight.ownRings, course.rings.length, id) / seeds;
    }
    return { score, stars };
  }

  describe.each(LEVEL_IDS)('on %s', (id) => {
    it('never give hands-off more than 1 star, over many courses', () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const course = courseFor(id, seed);
        const { flight } = fly(course, handsOff, 1 / 30);
        expect(flightStars(flight.ownRings, course.rings.length, id)).toBe(1);
      }
    });

    it('rank aimed above sweeping above hands-off, on every course', () => {
      for (let seed = 1; seed <= 60; seed += 1) {
        const course = courseFor(id, seed);
        const idle = fly(course, handsOff, 1 / 30).flight.score;
        const swept = fly(course, sweeping(1.6), 1 / 30).flight.score;
        const aimed = fly(course, aimForRings, 1 / 30).flight.score;
        expect(swept).toBeGreaterThan(idle);
        expect(aimed).toBeGreaterThan(swept);
      }
    });

    it.each([0.8, 1.6, 3.2, 6])('beat hands-off when sweeping at speed %d', (rate) => {
      expect(average(id, () => sweeping(rate)).score).toBeGreaterThan(average(id, () => handsOff).score);
    });

    it('beat hands-off with small sweeps, taps or a finger parked in a corner', () => {
      const idle = average(id, () => handsOff).score;
      expect(average(id, () => sweeping(1.6, 0.6)).score).toBeGreaterThan(idle);
      expect(average(id, tapping).score).toBeGreaterThan(idle);
      expect(average(id, () => corner).score).toBeGreaterThan(idle);
    });
  });

  it('keeps Easy generous for a child who steers loosely', () => {
    expect(average('easy', () => looseAim).stars).toBeGreaterThanOrEqual(2);
    expect(average('easy', () => sweeping(1.6)).stars).toBeGreaterThanOrEqual(1.7);
  });
});

describe('bumps', () => {
  function bumped(): { flight: Flight; events: FlightEvent[]; before: number } {
    const course = courseFor('wild');
    const bump = course.bumps[3];
    if (!bump) throw new Error('no bumps');
    const flight = newFlight(course);
    flight.chain = 3;
    flight.nextRing = course.rings.findIndex((ring) => ring.s > bump.s);
    flight.s = bump.s - 0.01;
    flight.u = bump.u;
    flight.v = bump.v;
    while ((course.stars[flight.nextStar]?.s ?? Infinity) < flight.s) flight.nextStar += 1;
    while ((course.arches[flight.nextArch]?.s ?? Infinity) < flight.s) flight.nextArch += 1;
    flight.nextBump = 3;
    const before = flight.speed = 40;
    return { flight, events: stepFlight(flight, { u: bump.u, v: bump.v }, STEP), before };
  }

  it('slow the flyer briefly, never stop it, and keep the chain', () => {
    const { flight, events, before } = bumped();
    expect(events.map((event) => event.type)).toContain('bump');
    expect(flight.chain).toBe(3);
    expect(flight.score).toBe(0);
    stepFlight(flight, null, STEP);
    expect(flight.speed).toBeGreaterThan(0.3 * before);
    expect(flight.speed).toBeLessThan(before);
    for (let step = 0; step < 150; step += 1) stepFlight(flight, null, STEP);
    expect(flight.bumpLeft).toBe(0);
    expect(flight.speed).toBeGreaterThan(before * 0.8);
  });

  it('never leave the flyer stuck, however many it hits', () => {
    const course = courseFor('wild');
    const crashTest: Pilot = (flight) => {
      const bump = course.bumps[flight.nextBump];
      return bump ? { u: bump.u, v: bump.v } : null;
    };
    const { flight } = fly(course, crashTest);
    expect(flight.bumps).toBeGreaterThan(2);
    expect(flight.phase).toBe('landed');
    expect(flight.time).toBeLessThan(90);
  });
});

describe('arches', () => {
  it('pay out only when you pass underneath', () => {
    const course = courseFor('easy');
    const arch = course.arches[0];
    if (!arch) throw new Error('no arches');
    const passAt = (v: number): FlightEvent[] => {
      const flight = newFlight(course);
      flight.s = arch.s - 0.01;
      flight.u = arch.u;
      flight.v = v;
      flight.nextRing = course.rings.length;
      flight.nextStar = course.stars.length;
      flight.nextBump = course.bumps.length;
      return stepFlight(flight, { u: arch.u, v }, STEP);
    };
    expect(passAt(0).map((event) => event.type)).toEqual(['arch']);
    expect(passAt(arch.top + 1).map((event) => event.type)).toEqual([]);
  });
});

describe('the rainbow tunnel', () => {
  const seed = Array.from({ length: 200 }, (_, index) => index + 1).find((value) => courseFor('easy', value).tunnel);
  if (seed === undefined) throw new Error('no tunnel in 200 seeds');
  const course = courseFor('easy', seed);

  it('whooshes you along and lets go again', () => {
    const { events } = fly(course, handsOff);
    const types = events.map((event) => event.type);
    expect(types.filter((type) => type === 'tunnelIn')).toHaveLength(1);
    expect(types.filter((type) => type === 'tunnelOut')).toHaveLength(1);
  });

  it('takes over the steering and speeds up', () => {
    const tunnel = course.tunnel;
    if (!tunnel) throw new Error('no tunnel');
    const flight = newFlight(course);
    flight.s = tunnel.from + 1;
    flight.u = 6;
    const start = flight.speed;
    for (let step = 0; step < 200; step += 1) stepFlight(flight, { u: 9, v: 5 }, STEP);
    expect(flight.inTunnel).toBe(true);
    expect(Math.abs(flight.u)).toBeLessThan(1);
    expect(flight.speed).toBeGreaterThan(start * 1.4);
  });
});

describe('flightStars', () => {
  it('always gives at least one star for landing', () => {
    expect(flightStars(0, 40, 'wild')).toBe(1);
    expect(flightStars(0, 0, 'easy')).toBe(3);
  });

  it('asks for less on Easy', () => {
    expect(flightStars(10, 40, 'easy')).toBe(2);
    expect(flightStars(10, 40, 'wild')).toBe(1);
    expect(flightStars(26, 40, 'easy')).toBe(3);
  });
});

describe('landing', () => {
  it('bounces on the cloud three times, then settles', () => {
    const { events, flight } = fly(courseFor('easy'), handsOff);
    expect(events.filter((event) => event.type === 'bounce')).toHaveLength(3);
    expect(events.filter((event) => event.type === 'landed')).toHaveLength(1);
    expect(flight.speed).toBe(0);
  });
});
