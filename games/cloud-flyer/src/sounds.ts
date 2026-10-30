import { playNote, playSound } from '@playroom/kit';
import { ringNote } from './flight.ts';

const pending = new Set<number>();

function later(ms: number, sound: () => void): void {
  const timer = window.setTimeout(() => {
    pending.delete(timer);
    sound();
  }, ms);
  pending.add(timer);
}

/** Forgets any sound still waiting for its turn, for when the game goes away. */
export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export function ringSound(chain: number): void {
  const note = ringNote(chain);
  playNote(note, { wave: 'sine', seconds: 0.42, gain: 0.8 });
  playNote(note * 1.5, { wave: 'triangle', seconds: 0.2, gain: 0.18 });
}

/** A little giggle from the ring that got away. Never a buzzer. */
export function missSound(): void {
  const lift = 1 + Math.random() * 0.25;
  for (const [ms, hz] of [[0, 660], [70, 880], [140, 740]] as const) {
    later(ms, () => playNote(hz * lift, { wave: 'triangle', seconds: 0.07, gain: 0.16 }));
  }
}

export const starSound = (): void => playNote(1760 + Math.random() * 400, { wave: 'sine', seconds: 0.1, gain: 0.25 });

export function archSound(): void {
  playSound('whoosh');
  later(120, () => playSound('ding'));
}

/** Ah... ah... CHOO! */
export function sneezeSound(): void {
  playNote(392, { wave: 'triangle', seconds: 0.13, gain: 0.5 });
  later(150, () => playNote(523, { wave: 'triangle', seconds: 0.15, gain: 0.55 }));
  later(340, () => {
    playSound('pop');
    playSound('toot');
  });
}

export const touchSound = (): void => playNote(330, { wave: 'sine', seconds: 0.06, gain: 0.14 });

export const tunnelSound = (): void => {
  playSound('whoosh');
  later(180, () => playSound('whoosh'));
};

export function whaleSound(): void {
  playNote(147, { wave: 'sine', seconds: 0.9, gain: 0.8 });
  later(700, () => playNote(196, { wave: 'sine', seconds: 1, gain: 0.7 }));
  later(1500, () => playNote(165, { wave: 'sine', seconds: 1.2, gain: 0.6 }));
}

export function birdSound(): void {
  for (const [ms, hz] of [[0, 2600], [110, 3100], [220, 2800], [420, 3200]] as const) {
    later(ms, () => playNote(hz, { wave: 'sine', seconds: 0.08, gain: 0.25 }));
  }
}

export const bounceSound = (hop: number): void => {
  playSound('boing');
  playNote(392 + hop * 130, { wave: 'triangle', seconds: 0.2, gain: 0.3 });
};

export const pickSound = (): void => playSound('pop');
export const landedSound = (): void => playSound('tada');
