import { playNote, playSound } from '@playroom/kit';
import type { Place } from './places.ts';

export function calm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function center(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function floating(x: number, y: number, className: string): HTMLElement {
  const piece = document.createElement('div');
  piece.className = `floating ${className}`;
  piece.setAttribute('aria-hidden', 'true');
  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  document.body.append(piece);
  return piece;
}

/** Bits of ground flying out of a tile, in the colors of the place. */
export function dirt(tile: Element, place: Place, amount: number): void {
  const { x, y } = center(tile);
  const pieces = calm() ? 2 : amount;
  for (let i = 0; i < pieces; i++) {
    const fleck = floating(x, y, 'fleck');
    const emoji = i === 0 && Math.random() < 0.3;
    if (emoji) fleck.textContent = place.fleckEmoji;
    else fleck.style.background = place.flecks[i % 2] as string;
    const size = 8 + Math.random() * 10;
    if (!emoji) fleck.style.width = fleck.style.height = `${size}px`;
    const dx = (Math.random() - 0.5) * 150;
    const rise = 50 + Math.random() * 70;
    void fleck
      .animate(
        [
          { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% - ${rise}px)) rotate(120deg)`, opacity: 1, offset: 0.5 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + 40px)) rotate(260deg)`, opacity: 0 },
        ],
        { duration: 420 + Math.random() * 180, easing: 'ease-out' },
      )
      .finished.catch(() => undefined)
      .then(() => fleck.remove());
  }
}

/**
 * A find jumps out of its hole, shows itself large for a moment, then flies to
 * where it belongs. It takes no taps, so digging can carry on around it.
 */
export function showOff(from: Element, html: string, to: Element | null, onLand: () => void): void {
  const start = center(from);
  const piece = floating(start.x, start.y, 'find');
  piece.innerHTML = html;
  const end = to ? center(to) : { x: start.x, y: start.y - 120 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const place = (x: number, y: number, scale: number): string =>
    `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
  const frames = calm()
    ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
    : [
        { transform: place(0, 0, 0.3), opacity: 1 },
        { transform: place(0, -70, 1.7), opacity: 1, offset: 0.22, easing: 'ease-out' },
        { transform: place(0, -70, 1.5), opacity: 1, offset: 0.55, easing: 'ease-in' },
        { transform: place(dx, dy, 0.5), opacity: 1 },
      ];
  void piece
    .animate(frames, { duration: 1150 })
    .finished.catch(() => undefined)
    .then(() => {
      piece.remove();
      onLand();
    });
}

/** A find that just pops up, wobbles and goes: a silly thing under a tile. */
export function peek(from: Element, html: string): void {
  const { x, y } = center(from);
  const piece = floating(x, y, 'find peek');
  piece.innerHTML = html;
  void piece
    .animate(
      [
        { transform: 'translate(-50%, -30%) scale(0.4)', opacity: 0 },
        { transform: 'translate(-50%, -80%) scale(1.15)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -80%) scale(1.15) rotate(-10deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(-50%, -80%) scale(1.15) rotate(10deg)', opacity: 1, offset: 0.65 },
        { transform: 'translate(-50%, -30%) scale(0.6)', opacity: 0 },
      ],
      { duration: 1100 },
    )
    .finished.catch(() => undefined)
    .then(() => piece.remove());
}

/** A friend stays in its hole a while, then goes back down. */
export function friendVisit(hole: HTMLElement, html: string, kind: string, staysMs: number): void {
  const friend = document.createElement('div');
  friend.className = `friend ${kind}`;
  friend.setAttribute('aria-hidden', 'true');
  friend.innerHTML = html;
  hole.append(friend);
  window.setTimeout(() => {
    friend.classList.add('leaving');
    window.setTimeout(() => friend.remove(), 420);
  }, staysMs);
}

/** The rocket shoots straight off the top of the screen before coming back as a tray find. */
export function launch(from: Element, html: string): void {
  const { x, y } = center(from);
  const piece = floating(x, y, 'find');
  piece.innerHTML = html;
  void piece
    .animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: `translate(calc(-50% + 30px), calc(-50% - ${y + 120}px)) scale(1.5)` },
      ],
      { duration: calm() ? 1 : 800, easing: 'ease-in' },
    )
    .finished.catch(() => undefined)
    .then(() => piece.remove());
}

// ---------- Sounds made from kit's notes ---------- //

function tune(notes: [hz: number, atMs: number][], wave: OscillatorType, seconds: number, gain = 0.6): void {
  for (const [hz, at] of notes) {
    if (at === 0) playNote(hz, { wave, seconds, gain });
    else window.setTimeout(() => playNote(hz, { wave, seconds, gain }), at);
  }
}

export const sounds = {
  giggle: () => tune([[880, 0], [1040, 90], [820, 180], [1100, 270], [900, 360]], 'triangle', 0.08),
  yawn: () => tune([[420, 0], [360, 180], [300, 360], [240, 540], [190, 720]], 'sine', 0.24, 0.5),
  sparkle: () => tune([[1480, 0], [1760, 90], [2093, 180]], 'sine', 0.16, 0.3),
  gem: () => tune([[1047, 0], [1319, 80], [1568, 160], [2093, 240]], 'triangle', 0.18, 0.5),
  /** Climbs with every tap on the chest or egg. */
  climb: (step: number) => playNote(330 * 2 ** (step / 8), { wave: 'triangle', seconds: 0.16, gain: 0.6 }),
  hatch: () => tune([[523, 0], [659, 110], [784, 220], [1047, 330], [1319, 440]], 'triangle', 0.22),
  roar: () => tune([[220, 0], [262, 120], [196, 240]], 'sawtooth', 0.2, 0.25),
  empty: () => playSound('pop'),
};

export { center };
