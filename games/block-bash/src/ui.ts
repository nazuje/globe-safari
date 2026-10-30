export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = ''): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  if (content) made.textContent = content;
  return made;
}

export function button(className: string, content = ''): HTMLButtonElement {
  const made = element('button', className, content);
  made.type = 'button';
  return made;
}
