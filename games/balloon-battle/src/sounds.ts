import { playNote, playSound } from '@playroom/kit';
import type { Side } from './round.ts';
import { pumpHz } from './tuning.ts';

// Each side has its own tone, so two children tapping at once can hear their own balloon.
const PUMP_WAVE: Record<Side, OscillatorType> = { 0: 'triangle', 1: 'sine' };

function later(ms: number, run: () => void): void {
  setTimeout(run, ms);
}

export function pumpSound(side: Side, fill: number): void {
  playNote(pumpHz(fill), { wave: PUMP_WAVE[side], seconds: 0.13, gain: 0.5 });
}

export function countSound(step: number): void {
  playNote(330 + (3 - step) * 110, { wave: 'triangle', seconds: 0.2, gain: 0.6 });
}

export function goSound(): void {
  playNote(880, { wave: 'triangle', seconds: 0.35, gain: 0.7 });
  playSound('whoosh');
}

export function bangSound(): void {
  playSound('pop');
  playNote(70, { wave: 'square', seconds: 0.4, gain: 0.9 });
  playSound('bonk');
  later(260, () => playSound('tada'));
}

export function tootPop(): void {
  playSound('pop');
  later(90, () => playSound('toot'));
}

export function goldSound(): void {
  playSound('ding');
  later(160, () => playNote(1760, { wave: 'sine', seconds: 0.4, gain: 0.5 }));
}

export function birdSound(): void {
  [1900, 2400, 1900].forEach((hz, index) => {
    later(index * 110, () => playNote(hz, { wave: 'sine', seconds: 0.09, gain: 0.4 }));
  });
}

/** A rude little raspberry that falls as the balloon runs out of air. */
export function sputterSound(ms: number): void {
  const steps = 14;
  for (let step = 0; step < steps; step++) {
    later((step / steps) * ms, () => {
      const hz = 260 - (step / steps) * 190 + (step % 2) * 40;
      playNote(hz, { wave: 'square', seconds: 0.08, gain: 0.35 });
    });
  }
}

export function laughSound(): void {
  [620, 540, 620, 470].forEach((hz, index) => {
    later(index * 170, () => playNote(hz, { wave: 'triangle', seconds: 0.12, gain: 0.5 }));
  });
}

export function playfulSound(): void {
  playSound(Math.random() < 0.5 ? 'pop' : 'boing');
}

export function nopeSound(): void {
  playSound('boing');
}
