import { playNote, playSound, type SoundName } from '@playroom/kit';
import type { Note } from './tunes.ts';

/** Plays notes at their times. The function it returns cuts off whatever hasn't played yet. */
export function playNotes(notes: readonly Note[]): () => void {
  const timers = notes.map(({ at, hz, wave, seconds, gain }) =>
    setTimeout(() => playNote(hz, { wave, seconds, gain }), at),
  );
  return () => timers.forEach(clearTimeout);
}

export function sound(name: SoundName): void {
  playSound(name);
}

/** The boing of a new part, a little different every time. */
export function boing(): void {
  playSound('boing');
  playNote(500 + Math.random() * 500, { wave: 'sine', seconds: 0.12, gain: 0.35 });
}

/** A press on something that is already busy still answers. */
export function blip(): void {
  playNote(620 + Math.random() * 500, { wave: 'sine', seconds: 0.07, gain: 0.45 });
}
