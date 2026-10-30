import { playNote, playSound } from '@playroom/kit';

/** Notes of a major scale, so a run of stars climbs into a little tune. */
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
const RUN_GAP_MS = 900;

let runStep = 0;
let lastStar = 0;

function later(ms: number, play: () => void): void {
  setTimeout(play, ms);
}

export function jumpSound(pitch: number): void {
  playNote(pitch, { wave: 'triangle', seconds: 0.09, gain: 0.45 });
  later(50, () => playNote(pitch * 1.5, { wave: 'triangle', seconds: 0.1, gain: 0.4 }));
}

export function doubleSound(pitch: number): void {
  playSound('whoosh');
  [1.5, 2, 2.5, 3].forEach((times, i) => later(i * 35, () => playNote(pitch * times, { wave: 'sine', seconds: 0.09, gain: 0.4 })));
}

export function landSound(): void {
  playNote(150, { wave: 'triangle', seconds: 0.06, gain: 0.35 });
}

export function springSound(): void {
  playSound('boing');
  later(70, () => playNote(880, { wave: 'sine', seconds: 0.2, gain: 0.3 }));
}

/** The funny squeak of a jelly being bounced on, and now and then something ruder. */
export function jellySound(): void {
  playNote(1500, { wave: 'sine', seconds: 0.07, gain: 0.55 });
  later(60, () => playNote(2100, { wave: 'sine', seconds: 0.08, gain: 0.5 }));
  later(130, () => playNote(1100, { wave: 'sine', seconds: 0.12, gain: 0.45 }));
  if (Math.random() < 0.12) later(240, () => playSound('toot'));
}

export function tumbleSound(): void {
  playSound('bonk');
  [700, 560, 440, 350, 280].forEach((hz, i) => later(90 + i * 60, () => playNote(hz, { wave: 'sine', seconds: 0.08, gain: 0.4 })));
}

/** Hee-hee-hee: quick notes that bounce and fall away. */
function giggle(): void {
  [1250, 1500, 1200, 1450, 1150, 1350].forEach((hz, i) => {
    later(i * 85, () => playNote(hz, { wave: 'triangle', seconds: 0.06, gain: 0.45 }));
  });
}

export function scoopSound(): void {
  playSound('whoosh');
  later(300, giggle);
}

export function dropSound(): void {
  playSound('pop');
}

export function starSound(): void {
  const now = performance.now();
  runStep = now - lastStar < RUN_GAP_MS ? runStep + 1 : 0;
  lastStar = now;
  playNote(SCALE[runStep % SCALE.length]!, { wave: 'sine', seconds: 0.12, gain: 0.5 });
}

export function carrotSound(): void {
  playSound('dig');
  later(40, () => playSound('dig'));
  later(90, () => playNote(990, { wave: 'sine', seconds: 0.1, gain: 0.4 }));
}

export function rocketSound(): void {
  playSound('whoosh');
  [392, 523, 659, 784, 1047, 1319].forEach((hz, i) => later(i * 70, () => playNote(hz, { wave: 'square', seconds: 0.12, gain: 0.25 })));
}

export function treasureSound(): void {
  playSound('tada');
  later(520, () => playSound('ding'));
  later(680, () => playSound('ding'));
}

export function bounceSound(height: number): void {
  playNote(200 + height * 2, { wave: 'triangle', seconds: 0.18, gain: 0.45 });
}

export function flagSound(): void {
  playSound('tada');
}

export function starCountSound(index: number): void {
  playNote([659, 880, 1319][index] ?? 880, { wave: 'triangle', seconds: 0.3, gain: 0.5 });
}

export function pickSound(pitch: number): void {
  playSound('pop');
  playNote(pitch, { wave: 'triangle', seconds: 0.2, gain: 0.5 });
}
