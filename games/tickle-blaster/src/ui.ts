export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

export function button(className: string, label: string): HTMLButtonElement {
  const made = element('button', className);
  made.type = 'button';
  made.textContent = label;
  return made;
}

/** Up to 3 stars. The empty ones are soft, because 1 star is still a good game. */
export function starRow(stars: number): HTMLElement {
  const row = element('span', 'star-row');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${stars} / 3`);
  for (let i = 0; i < 3; i++) {
    const star = element('span', i < stars ? 'star-on' : 'star-off');
    star.textContent = '★';
    row.append(star);
  }
  return row;
}
