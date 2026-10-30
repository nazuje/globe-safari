import { playNote, playSound } from '@playroom/kit';

const timers = new Set<ReturnType<typeof setTimeout>>();

function later(ms: number, play: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    play();
  }, ms);
  timers.add(timer);
}

/** Stops anything still waiting to play, for when the page goes away. */
export function hushSounds(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}

function run(notes: readonly number[], gap: number, wave: OscillatorType, gain: number, seconds = 0.09): void {
  notes.forEach((hz, index) => later(index * gap, () => playNote(hz, { wave, seconds, gain })));
}

export function throwSound(): void {
  playSound('whoosh');
}

export function missSound(): void {
  playSound('dig');
}

export function giggle(pitch = 1): void {
  run([880, 1047, 932, 1175, 1047, 1319].map((hz) => hz * pitch), 62, 'triangle', 0.32);
}

export function splatSound(): void {
  playSound('pop');
  playNote(170, { wave: 'square', seconds: 0.1, gain: 0.3 });
  later(70, () => playSound('boing'));
  if (Math.random() < 0.1) later(240, () => playSound('toot'));
}

export function rebuildSound(): void {
  run([392, 523, 659], 70, 'triangle', 0.3);
  later(240, () => giggle(0.9 + Math.random() * 0.3));
}

export function goldenSound(): void {
  run([1047, 1319, 1568, 2093], 70, 'sine', 0.5, 0.2);
}

export function friendSound(): void {
  run([988, 1319, 988, 1319], 80, 'sine', 0.4);
}

export function yetiSound(): void {
  run([196, 247, 196, 294], 150, 'triangle', 0.6, 0.18);
}

export function hatSound(): void {
  playSound('ding');
}

export function starSound(stars: number): void {
  run([784, 988, 1175].slice(0, stars), 80, 'sine', 0.5, 0.18);
}

export function lobSound(): void {
  playSound('whoosh');
}

export function glassSound(): void {
  playSound('pop');
  later(60, () => playNote(240, { wave: 'triangle', seconds: 0.14, gain: 0.4 }));
  later(240, () => giggle(1.2));
}

export function rumble(): void {
  run([70, 82, 70, 94, 70, 110], 170, 'sawtooth', 0.45, 0.2);
}

/** Each hit on the giant goes a little higher, so the end can be heard coming. */
export function giantHitSound(share: number): void {
  playSound('bonk');
  playNote(220 + share * 660, { wave: 'triangle', seconds: 0.14, gain: 0.5 });
}

export function burstSound(): void {
  playSound('tada');
  for (let i = 0; i < 6; i++) later(i * 90, () => playSound('pop'));
  later(600, () => giggle(1));
}
