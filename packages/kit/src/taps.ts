// A real tap, in the events that count as one on iOS: it ignores pointerdown and touchstart.
const TAP_EVENTS = ['touchend', 'click'] as const;

const listeners = new Set<() => void>();
let watching = false;

function tapped(): void {
  for (const listener of listeners) listener();
}

/** Runs on every tap, before the game's own handlers, so a game's tap can rely on what this did. */
export function onEveryTap(listener: () => void): void {
  listeners.add(listener);
  if (watching || typeof document === 'undefined') return;
  watching = true;
  for (const type of TAP_EVENTS) document.addEventListener(type, tapped, true);
}
