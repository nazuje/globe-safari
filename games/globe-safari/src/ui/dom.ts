type Child = Node | string | null | undefined | false;

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  onClick?: (event: Event) => void;
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
  if (options.onClick) node.addEventListener('click', options.onClick);
  for (const child of children) {
    if (child) node.append(child);
  }
  return node;
}

/** A big, chunky button with an optional emoji. */
export function bigButton(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  return el('button', { className: `big-btn ${className}`.trim(), text: label, attrs: { type: 'button' }, onClick });
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
