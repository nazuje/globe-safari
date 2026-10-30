import { speak } from '@playroom/kit';
import { LEVEL_IDS, type LevelId, type SurpriseKind } from './course.ts';
import { FLYER_ICONS, FLYER_IDS, type FlyerId } from './flyers.ts';
import { text } from './lang/index.ts';
import { pickSound } from './sounds.ts';
import { button, element } from './ui.ts';
import { WORLD_IDS, WORLDS, type WorldId } from './worlds.ts';

const LEVEL_ART: Record<LevelId, string> = { easy: '🐢', swoopy: '🐦', wild: '⚡' };
const hex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export const SURPRISE_ICONS: Record<SurpriseKind, string> = { whale: '🐋', tunnel: '🌈', birds: '🐦' };

export interface PickerOptions {
  pictures: Partial<Record<FlyerId, string>>;
  world: WorldId;
  level: LevelId;
  stars: number;
  found: readonly SurpriseKind[];
  onWorld: (world: WorldId) => void;
  onLevel: (level: LevelId) => void;
  onFlyer: (flyer: FlyerId) => void;
}

const bare = (line: string): string => line.replace('!', '');

function flyerCard(id: FlyerId, options: PickerOptions): HTMLButtonElement {
  const card = button('flyer-card');
  card.dataset.flyer = id;
  card.setAttribute('aria-label', text().flyers[id]);
  const picture = options.pictures[id];
  if (picture) {
    const image = element('img', 'flyer-picture');
    image.src = picture;
    image.alt = '';
    image.draggable = false;
    card.append(image);
  } else {
    const icon = element('span', 'flyer-icon');
    icon.textContent = FLYER_ICONS[id];
    card.append(icon);
  }
  const name = element('span', 'flyer-name');
  name.textContent = bare(text().flyers[id]);
  card.append(name);
  card.addEventListener('click', () => {
    pickSound();
    options.onFlyer(id);
  });
  return card;
}

function press(row: HTMLElement, chosen: HTMLElement): void {
  for (const other of row.children) other.setAttribute('aria-pressed', String(other === chosen));
}

function worldRow(options: PickerOptions): { row: HTMLElement; label: HTMLElement } {
  const row = element('div', 'worlds');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().worldGroup);
  const label = element('p', 'world-name');
  label.textContent = bare(text().worlds[options.world]);
  for (const id of WORLD_IDS) {
    const world = WORLDS[id];
    const card = button('world-btn');
    card.dataset.world = id;
    card.textContent = world.icon;
    card.style.background = `linear-gradient(180deg, ${hex(world.skyTop)}, ${hex(world.skyMid)} 60%, ${hex(world.skyLow)})`;
    card.setAttribute('aria-label', text().worlds[id]);
    card.setAttribute('aria-pressed', String(id === options.world));
    card.addEventListener('click', () => {
      pickSound();
      press(row, card);
      label.textContent = bare(text().worlds[id]);
      speak(text().worlds[id]);
      options.onWorld(id);
    });
    row.append(card);
  }
  return { row, label };
}

function levelRow(options: PickerOptions): HTMLElement {
  const row = element('div', 'levels');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().levelGroup);
  for (const id of LEVEL_IDS) {
    const card = button('level-btn');
    card.dataset.level = id;
    const art = element('span', 'level-art');
    art.textContent = LEVEL_ART[id];
    const name = element('span', 'level-name');
    name.textContent = bare(text().levels[id]);
    card.append(art, name);
    card.setAttribute('aria-pressed', String(id === options.level));
    card.addEventListener('click', () => {
      pickSound();
      press(row, card);
      speak(text().levels[id]);
      options.onLevel(id);
    });
    row.append(card);
  }
  return row;
}

function albumRow({ stars, found }: PickerOptions): HTMLElement {
  const row = element('div', 'album');
  row.setAttribute('aria-label', `${text().starsCount}: ${stars}. ${text().found}: ${found.length}`);
  row.setAttribute('role', 'img');
  const count = element('span', 'album-stars');
  count.textContent = `⭐ ${stars}`;
  row.append(count);
  for (const kind of Object.keys(SURPRISE_ICONS) as SurpriseKind[]) {
    const icon = element('span', found.includes(kind) ? 'album-icon' : 'album-icon album-hidden');
    icon.textContent = SURPRISE_ICONS[kind];
    row.append(icon);
  }
  return row;
}

/** Tap a flyer and you're flying: where and how hard stay as they were, so a 4-year-old has one thing to do. */
export function showPicker(host: HTMLElement, options: PickerOptions): () => void {
  const panel = element('div', 'pick');
  const flyers = element('div', 'flyers');
  flyers.append(...FLYER_IDS.map((id) => flyerCard(id, options)));
  const { row, label } = worldRow(options);
  const choices = element('div', 'choices');
  const worldBox = element('div', 'world-box');
  worldBox.append(row, label);
  choices.append(worldBox, levelRow(options));
  panel.append(flyers, choices, albumRow(options));
  host.append(panel);
  return () => panel.remove();
}
