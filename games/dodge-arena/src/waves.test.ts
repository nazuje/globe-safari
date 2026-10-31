import { describe, expect, it } from 'vitest';
import { KINDS } from './dangers.ts';
import { WARN_EASY, WARN_FLOOR } from './tuning.ts';
import { difficultyAt, gapAt, warnFor, waveAt, WAVE_SECONDS } from './waves.ts';

describe('waves', () => {
  it('names a wave at every minute mark and at no other time', () => {
    for (let minute = 1; minute <= 12; minute += 1) expect(waveAt(minute * 60).name).not.toBeNull();
    for (const seconds of [0, 15, 30, 45, 72, 100, 110]) expect(waveAt(seconds).name).toBeNull();
  });

  it('brings one new danger each wave until all six have come', () => {
    const debuts = [0, 1, 2, 3, 4, 6].map((index) => waveAt(index * WAVE_SECONDS).debut);
    expect(new Set(debuts)).toEqual(new Set(KINDS));
  });

  it('never sends a danger before it has been introduced', () => {
    expect(waveAt(0).kinds).toEqual(['meteor']);
    expect(waveAt(WAVE_SECONDS).kinds).toEqual(['meteor', 'boulder']);
    expect(waveAt(WAVE_SECONDS * 7).kinds).toEqual([...KINDS]);
  });

  it('keeps every later wave a new idea, with pairs of one danger', () => {
    for (let index = 7; index < 40; index += 1) {
      const wave = waveAt(index * WAVE_SECONDS);
      expect(wave.name !== null || wave.twin).toBe(true);
    }
  });

  it('speeds up over time', () => {
    expect(gapAt(11)).toBeGreaterThan(gapAt(100));
    expect(gapAt(100)).toBeGreaterThan(gapAt(290));
    expect(gapAt(500)).toBeGreaterThan(gapAt(590));
  });

  it('makes a named wave denser than the wave before it', () => {
    expect(gapAt(60)).toBeLessThan(gapAt(59));
  });
});

describe('warning time', () => {
  it('shrinks slowly with difficulty', () => {
    expect(warnFor(0)).toBe(WARN_EASY);
    expect(warnFor(0.5)).toBeLessThan(WARN_EASY);
    expect(warnFor(0.5) - warnFor(0.6)).toBeLessThan(0.1);
  });

  it('never falls below the floor, however late the run gets', () => {
    for (const seconds of [0, 300, 600, 3000]) expect(warnFor(difficultyAt(seconds))).toBeGreaterThanOrEqual(WARN_FLOOR);
    expect(warnFor(5)).toBe(WARN_FLOOR);
  });
});
