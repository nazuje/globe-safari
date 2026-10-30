/** Small helper for building the screen: an element, its classes and optional text. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

/** Handles a tap on pointerdown, so nothing lags, and still works from a keyboard. */
export function onTap(target: HTMLElement, handler: (event: Event) => void): void {
  target.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    handler(event);
  });
  target.addEventListener('click', (event) => {
    if (event.detail === 0) handler(event);
  });
}
