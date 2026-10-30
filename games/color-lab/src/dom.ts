export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(className: string, text: string, onTap: (event: MouseEvent) => void): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onTap);
  return node;
}

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export function prefersCalm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Waits for an animation step. People who prefer calm get a near-instant version. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, prefersCalm() ? ms * 0.1 : ms));
}

/** Plays a one-shot CSS animation class again, even if it just ran. */
export function replayClass(node: HTMLElement, className: string): void {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

/** The middle of an element on screen, for burst(). */
export function centerOf(node: HTMLElement): { x: number; y: number } {
  const box = node.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}
