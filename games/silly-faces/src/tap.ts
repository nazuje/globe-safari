export interface TapPoint {
  x: number;
  y: number;
}

/**
 * Runs on the finger coming down, so a tap answers within a frame and two children
 * can tap at once. Keyboards send a click with no pointer behind it, so those count too.
 */
export function onTap(element: HTMLElement, handler: (point: TapPoint) => void): void {
  element.addEventListener('pointerdown', (event) => {
    if (event.button === 0) handler({ x: event.clientX, y: event.clientY });
  });
  element.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    const box = element.getBoundingClientRect();
    handler({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
  });
}

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
