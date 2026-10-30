import { playNote, playSound } from '@playroom/kit';

/** Notes of a major scale, so a run of tickles climbs into a little tune. */
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
const SHOT_GAP_MS = 240;
const GIGGLE_GAP_MS = 120;

let lastShot = 0;
let lastGiggle = 0;

function later(ms: number, play: () => void): void {
  setTimeout(play, ms);
}

function run(notes: number[], gapMs: number, wave: OscillatorType, seconds: number, gain: number): void {
  notes.forEach((hz, i) => later(i * gapMs, () => playNote(hz, { wave, seconds, gain })));
}

/** A soft puff, kept quiet and thinned out because it never stops. */
export function shotSound(bubble: boolean): void {
  const now = performance.now();
  if (now - lastShot < SHOT_GAP_MS) return;
  lastShot = now;
  playNote(bubble ? 620 : 420, { wave: 'sine', seconds: 0.05, gain: 0.08 });
}

/** A falling "hee-hee-hee", higher as the combo climbs. Only so many at once, so it never turns to noise. */
export function giggleSound(combo: number): void {
  const now = performance.now();
  if (now - lastGiggle < GIGGLE_GAP_MS) return;
  lastGiggle = now;
  const top = SCALE[Math.min(combo, SCALE.length - 1)];
  run([top * 1.5, top * 1.3, top * 1.5, top * 1.2], 55, 'triangle', 0.07, 0.4);
}

export function nudgeSound(): void {
  playSound('pop');
}

export function starSound(step: number): void {
  playNote(SCALE[step % SCALE.length] * 2, { wave: 'sine', seconds: 0.1, gain: 0.3 });
}

export function gooSound(): void {
  playSound('boing');
  later(130, () => playSound('toot'));
}

export function powerSound(): void {
  run([659, 784, 1047, 1319], 60, 'triangle', 0.14, 0.5);
}

export function stormSound(): void {
  playSound('whoosh');
  run([523, 659, 784, 1047, 784, 1047, 1319, 1568], 75, 'triangle', 0.13, 0.5);
}

export function bossSound(): void {
  run([98, 92, 87, 82], 240, 'sawtooth', 0.3, 0.4);
}

/** A big deep "ho ho", which gets longer the more the boss has cracked. */
export function bossGiggleSound(stage: number): void {
  const count = stage === 1 ? 3 : 6;
  for (let i = 0; i < count; i++) {
    later(i * 170, () => playNote(150 + i * 12 + stage * 30, { wave: 'triangle', seconds: 0.14, gain: 0.7 }));
  }
}

export function bossHitSound(): void {
  const now = performance.now();
  if (now - lastGiggle < GIGGLE_GAP_MS * 2) return;
  lastGiggle = now;
  playNote(180 + Math.random() * 60, { wave: 'triangle', seconds: 0.07, gain: 0.3 });
}

export function sneezeSound(): void {
  run([300, 420, 560], 130, 'triangle', 0.12, 0.5);
  later(480, () => {
    playSound('whoosh');
    playSound('burp');
  });
}

export function highFiveSound(): void {
  playSound('bonk');
  playSound('pop');
  later(90, () => playSound('tada'));
}

export function goldenSound(): void {
  run([2093, 1760, 2349, 1760, 2637, 2093, 2794, 2349], 70, 'sine', 0.07, 0.4);
}

/** A rising and falling "meee-ow", which is about as close as a sine wave gets. */
export function catSound(): void {
  run([620, 760, 900, 980, 880, 700], 75, 'sine', 0.1, 0.45);
}

export function finishSound(): void {
  playSound('tada');
}

export function bestSound(): void {
  later(700, () => playSound('ding'));
}

export function friendSound(): void {
  later(100, () => playSound('ding'));
}

export function tapSound(): void {
  playSound('pop');
}

/** One soft bass thump of the backing beat. */
export function beatSound(step: number, high: boolean): void {
  const roots = [131, 131, 165, 147];
  playNote(roots[step % roots.length] / 2, { wave: 'triangle', seconds: 0.12, gain: high ? 0.4 : 0.26 });
}
