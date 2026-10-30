/** How long a food takes to reach the mouth, or to bounce back from it. */
export const FLY_MS = 380;
export const BOUNCE_MS = 620;

function centerOf(element: Element): { x: number; y: number } {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function launch(emoji: string, frames: Keyframe[], duration: number): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flyer = document.createElement('div');
  flyer.className = 'flyer';
  flyer.textContent = emoji;
  flyer.setAttribute('aria-hidden', 'true');
  document.body.append(flyer);
  // Keeps the last frame on screen after the animation, until the element goes.
  const animation = flyer.animate(frames, { duration: reduced ? 1 : duration, easing: 'ease-in-out', fill: 'both' });
  animation.onfinish = () => flyer.remove();
  animation.oncancel = () => flyer.remove();
}

/** Throws a food in a little arc from the plate into the mouth. */
export function flyIn(emoji: string, from: Element, to: Element): void {
  const start = centerOf(from);
  const end = centerOf(to);
  const lift = Math.min(start.y, end.y) - 40;
  launch(
    emoji,
    [
      { transform: `translate(${start.x}px, ${start.y}px) translate(-50%, -50%) scale(1)` },
      { transform: `translate(${(start.x + end.x) / 2}px, ${lift}px) translate(-50%, -50%) scale(1.2) rotate(120deg)` },
      { transform: `translate(${end.x}px, ${end.y}px) translate(-50%, -50%) scale(0.35) rotate(300deg)` },
    ],
    FLY_MS,
  );
}

/** Sneezes a food out of the mouth, so it bounces back onto the plate. */
export function bounceBack(emoji: string, from: Element, to: Element): void {
  const start = centerOf(from);
  const end = centerOf(to);
  const midX = (start.x + end.x) / 2;
  const hop = end.y - 70;
  launch(
    emoji,
    [
      { transform: `translate(${start.x}px, ${start.y}px) translate(-50%, -50%) scale(0.4)`, offset: 0 },
      { transform: `translate(${midX}px, ${end.y}px) translate(-50%, -50%) scale(1.15) rotate(-200deg)`, offset: 0.45 },
      { transform: `translate(${(midX + end.x) / 2}px, ${hop}px) translate(-50%, -50%) scale(1.1) rotate(-280deg)`, offset: 0.7 },
      { transform: `translate(${end.x}px, ${end.y}px) translate(-50%, -50%) scale(1) rotate(-360deg)`, offset: 1 },
    ],
    BOUNCE_MS,
  );
}
