import { describe, expect, it } from 'vitest';
import { dangerHits, KINDS, stepDanger, type Danger, type Kind } from './dangers.ts';
import { ARENA_RADIUS, LOW_CLEARANCE, RING_GAP, LEAP_RECHARGE, LEAP_SECONDS, STEP } from './tuning.ts';

function make(kind: Kind, extra: Partial<Danger> = {}): Danger {
  return { id: 1, kind, phase: 'live', t: 0, warn: 1, live: 3, x: 0, z: 0, dx: 1, dz: 0, angle: 0, spin: 1, size: 2, speed: 5, ...extra };
}

const run = (danger: Danger, seconds: number, target = { x: 0, z: 0 }): void => {
  for (let time = 0; time < seconds; time += STEP) stepDanger(danger, STEP, target);
};

describe('warnings', () => {
  it.each(KINDS)('%s can never touch anyone during its warning', (kind) => {
    const danger = make(kind, { phase: 'warn', size: 50 });
    for (let x = -10; x <= 10; x += 1) expect(dangerHits(danger, x, 0, 0)).toBe(false);
  });

  it.each(KINDS)('%s goes live exactly when its warning ends', (kind) => {
    const danger = make(kind, { phase: 'warn', warn: 1 });
    run(danger, 0.95);
    expect(danger.phase).toBe('warn');
    run(danger, 0.1);
    expect(danger.phase).toBe('live');
  });
});

describe('shapes', () => {
  it('a meteor hits inside its landing shadow and not outside', () => {
    const meteor = make('meteor', { size: 2 });
    expect(dangerHits(meteor, 1.5, 0, 0)).toBe(true);
    expect(dangerHits(meteor, 3, 0, 0)).toBe(false);
  });

  it('a boulder is too tall to leap, a beam and a ring are not', () => {
    expect(dangerHits(make('boulder', { size: 1 }), 0, 0, LOW_CLEARANCE + 1)).toBe(true);
    expect(dangerHits(make('beam', { size: 10 }), 3, 0, LOW_CLEARANCE + 0.1)).toBe(false);
    expect(dangerHits(make('beam', { size: 10 }), 3, 0, 0)).toBe(true);
    expect(dangerHits(make('ring', { size: 3 }), 3, 0, LOW_CLEARANCE + 0.1)).toBe(false);
    expect(dangerHits(make('ring', { size: 3 }), 3, 0, 0)).toBe(true);
  });

  it('a ring only hits where its edge is, so the middle is calm', () => {
    expect(dangerHits(make('ring', { size: 6 }), 1, 0, 0)).toBe(false);
  });

  it('a bar reaches both ways from its pivot but not past its tips', () => {
    const bar = make('bar', { size: 4 });
    expect(dangerHits(bar, -3, 0, 0)).toBe(true);
    expect(dangerHits(bar, 3, 0, 0)).toBe(true);
    expect(dangerHits(bar, 6, 0, 0)).toBe(false);
  });

  it('a beam stays narrow as it sweeps', () => {
    const beam = make('beam', { size: 10, angle: Math.PI / 2 });
    expect(dangerHits(beam, 0, 5, 0)).toBe(true);
    expect(dangerHits(beam, 2, 5, 0)).toBe(false);
  });
});

describe('moving', () => {
  it('a boulder leaves when it has rolled across the arena', () => {
    const boulder = make('boulder', { x: -ARENA_RADIUS - 1, speed: 10, size: 1 });
    run(boulder, 1);
    expect(boulder.phase).toBe('live');
    run(boulder, 3);
    expect(boulder.phase).toBe('done');
  });

  it('a ring grows outwards until it has crossed the arena', () => {
    const ring = make('ring', { size: 0, speed: 8 });
    run(ring, 1);
    expect(ring.size).toBeCloseTo(8, 0);
    run(ring, 2);
    expect(ring.phase).toBe('done');
  });

  it('slime chases, stops to fuse, then bursts wide', () => {
    const slime = make('slime', { x: 10, speed: 3, live: 1 });
    const chase = { x: 0, z: 0 };
    run(slime, 0.9, chase);
    expect(slime.x).toBeLessThan(8);
    run(slime, 0.2, chase);
    expect(slime.phase).toBe('fuse');
    const stopped = slime.x;
    run(slime, 0.8, chase);
    expect(slime.x).toBe(stopped);
    run(slime, 0.15, chase);
    expect(slime.phase).toBe('burst');
    expect(dangerHits(slime, slime.x + 2, 0, 0)).toBe(true);
    run(slime, 0.4, chase);
    expect(slime.phase).toBe('done');
  });
});

it('a train of rings always leaves time for the leap to recharge', () => {
  expect(RING_GAP).toBeGreaterThan(LEAP_SECONDS + LEAP_RECHARGE);
});
