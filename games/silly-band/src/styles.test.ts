import { describe, expect, it } from 'vitest';
import { MEMBER_IDS, TINY } from './band.ts';
import { noteFor } from './conductor.ts';
import { midiToHz, scaleMidi, STEPS_PER_BAR } from './music.ts';
import { patch, type Voice } from './patches.ts';
import { bassMidi, chordDegree, stabMidis, STYLE_IDS, STYLES } from './styles.ts';

const ALL_VOICES: Voice[] = ['kick', 'snare', 'hat', 'stab', 'drum', 'tom', 'bass', 'melody', 'voice', 'clap', 'sparkle', 'tiny', 'cheer', 'whoosh'];

function inScale(midi: number, style: (typeof STYLES)[keyof typeof STYLES]): boolean {
  const pitches = Array.from({ length: 5 }, (_, degree) => scaleMidi(style.root, style.scale, degree) % 12);
  return pitches.includes(midi % 12);
}

describe('styles', () => {
  it('each have their own tempo and backing', () => {
    expect(new Set(STYLE_IDS.map((id) => STYLES[id].bpm)).size).toBe(STYLE_IDS.length);
    expect(new Set(STYLE_IDS.map((id) => JSON.stringify(STYLES[id].tracks))).size).toBe(STYLE_IDS.length);
  });

  it('have tracks exactly one bar long and eight chords', () => {
    for (const id of STYLE_IDS) {
      for (const track of Object.values(STYLES[id].tracks)) expect(track).toHaveLength(STEPS_PER_BAR);
      expect(STYLES[id].chords).toHaveLength(8);
    }
  });

  it('change chord only on a bar line', () => {
    expect(chordDegree(STYLES.march, 15)).toBe(chordDegree(STYLES.march, 0));
    expect(chordDegree(STYLES.march, 16)).toBe(STYLES.march.chords[1]);
    expect(chordDegree(STYLES.march, 128)).toBe(STYLES.march.chords[0]);
  });

  it('keep every backing note on the scale, and bass at 110 Hz or above', () => {
    for (const id of STYLE_IDS) {
      const style = STYLES[id];
      for (let step = 0; step < 128; step += STEPS_PER_BAR) {
        for (const midi of stabMidis(style, step)) expect(inScale(midi, style)).toBe(true);
        for (const offset of [0, 3, 5]) {
          const midi = bassMidi(style, step, offset);
          expect(inScale(midi, style)).toBe(true);
          expect(midiToHz(midi)).toBeGreaterThanOrEqual(110 - 0.01);
        }
      }
    }
  });
});

describe('a tap in any style', () => {
  it('always lands on the scale', () => {
    for (const id of STYLE_IDS) {
      const style = STYLES[id];
      for (const player of [...MEMBER_IDS, TINY] as const) {
        for (let degree = 0; degree < 18; degree++) {
          const note = noteFor(player, degree, style, 40);
          if (note.midi > 0) expect(inScale(note.midi, style), `${id} ${player}`).toBe(true);
        }
      }
    }
  });

  it('gives each musician a different job', () => {
    const voices = MEMBER_IDS.map((member) => noteFor(member, 0, STYLES.march, 0).voice);
    expect(new Set(voices).size).toBe(MEMBER_IDS.length);
  });
});

describe('sound recipes', () => {
  it('always have a layer a phone speaker can play', () => {
    for (const id of STYLE_IDS) {
      for (const voice of ALL_VOICES) {
        for (const midi of voice === 'bass' ? [45, 60] : [57, 60, 84]) {
          const heard = patch({ voice, midi }, id).some((part) => part.source === 'noise' || Math.min(part.from, part.to ?? part.from) >= 110);
          expect(heard, `${id} ${voice}`).toBe(true);
        }
      }
    }
  });

  it('never leave a buzzy wave unfiltered', () => {
    for (const id of STYLE_IDS) {
      for (const voice of ALL_VOICES) {
        for (const part of patch({ voice, midi: 60 }, id)) {
          if (part.source === 'square' || part.source === 'sawtooth') expect(part.filter, `${id} ${voice}`).toBeDefined();
        }
      }
    }
  });

  it('stay short and never start above a safe level', () => {
    for (const voice of ALL_VOICES) {
      for (const part of patch({ voice, midi: 60 }, 'disco')) {
        expect(part.gain).toBeLessThanOrEqual(0.6);
        expect(part.seconds).toBeLessThanOrEqual(1.4);
      }
    }
  });
});
