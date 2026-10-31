export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

export function button(className: string): HTMLButtonElement {
  const made = element('button', className);
  made.type = 'button';
  return made;
}
