import '@playroom/kit/kit.css';
import './style.css';
import { store } from '@playroom/kit';
import { applyFilter, restoreFilter, skillsIn, type Filter } from './filter.ts';
import { GAMES, SKILL_LABELS, type Game } from './games.ts';

const FILTER_KEY = 'portal-filter';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

const filters = byId('filters');
const tiles = byId('tiles');
const skills = skillsIn(GAMES);
let current = restoreFilter(store.get<unknown>(FILTER_KEY, null), skills);

function text(tag: string, className: string, content: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

function tile(game: Game): HTMLLIElement {
  const ready = game.status === 'ready';
  const card = document.createElement(ready ? 'a' : 'div');
  card.className = ready ? 'tile' : 'tile is-soon';
  card.style.setProperty('--accent', game.color);
  if (card instanceof HTMLAnchorElement) card.href = `./${game.slug}/`;

  const emoji = text('span', 'tile-emoji', game.emoji);
  emoji.setAttribute('aria-hidden', 'true');
  const chips = document.createElement('span');
  chips.className = 'tile-chips';
  chips.append(...game.skills.map((skill) => text('span', 'tile-chip', SKILL_LABELS[skill])));
  card.append(emoji, text('span', 'tile-title', game.title), text('span', 'tile-tagline', game.tagline), chips);
  if (!ready) card.append(text('span', 'tile-ribbon', 'Soon!'));

  const item = document.createElement('li');
  item.append(card);
  return item;
}

function renderTiles(): void {
  tiles.replaceChildren(...applyFilter(GAMES, current).map(tile));
}

function chip(value: Filter, label: string): HTMLButtonElement {
  const button = text('button', 'filter', label) as HTMLButtonElement;
  button.type = 'button';
  button.dataset.filter = value;
  button.addEventListener('click', () => {
    current = value;
    store.set(FILTER_KEY, value);
    renderFilters();
    renderTiles();
  });
  return button;
}

function renderFilters(): void {
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === current));
  }
}

filters.append(chip('all', '🌈 All'), ...skills.map((skill) => chip(skill, SKILL_LABELS[skill])));
renderFilters();
renderTiles();
