import { playNote, playSound } from '@playroom/kit';

function later(ms: number, play: () => void): void {
  setTimeout(play, ms);
}

export function jumpSound(): void {
  playNote(420, { wave: 'triangle', seconds: 0.08, gain: 0.35 });
  later(40, () => playNote(640, { wave: 'triangle', seconds: 0.08, gain: 0.3 }));
}

export function wallSound(): void {
  playNote(520, { wave: 'square', seconds: 0.05, gain: 0.2 });
  later(35, () => playNote(820, { wave: 'triangle', seconds: 0.09, gain: 0.3 }));
}

export function dashSound(): void {
  playSound('whoosh');
}

export function landSound(): void {
  playNote(150, { wave: 'triangle', seconds: 0.05, gain: 0.25 });
}

export function bounceSound(): void {
  playSound('boing');
}

export function crumbleSound(): void {
  playNote(120, { wave: 'sawtooth', seconds: 0.12, gain: 0.2 });
}

const GEM_NOTES = [988, 1175, 1319, 1568, 1760, 2093];
let gemStep = 0;

export function gemSound(): void {
  playNote(GEM_NOTES[gemStep % GEM_NOTES.length]!, { wave: 'sine', seconds: 0.16, gain: 0.45 });
  gemStep += 1;
}

export const resetGems = (): void => {
  gemStep = 0;
};

export function secretSound(): void {
  playSound('tada');
  later(420, () => playSound('ding'));
}

export function singeSound(): void {
  playNote(880, { wave: 'sawtooth', seconds: 0.08, gain: 0.25 });
  [640, 460, 320, 220].forEach((hz, i) => later(50 + i * 55, () => playNote(hz, { wave: 'triangle', seconds: 0.08, gain: 0.3 })));
}

export function bonkSound(): void {
  playSound('bonk');
}

export function winSound(): void {
  playSound('tada');
}

export function starSound(index: number): void {
  playNote([659, 880, 1319][index] ?? 880, { wave: 'triangle', seconds: 0.3, gain: 0.5 });
}

export function deniedSound(): void {
  playNote(190, { wave: 'square', seconds: 0.1, gain: 0.2 });
}
