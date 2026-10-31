import { playNote, playSound } from '@playroom/kit';

const pending = new Set<number>();

function later(ms: number, sound: () => void): void {
  const timer = window.setTimeout(() => {
    pending.delete(timer);
    sound();
  }, ms);
  pending.add(timer);
}

/** Forgets any sound still waiting for its turn. */
export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

const notes = (list: readonly (readonly [number, number])[], wave: OscillatorType, seconds: number, gain: number): void => {
  for (const [ms, hz] of list) later(ms, () => playNote(hz, { wave, seconds, gain }));
};

export const pressSound = (): void => playNote(420, { wave: 'sine', seconds: 0.05, gain: 0.14 });
export const pickSound = (): void => playSound('pop');

/** A silly rising "wee-woo", not a real alarm. */
export const alertSound = (): void => notes([[0, 660], [130, 880], [260, 660], [390, 880]], 'square', 0.11, 0.14);
export const lostHimSound = (): void => notes([[0, 660], [120, 494], [240, 392]], 'triangle', 0.12, 0.2);
export const seenSound = (): void => notes([[0, 1400], [70, 1400]], 'square', 0.04, 0.12);
export const shotSound = (): void => {
  playNote(1300, { wave: 'sawtooth', seconds: 0.09, gain: 0.08 });
  later(50, () => playNote(700, { wave: 'sawtooth', seconds: 0.09, gain: 0.07 }));
};
export const chargeSound = (): void => playNote(420, { wave: 'triangle', seconds: 0.3, gain: 0.08 });
export const plateSound = (): void => playNote(190, { wave: 'square', seconds: 0.08, gain: 0.06 });
export const boxSound = (): void => {
  playSound('boing');
  later(160, () => playSound('pop'));
};
export const discoSound = (): void => notes([[0, 523], [160, 659], [320, 523], [480, 784], [640, 659], [800, 880]], 'square', 0.1, 0.13);
export const treasureSound = (): void => notes([[0, 880], [100, 1109], [200, 1319], [300, 1760]], 'sine', 0.2, 0.35);
export const safeSound = (): void => notes([[0, 523], [120, 784]], 'triangle', 0.16, 0.3);

export const waitSound = (): void => notes([[0, 440], [140, 440]], 'triangle', 0.1, 0.22);
export const goSound = (): void => notes([[0, 523], [90, 659], [180, 880]], 'triangle', 0.1, 0.3);

export function zapSound(): void {
  playSound('bonk');
  later(80, () => playSound('boing'));
}

export function winSound(): void {
  playSound('whoosh');
  later(220, () => playSound('tada'));
}
