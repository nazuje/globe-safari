import { el } from './dom.ts';

const PIECES = ['⭐', '🌟', '✨', '🎉', '💫'];

/** A happy little star burst from the middle of an element. */
export function starBurst(target: HTMLElement, count = 18): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const burst = el('div', { className: 'burst', attrs: { 'aria-hidden': 'true' } });
  const pieces = reduced ? 3 : count;

  for (let i = 0; i < pieces; i++) {
    const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 70 + Math.random() * 90;
    const piece = el('span', { className: 'burst-piece', text: PIECES[i % PIECES.length] });
    piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    piece.style.setProperty('--spin', `${Math.round(Math.random() * 360 - 180)}deg`);
    burst.append(piece);
  }

  target.append(burst);
  window.setTimeout(() => burst.remove(), 1400);
}
