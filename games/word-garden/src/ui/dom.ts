type Child = Node | string | null | undefined | false;

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  onClick?: () => void;
}

/** Creates an element with optional class, text, attributes, click handler and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value);
  const onClick = options.onClick;
  if (onClick) node.addEventListener('click', onClick);
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

export function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  return el('button', { className, text: label, attrs: { type: 'button' }, onClick });
}

export function prefersCalm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function centerOf(target: Element): { x: number; y: number } {
  const box = target.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Sends `piece`, a new element, flying from one element to another, and removes
 * it on landing. It is fixed to the page, so nothing clips it, and it lands at once for people who prefer reduced motion.
 */
export async function fly(piece: HTMLElement, from: Element, to: Element, duration = 280): Promise<void> {
  if (prefersCalm()) return;
  const start = centerOf(from);
  const end = centerOf(to);
  piece.classList.add('flyer');
  piece.style.left = `${start.x}px`;
  piece.style.top = `${start.y}px`;
  document.body.append(piece);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const flight = piece.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)' },
      { transform: `translate(calc(-50% + ${dx / 2}px), calc(-50% + ${dy / 2 - 30}px)) scale(1.1)`, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)` },
    ],
    { duration, easing: 'ease-in-out', fill: 'forwards' },
  );
  await flight.finished.catch(() => undefined);
  piece.remove();
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
