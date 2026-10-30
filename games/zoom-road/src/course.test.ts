import { describe, expect, it } from 'vitest';
import { generateCourse, SPEED_IDS, SPEEDS, type ObstacleKind, type Rng } from './course.ts';

const KINDS: ObstacleKind[] = ['cow', 'puddle', 'hay', 'duck', 'cone'];

/** A small repeatable random source, so a failure can be replayed. */
function seeded(seed: number): Rng {
  // Small seeds would all start alike, so spread them out first.
  let state = (seed * 2654435761) % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

describe('generateCourse', () => {
  it('replays exactly from the same random numbers', () => {
    expect(generateCourse('fast', KINDS, seeded(7))).toEqual(generateCourse('fast', KINDS, seeded(7)));
  });

  it('never blocks all three lanes', () => {
    for (const speed of SPEED_IDS) {
      for (const seed of seeds) {
        const walls = new Map<number, number>();
        for (const item of generateCourse(speed, KINDS, seeded(seed)).items) {
          if (item.kind === 'obstacle') walls.set(item.at, (walls.get(item.at) ?? 0) + 1);
        }
        expect(Math.max(0, ...walls.values())).toBeLessThan(3);
      }
    }
  });

  it('only doubles up obstacles above the gentlest speed', () => {
    for (const seed of seeds) {
      const walls = new Map<number, number>();
      for (const item of generateCourse('slow', KINDS, seeded(seed)).items) {
        if (item.kind === 'obstacle') walls.set(item.at, (walls.get(item.at) ?? 0) + 1);
      }
      expect(Math.max(0, ...walls.values())).toBeLessThan(2);
    }
  });

  it('keeps everything on the road and leaves the start clear', () => {
    for (const speed of SPEED_IDS) {
      for (const seed of seeds) {
        const { items, length } = generateCourse(speed, KINDS, seeded(seed));
        for (const item of items) {
          expect([0, 1, 2]).toContain(item.lane);
          expect(item.at).toBeGreaterThan(5);
          expect(item.at).toBeLessThan(length);
        }
      }
    }
  });

  it('gives every race plenty to collect', () => {
    for (const speed of SPEED_IDS) {
      for (const seed of seeds) {
        const stars = generateCourse(speed, KINDS, seeded(seed)).items.filter((item) => item.kind === 'star');
        expect(stars.length).toBeGreaterThan(15);
      }
    }
  });

  it('keeps obstacles far enough apart to see the next one coming at Slow', () => {
    const { cruise } = SPEEDS.slow;
    for (const seed of seeds) {
      const obstacles = generateCourse('slow', KINDS, seeded(seed)).items.filter((item) => item.kind === 'obstacle');
      for (let i = 1; i < obstacles.length; i++) {
        expect((obstacles[i]!.at - obstacles[i - 1]!.at) / cruise).toBeGreaterThan(1);
      }
    }
  });

  it('makes the surprises rare, but not so rare they go unseen', () => {
    let ramps = 0;
    let ufos = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const { items } = generateCourse('slow', KINDS, seeded(seed));
      ramps += items.filter((item) => item.kind === 'ramp').length;
      ufos += items.filter((item) => item.kind === 'ufo').length;
    }
    expect(ramps).toBeGreaterThan(120);
    expect(ramps).toBeLessThan(240);
    expect(ufos).toBeGreaterThan(100);
    expect(ufos).toBeLessThan(220);
  });

  it('leaves the road clear of a rainbow flight, and keeps the UFO out of it', () => {
    for (const speed of SPEED_IDS) {
      for (const seed of seeds) {
        const { items } = generateCourse(speed, KINDS, seeded(seed));
        const ramp = items.find((item) => item.kind === 'ramp');
        if (!ramp) continue;
        const flight = SPEEDS[speed].cruise * 1.6 * 4;
        const inFlight = items.filter((item) => item !== ramp && item.at > ramp.at && item.at < ramp.at + flight);
        expect(inFlight).toEqual([]);
      }
    }
  });
});
