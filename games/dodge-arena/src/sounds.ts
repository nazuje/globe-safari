import { playNote, playSound } from '@playroom/kit';
import type { Kind } from './dangers.ts';
import type { RunEvent, Surprise } from './run.ts';

/** Each danger has its own warning sound, so an ear can tell what's coming before the eye finds it. */
const WARNINGS: Record<Kind, () => void> = {
  meteor: () => playNote(880, { wave: 'sine', seconds: 0.5, gain: 0.25 }),
  boulder: () => playNote(82, { wave: 'sawtooth', seconds: 0.45, gain: 0.5 }),
  beam: () => {
    playNote(1240, { wave: 'square', seconds: 0.12, gain: 0.14 });
    playNote(1650, { wave: 'square', seconds: 0.12, gain: 0.1 });
  },
  ring: () => playNote(330, { wave: 'triangle', seconds: 0.6, gain: 0.5 }),
  bar: () => playNote(165, { wave: 'square', seconds: 0.3, gain: 0.25 }),
  slime: () => playSound('burp'),
};

const SURPRISES: Record<Surprise, () => void> = {
  heart: () => playSound('ding'),
  slow: () => playSound('whoosh'),
  golden: () => playSound('tada'),
  ufo: () => playNote(990, { wave: 'sine', seconds: 0.5, gain: 0.3 }),
};

export function soundFor(event: RunEvent): void {
  switch (event.type) {
    case 'warn':
      WARNINGS[event.kind]();
      break;
    case 'bonk':
      playSound('bonk');
      playSound('boing');
      break;
    case 'leap':
      playSound('whoosh');
      break;
    case 'land':
    case 'sparkle':
      playSound('pop');
      break;
    case 'shielded':
      playSound('ding');
      break;
    case 'blast':
      if (event.kind === 'slime') playSound('pop');
      else playSound('dig');
      break;
    case 'pickup':
      playSound('ding');
      break;
    case 'surprise':
      SURPRISES[event.kind]();
      break;
    case 'wave':
      playNote(523, { wave: 'triangle', seconds: 0.25, gain: 0.5 });
      break;
    case 'won':
      playSound('tada');
      break;
    case 'lost':
      playSound('toot');
      break;
  }
}
