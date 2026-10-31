import { playNote, playSound } from '@playroom/kit';

const pending = new Set<number>();
/** A little scale, so each mirror on a board has its own note. */
const SCALE = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];

function later(ms: number, sound: () => void): void {
  const timer = window.setTimeout(() => {
    pending.delete(timer);
    sound();
  }, ms);
  pending.add(timer);
}

const notes = (list: readonly (readonly [number, number])[], wave: OscillatorType, seconds: number, gain: number): void => {
  for (const [ms, hz] of list) later(ms, () => playNote(hz, { wave, seconds, gain }));
};

/** Forgets any sound still waiting for its turn. */
export function stopSounds(): void {
  for (const timer of pending) window.clearTimeout(timer);
  pending.clear();
}

export const turnSound = (piece: number): void =>
  playNote(SCALE[piece % SCALE.length], { wave: 'triangle', seconds: 0.09, gain: 0.22 });
export const litSound = (count: number): void => notes([[0, 880 + count * 110], [70, 1320 + count * 110]], 'sine', 0.18, 0.28);
export const undoSound = (): void => notes([[0, 494], [70, 392]], 'triangle', 0.08, 0.2);
export const slideSound = (): void => {
  playSound('dig');
  later(120, () => playSound('dig'));
};
export const hintSound = (): void => notes([[0, 659], [110, 988]], 'sine', 0.16, 0.26);
export const noSound = (): void => playSound('bonk');
export const pickSound = (): void => playSound('pop');
export const secretSound = (): void => notes([[0, 880], [100, 1109], [200, 1319], [300, 1760]], 'sine', 0.2, 0.32);

/** The laser runs down like a tired kazoo. */
export function fizzleSound(): void {
  notes([[0, 740], [110, 622], [220, 523], [330, 392]], 'sawtooth', 0.1, 0.08);
  later(460, () => playSound('toot'));
}

export function winSound(): void {
  playSound('whoosh');
  later(200, () => playSound('tada'));
}

export function discoSound(): void {
  const beat: readonly (readonly [number, number])[] = [[0, 523], [150, 659], [300, 784], [450, 1047], [600, 784], [750, 659], [900, 880], [1050, 1047], [1200, 1319]];
  notes(beat, 'square', 0.09, 0.12);
}
