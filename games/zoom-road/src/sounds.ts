import { playNote, playSound } from '@playroom/kit';
import type { ObstacleKind } from './course.ts';

/** Notes of a major scale, so a run of stars climbs into a little tune. */
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
const RUN_GAP_MS = 1400;

let runStep = 0;
let lastStar = 0;

function later(ms: number, play: () => void): void {
  setTimeout(play, ms);
}

export function laneSound(pitch: number): void {
  playSound('whoosh');
  playNote(pitch, { wave: 'triangle', seconds: 0.09, gain: 0.5 });
}

export function edgeSound(): void {
  playSound('boing');
}

export function lightSound(high: boolean): void {
  playNote(high ? 880 : 440, { wave: 'square', seconds: high ? 0.4 : 0.18, gain: 0.3 });
}

export function revSound(): void {
  for (let i = 0; i < 4; i++) {
    later(i * 110, () => playNote(90 + i * 22, { wave: 'sawtooth', seconds: 0.13, gain: 0.5 }));
  }
}

export function starSound(): void {
  const now = performance.now();
  runStep = now - lastStar < RUN_GAP_MS ? runStep + 1 : 0;
  lastStar = now;
  playNote(SCALE[runStep % SCALE.length]!, { wave: 'sine', seconds: 0.16, gain: 0.6 });
}

export function treatSound(): void {
  playSound('pop');
  later(90, () => playNote(660, { wave: 'sine', seconds: 0.12, gain: 0.5 }));
  // Every so often a treat goes down badly, which is the funniest thing that can happen.
  if (Math.random() < 0.3) later(260, () => playSound(Math.random() < 0.5 ? 'burp' : 'toot'));
}

function moo(): void {
  playNote(150, { wave: 'sawtooth', seconds: 0.25, gain: 0.5 });
  later(200, () => playNote(115, { wave: 'sawtooth', seconds: 0.5, gain: 0.5 }));
}

function squeak(): void {
  playNote(1400, { wave: 'sine', seconds: 0.1, gain: 0.6 });
  later(110, () => playNote(1000, { wave: 'sine', seconds: 0.14, gain: 0.6 }));
}

function splash(): void {
  playSound('pop');
  for (let i = 0; i < 4; i++) {
    later(40 + i * 55, () => playNote(500 + Math.random() * 500, { wave: 'sine', seconds: 0.07, gain: 0.4 }));
  }
}

const BONKS: Record<ObstacleKind, () => void> = {
  cow: moo,
  duck: squeak,
  puddle: splash,
  hay: () => playSound('dig'),
  cone: () => playSound('boing'),
};

export function bonkSound(kind: ObstacleKind): void {
  playSound('bonk');
  later(120, BONKS[kind]);
}

export function rampSound(): void {
  playSound('whoosh');
  [523, 659, 784, 1047, 1319, 1568].forEach((hz, i) => later(i * 70, () => playNote(hz, { seconds: 0.18, gain: 0.5 })));
}

export function landSound(): void {
  playSound('boing');
}

/** Warbles, because that's the noise a friendly UFO has always made. */
export function ufoSound(): void {
  for (let i = 0; i < 8; i++) later(i * 110, () => playNote(i % 2 ? 660 : 990, { wave: 'sine', seconds: 0.12, gain: 0.35 }));
}

export function dropSound(): void {
  for (let i = 0; i < 6; i++) later(i * 60, () => playNote(1400 - i * 170, { wave: 'triangle', seconds: 0.09, gain: 0.45 }));
}

export function giantSound(): void {
  playSound('tada');
  playSound('ding');
}

export function finishSound(): void {
  playSound('tada');
}

export function unlockSound(): void {
  playSound('ding');
  later(150, () => playSound('ding'));
}

export function pickSound(pitch: number): void {
  playSound('pop');
  playNote(pitch, { wave: 'triangle', seconds: 0.2, gain: 0.5 });
}

export function lockedSound(): void {
  playSound('boing');
}
