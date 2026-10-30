import { playNote, playSound } from '@playroom/kit';
import { popNote } from './party.ts';

/** A bubble's pop, plus a note on the scale so a run of pops almost plays a tune. */
export function popSound(step: number): void {
  playSound('pop');
  playNote(popNote(step), { wave: 'sine', seconds: 0.14, gain: 0.35 });
}

export function miniPopSound(): void {
  playSound('pop');
  playNote(1200 + Math.random() * 900, { wave: 'sine', seconds: 0.08, gain: 0.2 });
}

/** A soft blip for a tap that hit nothing, so even that gets an answer. */
export function missSound(): void {
  playNote(392, { wave: 'sine', seconds: 0.07, gain: 0.18 });
}

export function giantSound(taps: number): void {
  playSound('boing');
  playNote(196 * 1.25 ** taps, { wave: 'triangle', seconds: 0.2, gain: 0.3 });
}

/** The "ah... ah..." before the sneeze: two notes climbing. */
export function windupSound(): void {
  playNote(330, { wave: 'triangle', seconds: 0.22, gain: 0.3 });
  setTimeout(() => playNote(494, { wave: 'triangle', seconds: 0.24, gain: 0.3 }), 240);
}

export function sneezeSound(): void {
  playSound('whoosh');
  playSound('bonk');
}

export function tootSound(): void {
  playSound('toot');
  playNote(70 + Math.random() * 90, { wave: 'square', seconds: 0.2, gain: 0.2 });
}

export function rainSound(): void {
  playSound('whoosh');
  playSound('ding');
}

export function landedSound(): void {
  playNote(1319, { wave: 'sine', seconds: 0.18, gain: 0.3 });
}

export function goldenSound(): void {
  playSound('ding');
  playSound('tada');
}
