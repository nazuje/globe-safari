import { playNote, playSound } from '@playroom/kit';
import type { BallId } from './balls.ts';
import { clackFor } from './impact.ts';

const MOST_CLACKS_PER_FRAME = 3;
const GIGGLE_NOTES = [1180, 1380, 1120, 1420, 1240];
const GIGGLE_GAP_MS = 62;
const WHOA_NOTES = [660, 590, 500, 410];
const WHOA_GAP_MS = 80;
const SQUEAK_NOTES = [1900, 2300, 2100];

const timers = new Set<ReturnType<typeof setTimeout>>();

function later(ms: number, play: () => void): void {
  const timer = setTimeout(() => {
    timers.delete(timer);
    play();
  }, ms);
  timers.add(timer);
}

function sequence(notes: readonly number[], gapMs: number, wave: OscillatorType, gain: number): void {
  notes.forEach((hz, index) => later(index * gapMs, () => playNote(hz, { wave, seconds: gapMs / 900, gain })));
}

export interface Hit {
  speed: number;
  size: number;
  jelly: boolean;
}

/** Plays only the loudest hits of a frame: a pile of forty blocks shouldn't be forty oscillators. */
export function playHits(hits: Hit[]): void {
  hits.sort((a, b) => b.speed - a.speed);
  for (const { speed, size, jelly } of hits.slice(0, MOST_CLACKS_PER_FRAME)) {
    const { hz, gain, seconds } = clackFor(speed, size);
    if (jelly) {
      playNote(hz * 0.5, { wave: 'sine', seconds: 0.16, gain });
      playSound('boing');
      continue;
    }
    playNote(hz, { wave: 'triangle', seconds, gain });
    playNote(hz * 2.71, { wave: 'sine', seconds: seconds * 0.6, gain: gain * 0.45 });
    if (speed > 8) playNote(hz * 0.26, { wave: 'sine', seconds: 0.16, gain: gain * 0.8 });
  }
}

/** The ball's own landing, the deep part of a crash. */
export function playBallHit(ball: BallId, speed: number): void {
  const force = Math.min(speed / 26, 1);
  if (ball === 'beach' || ball === 'basket') {
    playSound('boing');
    return;
  }
  if (ball === 'slime') {
    playSound('burp');
    return;
  }
  playNote(ball === 'tiny' ? 120 : 58, { wave: 'sine', seconds: 0.5, gain: 0.5 + force * 0.5 });
  playNote(ball === 'tiny' ? 230 : 96, { wave: 'triangle', seconds: 0.26, gain: 0.3 + force * 0.4 });
  playSound('bonk');
}

export const playThrow = (): void => playSound('whoosh');
export const playPop = (): void => {
  playSound('pop');
  playNote(1400 + Math.random() * 500, { wave: 'sine', seconds: 0.08, gain: 0.5 });
};
export const playGiggle = (): void => sequence(GIGGLE_NOTES, GIGGLE_GAP_MS, 'sine', 0.5);
export const playWhoa = (): void => sequence(WHOA_NOTES, WHOA_GAP_MS, 'triangle', 0.55);
export const playSqueak = (): void => sequence(SQUEAK_NOTES, 70, 'sine', 0.35);
export const playSlowMotion = (): void => {
  playNote(70, { wave: 'sine', seconds: 1.1, gain: 0.8 });
  playNote(46, { wave: 'triangle', seconds: 1.2, gain: 0.5 });
};
export const playWaveComing = (): void => playSound('whoosh');
export const playWaveThump = (): void => {
  playNote(52, { wave: 'sine', seconds: 0.55, gain: 1 });
  playNote(88, { wave: 'triangle', seconds: 0.3, gain: 0.7 });
  playSound('bonk');
};
export const playSoftTap = (): void => playNote(520, { wave: 'sine', seconds: 0.05, gain: 0.2 });

export function stopSounds(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
}
