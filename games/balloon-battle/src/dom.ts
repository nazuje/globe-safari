export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

/** Makes an element with a class and optional text. */
export function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  content = '',
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = content;
  return element;
}

/**
 * Runs on the press, not the release, so a tap answers within a frame. A keyboard
 * press arrives as a click with detail 0 and works too. A real tap's own click is
 * ignored, so it can't count twice.
 */
export function onTap(element: HTMLElement, run: () => void): void {
  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    run();
  });
  element.addEventListener('click', (event) => {
    if (event.detail === 0) run();
  });
}
