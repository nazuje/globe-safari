import '@playroom/kit/kit.css';
import './style.css';
import { LANGUAGES, setLanguage, store, type Language } from '@playroom/kit';
import {
  AGES,
  NO_FILTERS,
  applyFilter,
  languagesIn,
  restoreFilter,
  skillsIn,
  tileLanguages,
  type Filters,
} from './filter.ts';
import { GAMES, MODE_LABELS, SKILL_LABELS, type Game, type Mode } from './games.ts';

const FILTER_KEYS: Record<keyof Filters, string> = {
  mode: 'portal-mode',
  age: 'portal-age',
  skill: 'portal-filter',
  language: 'portal-language',
};

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

const filters = byId('filters');
const tiles = byId('tiles');
const skills = skillsIn(GAMES);
const languages = languagesIn(GAMES);
const modes = Object.keys(MODE_LABELS) as Mode[];
const empty = byId('empty');
let current: Filters = {
  mode: restoreFilter(store.get<unknown>(FILTER_KEYS.mode, null), modes),
  age: restoreFilter(store.get<unknown>(FILTER_KEYS.age, null), AGES),
  skill: restoreFilter(store.get<unknown>(FILTER_KEYS.skill, null), skills),
  language: restoreFilter(store.get<unknown>(FILTER_KEYS.language, null), languages),
};

function text(tag: string, className: string, content: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = content;
  return node;
}

function modeBadge(mode: Mode): HTMLElement {
  const { emoji, label } = MODE_LABELS[mode];
  const badge = text('span', 'tile-chip tile-mode', emoji);
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', label);
  badge.title = label;
  return badge;
}

function languageBadge(shown: Language[]): HTMLElement {
  const label = shown.map((language) => LANGUAGES[language].name).join(', ');
  const badge = text('span', 'tile-chip tile-language', shown.map((language) => LANGUAGES[language].flag).join(' '));
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', label);
  badge.title = label;
  return badge;
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
  chips.append(
    text('span', 'tile-chip tile-age', `Ages ${game.ages}`),
    ...game.modes.map(modeBadge),
    ...game.skills.map((skill) => text('span', 'tile-chip', SKILL_LABELS[skill])),
  );
  const shownLanguages = tileLanguages(game);
  if (shownLanguages.length > 0) chips.append(languageBadge(shownLanguages));
  card.append(emoji, text('span', 'tile-title', game.title), text('span', 'tile-tagline', game.tagline), chips);
  if (!ready) card.append(text('span', 'tile-ribbon', 'Soon!'));

  const item = document.createElement('li');
  item.append(card);
  return item;
}

function renderTiles(): void {
  const shown = applyFilter(GAMES, current);
  tiles.replaceChildren(...shown.map(tile));
  empty.hidden = shown.length > 0;
}

function renderFilters(): void {
  for (const button of filters.querySelectorAll('button')) {
    const key = button.dataset.key as keyof Filters;
    const pressed = button.dataset.value === String(current[key]);
    button.setAttribute('aria-pressed', String(pressed));
    // A remembered chip may sit past the edge of a row that scrolls sideways.
    if (pressed) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function choose(next: Filters): void {
  current = next;
  for (const key of Object.keys(FILTER_KEYS) as (keyof Filters)[]) store.set(FILTER_KEYS[key], next[key]);
  renderFilters();
  renderTiles();
}

function filterRow<K extends keyof Filters>(
  key: K,
  label: string,
  options: [Filters[K], string][],
  onChosen?: (value: Filters[K]) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'filter-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', label);
  row.append(
    ...options.map(([value, chipLabel]) => {
      const button = text('button', 'filter', chipLabel) as HTMLButtonElement;
      button.type = 'button';
      button.dataset.key = key;
      button.dataset.value = String(value);
      button.addEventListener('click', () => {
        onChosen?.(value);
        choose({ ...current, [key]: value });
      });
      return button;
    }),
  );
  return row;
}

filters.append(
  filterRow('mode', 'Who is playing', [
    ['all', 'All'],
    ...modes.map((mode): [Mode, string] => [mode, `${MODE_LABELS[mode].emoji} ${MODE_LABELS[mode].label}`]),
  ]),
  filterRow('age', 'Age', [['all', 'All ages'], ...AGES.map((age): [Filters['age'], string] => [age, `Age ${age}`])]),
  filterRow('skill', 'Skill', [['all', '🌈 All'], ...skills.map((skill): [Filters['skill'], string] => [skill, SKILL_LABELS[skill]])]),
);
// One language is nothing to choose between, so the row waits for a second one.
if (languages.length > 1) {
  filters.append(
    filterRow(
      'language',
      'Language',
      [
        ['all', 'All'],
        ...languages.map((language): [Language, string] => [language, `${LANGUAGES[language].flag} ${LANGUAGES[language].name}`]),
      ],
      (language) => {
        // A game opened from here starts in this language. "All" leaves the choice alone.
        if (language !== 'all') setLanguage(language);
      },
    ),
  );
}
byId('show-all').addEventListener('click', () => {
  choose(NO_FILTERS);
  filters.querySelector('button')?.focus();
});
renderFilters();
renderTiles();
