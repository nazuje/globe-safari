import { describe, expect, it } from 'vitest';
import {
  buildCourse,
  chooseSurprises,
  courseLength,
  LEVEL_IDS,
  LEVELS,
  makeRandom,
  MAX_U,
  MAX_V,
  pathAt,
  STAR_REACH,
  type SurpriseKind,
} from './course.ts';

describe('buildCourse', () => {
  it('builds the same course from the same seed, and a different one from another', () => {
    expect(buildCourse(LEVELS.easy, 7)).toEqual(buildCourse(LEVELS.easy, 7));
    expect(buildCourse(LEVELS.easy, 8).rings).not.toEqual(buildCourse(LEVELS.easy, 7).rings);
  });

  it.each(LEVEL_IDS)('keeps %s rings in reach and in order', (id) => {
    for (let seed = 1; seed < 40; seed += 1) {
      const { rings } = buildCourse(LEVELS[id], seed);
      expect(rings.length).toBeGreaterThan(20);
      rings.forEach((ring, index) => {
        expect(Math.abs(ring.u)).toBeLessThanOrEqual(MAX_U);
        expect(Math.abs(ring.v)).toBeLessThanOrEqual(MAX_V);
        expect(ring.s).toBeGreaterThan(rings[index - 1]?.s ?? 0);
      });
    }
  });

  it('makes each harder level smaller, faster and wider', () => {
    const [easy, swoopy, wild] = LEVEL_IDS.map((id) => LEVELS[id]);
    for (const [gentler, harder] of [[easy, swoopy], [swoopy, wild]]) {
      if (!gentler || !harder) throw new Error('missing level');
      expect(harder.ringRadius).toBeLessThan(gentler.ringRadius);
      expect(harder.speedEnd).toBeGreaterThan(gentler.speedEnd);
      expect(harder.swingU[1]).toBeGreaterThan(gentler.swingU[1]);
      expect(harder.ringGap).toBeGreaterThan(gentler.ringGap);
    }
  });

  it('puts no rings inside a rainbow tunnel', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      const { tunnel, rings } = buildCourse(LEVELS.easy, seed);
      if (!tunnel) continue;
      expect(rings.filter((ring) => ring.s > tunnel.from && ring.s < tunnel.to)).toEqual([]);
    }
  });

  it('keeps bumps off the straight line between two rings', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const { rings, bumps } = buildCourse(LEVELS.easy, seed);
      for (const bump of bumps) {
        const next = rings.findIndex((ring) => ring.s > bump.s);
        const before = rings[next - 1];
        const after = rings[next];
        if (!before || !after) throw new Error('bump outside the rings');
        const lineU = (before.u + after.u) / 2;
        const lineV = (before.v + after.v) / 2;
        expect(Math.hypot(bump.u - lineU, bump.v - lineV)).toBeGreaterThan(bump.radius);
      }
    }
  });
});

describe('the middle of the sky', () => {
  it.each(LEVEL_IDS)('holds no ring, star or arch for an idle flyer on %s', (id) => {
    const level = LEVELS[id];
    for (let seed = 1; seed < 300; seed += 1) {
      const { rings, stars, arches, tunnel } = buildCourse(level, seed);
      for (const ring of rings) expect(Math.hypot(ring.u, ring.v)).toBeGreaterThan(ring.radius + level.forgiveness);
      for (const star of stars) {
        const inTunnel = tunnel !== null && star.s > tunnel.from && star.s < tunnel.to;
        if (!inTunnel) expect(Math.hypot(star.u, star.v)).toBeGreaterThan(STAR_REACH);
      }
      for (const arch of arches) expect(Math.abs(arch.u)).toBeGreaterThan(arch.halfWidth + 1);
    }
  });
});

describe('pathAt', () => {
  it('starts straight ahead and only ever bends gently', () => {
    const point = { x: 0, y: 0, z: 0 };
    expect(pathAt(LEVELS.easy, 2000, 0, point)).toEqual({ x: 0, y: 0, z: -0 });
    for (const id of LEVEL_IDS) {
      const level = LEVELS[id];
      const length = courseLength(level);
      for (let s = 0; s < length; s += 5) {
        const here = pathAt(level, length, s, { x: 0, y: 0, z: 0 }).x;
        const ahead = pathAt(level, length, s + 1, { x: 0, y: 0, z: 0 }).x;
        expect(Math.abs(ahead - here)).toBeLessThan(0.75);
      }
    }
  });
});

describe('surprises', () => {
  const runs = Array.from({ length: 2000 }, (_, seed) => buildCourse(LEVELS.easy, seed + 1).surprises);

  it('are rare, and every kind turns up', () => {
    const kinds = new Set<SurpriseKind>(runs.flat().map((surprise) => surprise.kind));
    expect(kinds).toEqual(new Set(['tunnel', 'whale', 'birds']));
    const share = runs.filter((surprises) => surprises.length > 0).length / runs.length;
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.7);
  });

  it('never leaves a child waiting too long', () => {
    for (let seed = 1; seed < 200; seed += 1) {
      expect(chooseSurprises(makeRandom(seed), 2).length).toBeGreaterThan(0);
    }
  });

  it('come one at a time, well apart', () => {
    for (const surprises of runs) {
      const [first, second] = surprises;
      if (first && second) expect(second.s - first.s).toBeGreaterThan(300);
    }
  });
});
