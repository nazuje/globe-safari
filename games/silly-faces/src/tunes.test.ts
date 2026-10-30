import { describe, expect, it } from 'vitest';
import { hz, SOUNDS, tune, TUNE_COUNT, tuneLength, whirlTick } from './tunes.ts';

describe('dance tunes', () => {
  it('stays short', () => {
    for (let i = 0; i < TUNE_COUNT; i++) {
      expect(tuneLength(i)).toBeGreaterThan(3000);
      expect(tuneLength(i)).toBeLessThan(7000);
    }
  });

  it('plays only real notes, in time', () => {
    for (let i = 0; i < TUNE_COUNT; i++) {
      for (const note of tune(i, 20)) {
        expect(note.at).toBeLessThan(tuneLength(i));
        expect(note.hz).toBeGreaterThan(50);
        expect(note.hz).toBeLessThan(5000);
      }
    }
  });

  it('gets fuller as friends join', () => {
    expect(tune(0, 6).length).toBeGreaterThan(tune(0, 1).length);
    expect(tune(0, 12).length).toBeGreaterThan(tune(0, 6).length);
  });

  it('knows concert pitch', () => {
    expect(hz(69)).toBe(440);
  });
});

it('has small sound effects that fit their reactions', () => {
  for (const notes of Object.values(SOUNDS)) expect(notes.every((note) => note.at <= 2500)).toBe(true);
  expect(whirlTick(10).hz).toBeGreaterThan(whirlTick(1).hz);
});
