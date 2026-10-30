const PIECES = ['⭐', '🌟', '✨', '🎉', '💫'];
const DURATION_MS = 1200;

function flyOut(piece: HTMLElement, dx: number, dy: number, spin: number): Animation {
  return piece.animate(
    [
      { opacity: 1, transform: 'translate(-50%, -50%) scale(0.4)' },
      { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin}deg) scale(1.1)` },
    ],
    { duration: DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' },
  );
}

function fadeAway(piece: HTMLElement, dx: number, dy: number): Animation {
  piece.style.transform = `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px))`;
  return piece.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURATION_MS, fill: 'forwards' });
}

/**
 * A happy star burst at a viewport position, such as a tap's clientX and clientY.
 * It carries its own styles, so it works with or without kit.css, and it shrinks
 * to a few gently fading stars for people who prefer reduced motion.
 */
export function burst(x: number, y: number, count = 18): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;z-index:1000`;

  const pieces = reduced ? 3 : count;
  const animations: Animation[] = [];
  for (let i = 0; i < pieces; i++) {
    const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 70 + Math.random() * 90;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const piece = document.createElement('span');
    piece.textContent = PIECES[i % PIECES.length];
    piece.style.cssText = 'position:absolute;font-size:1.8rem';
    layer.append(piece);
    animations.push(reduced ? fadeAway(piece, dx, dy) : flyOut(piece, dx, dy, Math.round(Math.random() * 360 - 180)));
  }

  document.body.append(layer);
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => layer.remove());
}
