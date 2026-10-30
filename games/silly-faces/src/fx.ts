import { calm } from './tap.ts';

const MAX_PIECES = 60;
const CONFETTI_COLORS = ['#ff6b6b', '#ffc93c', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff8fb1'];

let layer: HTMLElement | null = null;

function fxLayer(): HTMLElement {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
}

function release(piece: HTMLElement, animation: Animation): void {
  void animation.finished.catch(() => undefined).finally(() => piece.remove());
}

export interface PuffOptions {
  dx?: number;
  dy?: number;
  ms?: number;
  size?: number;
}

/** One emoji floating away from a point on screen. Mashing just stops adding more until some are gone. */
export function puff(glyph: string, x: number, y: number, { dx = 0, dy = -70, ms = 900, size = 40 }: PuffOptions = {}): void {
  const parent = fxLayer();
  if (parent.childElementCount >= MAX_PIECES) return;
  const piece = document.createElement('span');
  piece.className = 'fx-piece';
  piece.textContent = glyph;
  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  piece.style.fontSize = `${size}px`;
  parent.append(piece);
  const spread = calm() ? 0 : 1;
  release(
    piece,
    piece.animate(
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.4)' },
        { opacity: 1, offset: 0.15, transform: 'translate(-50%, -50%) scale(1.1)' },
        { opacity: 0, transform: `translate(calc(-50% + ${dx * spread}px), calc(-50% + ${dy * spread}px)) scale(1)` },
      ],
      { duration: ms, easing: 'ease-out', fill: 'forwards' },
    ),
  );
}

/** A few of them, flying outward from a point. */
export function spray(glyph: string, x: number, y: number, count: number, reach = 110): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    puff(glyph, x, y, { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach - 30, size: 26 + Math.random() * 18 });
  }
}

/** Paper falling from the top of the screen. */
export function confetti(count = 26): void {
  const parent = fxLayer();
  const pieces = Math.min(calm() ? 6 : count, MAX_PIECES - parent.childElementCount);
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement('span');
    piece.className = 'fx-paper';
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length]!;
    parent.append(piece);
    const fall = window.innerHeight + 40;
    const drift = (Math.random() - 0.5) * 120;
    const turns = 360 + Math.random() * 720;
    const frames = calm()
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { transform: 'translateY(-30px) rotate(0)' },
          { transform: `translate(${drift}px, ${fall}px) rotate(${turns}deg)` },
        ];
    release(
      piece,
      piece.animate(frames, { duration: 1400 + Math.random() * 900, delay: Math.random() * 400, easing: 'ease-in', fill: 'both' }),
    );
  }
}
