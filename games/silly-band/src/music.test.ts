import { describe, expect, it } from 'vitest';
import { dueSteps, type Grid, midiToHz, quantize, retempo, scaleMidi, stepAt, stepSeconds, timeOf, wander } from './music.ts';

const grid: Grid = { anchor: 10, anchorStep: 0, stepSeconds: 0.1 };

function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

describe('scales', () => {
  it('climbs the major and minor pentatonic and wraps to the next octave', () => {
    expect([0, 1, 2, 3, 4, 5].map((d) => scaleMidi(60, 'major', d))).toEqual([60, 62, 64, 67, 69, 72]);
    expect([0, 1, 2, 3, 4, 5].map((d) => scaleMidi(57, 'minor', d))).toEqual([57, 60, 62, 64, 67, 69]);
  });

  it('goes below the root too', () => {
    expect(scaleMidi(60, 'major', -1)).toBe(57);
  });

  it('never puts two notes a semitone apart, the thing that makes mashing safe', () => {
    for (const kind of ['major', 'minor'] as const) {
      const notes = Array.from({ length: 20 }, (_, degree) => scaleMidi(60, kind, degree));
      for (const a of notes) for (const b of notes) expect((Math.abs(a - b) % 12 + 12) % 12).not.toBe(1);
    }
  });

  it('knows concert pitch', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(45)).toBeCloseTo(110);
  });
});

describe('the grid', () => {
  it('divides a beat into four steps', () => {
    expect(stepSeconds(120)).toBeCloseTo(0.125);
  });

  it('turns steps to times and back', () => {
    expect(timeOf(grid, 5)).toBeCloseTo(10.5);
    expect(stepAt(grid, 10.5)).toBeCloseTo(5);
  });

  it('joins a new tempo exactly where the old one left off', () => {
    const faster = retempo(grid, 8, 0.05);
    expect(timeOf(faster, 8)).toBeCloseTo(timeOf(grid, 8));
    expect(timeOf(faster, 10)).toBeCloseTo(timeOf(grid, 8) + 0.1);
  });
});

describe('scheduling', () => {
  it('books each step once, at a jittery pace, and never drifts over an hour', () => {
    const random = seeded(7);
    const seconds = stepSeconds(137);
    const music: Grid = { anchor: 0.123, anchorStep: 0, stepSeconds: seconds };
    let next = 0;
    let now = 0.123;
    let expected = 0;
    while (now < 3600) {
      const { steps, next: after } = dueSteps(music, next, now, 0.16);
      for (const step of steps) expect(step).toBe(expected++);
      next = after;
      now += 0.02 + random() * 0.1;
    }
    expect(timeOf(music, expected)).toBeCloseTo(0.123 + expected * seconds, 8);
    expect(expected).toBeGreaterThan(3600 / seconds - 2);
  });

  it('skips what a sleeping tab missed instead of playing it all at once', () => {
    const { steps, next } = dueSteps(grid, 5, 70, 0.25);
    expect(steps).toEqual([600, 601, 602]);
    expect(next).toBe(603);
  });

  it('stays on the same grid after a sleep', () => {
    const { steps } = dueSteps(grid, 5, 70.03, 0.25);
    const late = steps.map((step) => (timeOf(grid, step) - 10) / 0.1);
    for (const position of late) expect(position).toBeCloseTo(Math.round(position), 8);
  });

  it('books nothing twice when called again at once', () => {
    const first = dueSteps(grid, 0, 10, 0.25);
    const again = dueSteps(grid, first.next, 10, 0.25);
    expect(first.steps).toEqual([0, 1, 2]);
    expect(again.steps).toEqual([]);
  });
});

describe('quantizing a tap', () => {
  it('waits for a step that is just ahead', () => {
    expect(quantize(grid, 10.47, 0.07)).toEqual({ step: 5, at: timeOf(grid, 5) });
  });

  it('plays at once when the step just went by', () => {
    expect(quantize(grid, 10.53, 0.07)).toEqual({ step: 5, at: 10.53 });
  });

  it('never waits longer than the limit', () => {
    const slow: Grid = { anchor: 0, anchorStep: 0, stepSeconds: 0.4 };
    expect(quantize(slow, 0.25, 0.07)).toEqual({ step: 1, at: 0.25 });
  });

  it('never schedules a tap in the past or more than the limit ahead', () => {
    const random = seeded(3);
    for (let i = 0; i < 2000; i++) {
      const now = 10 + random() * 100;
      const { at } = quantize(grid, now, 0.07);
      expect(at).toBeGreaterThanOrEqual(now);
      expect(at - now).toBeLessThanOrEqual(0.07);
    }
  });
});

describe('wander', () => {
  it('stays in range and hops by small steps', () => {
    const random = seeded(11);
    let degree = 4;
    for (let i = 0; i < 1000; i++) {
      const next = wander(degree, 0, 9, random);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThanOrEqual(9);
      expect(Math.abs(next - degree)).toBeLessThanOrEqual(2);
      degree = next;
    }
  });
});
