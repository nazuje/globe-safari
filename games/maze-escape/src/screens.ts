import { burst, speak } from '@playroom/kit';
import { CHARACTER_ICONS, CHARACTER_IDS, type CharacterId } from './characters.ts';
import type { Idea } from './level.ts';
import { LEVELS } from './levels.ts';
import { nextLevel, type Progress } from './progress.ts';
import type { Cause } from './run.ts';
import { pickSound } from './sounds.ts';
import { text } from './lang/index.ts';
import { SETTINGS, type Setting } from './tuning.ts';
import { button, element } from './ui.ts';

const bare = (line: string): string => line.replace('!', '');
const LOST_ART: Record<Cause, string> = { robot: '🤖', camera: '📷', sensor: '🚨', laser: '⚡' };
const IDEA_ART: Record<Idea, string> = { maze: '🚪', robot: '🤖', camera: '📷', sensor: '🟥', laser: '⚡', box: '📦', disco: '🪩', sweep: '🔦', mix: '🌟' };
const SETTING_ART: Record<Setting, string> = { easy: '🐢', hard: '🚀' };
/** Hidden treasures, by level. */
export const TREASURES: Record<number, string> = { 7: '🦆', 10: '👑', 12: '💎' };
/** Long enough for a held finger to lift, or a mashing hand to stop, before a button can go. */
const RETRY_AFTER_MS = 350;
const NEXT_AFTER_MS = 1000;
const STAR_GAP_MS = 320;

export function showCharacters(host: HTMLElement, pictures: Partial<Record<CharacterId, string>>, onPick: (id: CharacterId) => void): () => void {
  const panel = element('div', 'picker');
  const grid = element('div', 'hero-grid');
  for (const id of CHARACTER_IDS) {
    const card = button('hero-card');
    card.dataset.hero = id;
    card.setAttribute('aria-label', bare(text().characters[id]));
    const picture = pictures[id];
    if (picture) {
      const image = element('img', 'hero-picture');
      image.src = picture;
      image.alt = '';
      image.draggable = false;
      card.append(image);
    } else {
      const icon = element('span', 'hero-icon');
      icon.textContent = CHARACTER_ICONS[id];
      card.append(icon);
    }
    const name = element('span', 'hero-name');
    name.textContent = bare(text().characters[id]);
    card.append(name);
    card.addEventListener('click', () => {
      pickSound();
      speak(text().characters[id]);
      onPick(id);
    });
    grid.append(card);
  }
  panel.append(grid);
  host.append(panel);
  return () => panel.remove();
}

export interface MapOptions {
  progress: Progress;
  setting: Setting;
  onSetting: (setting: Setting) => void;
  onLevel: (level: number) => void;
}

function levelTile(level: number, options: MapOptions): HTMLButtonElement {
  const { progress, setting } = options;
  const data = LEVELS[level - 1];
  const stars = progress.stars[setting][level - 1] ?? 0;
  const tile = button(level === nextLevel(progress, setting) ? 'level-tile level-next' : 'level-tile');
  tile.dataset.level = String(level);
  tile.setAttribute('aria-label', text().level(level));
  const number = element('span', 'level-number');
  number.textContent = String(level);
  const art = element('span', 'level-art');
  art.textContent = data ? IDEA_ART[data.idea] : '';
  const row = element('span', 'level-stars');
  row.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  tile.append(art, number, row);
  tile.addEventListener('click', () => {
    pickSound();
    options.onLevel(level);
  });
  return tile;
}

function settingRow(options: MapOptions): HTMLElement {
  const row = element('div', 'setting-row');
  for (const setting of SETTINGS) {
    const choice = button(setting === options.setting ? 'setting-btn setting-on' : 'setting-btn');
    choice.dataset.setting = setting;
    choice.setAttribute('aria-pressed', String(setting === options.setting));
    choice.textContent = `${SETTING_ART[setting]} ${bare(text().settings[setting])}`;
    choice.addEventListener('click', () => {
      pickSound();
      speak(text().settings[setting]);
      options.onSetting(setting);
    });
    row.append(choice);
  }
  return row;
}

function treasureShelf(progress: Progress): HTMLElement {
  const shelf = element('div', 'treasure-shelf');
  shelf.setAttribute('aria-label', text().treasures);
  for (const [level, icon] of Object.entries(TREASURES)) {
    const spot = element('span', progress.treasures.includes(Number(level)) ? 'treasure treasure-found' : 'treasure');
    spot.textContent = progress.treasures.includes(Number(level)) ? icon : '❔';
    shelf.append(spot);
  }
  return shelf;
}

export function showMap(host: HTMLElement, options: MapOptions): () => void {
  const panel = element('div', 'map');
  const top = element('div', 'map-top');
  top.append(settingRow(options), treasureShelf(options.progress));
  const grid = element('div', 'level-grid');
  LEVELS.forEach((_, index) => grid.append(levelTile(index + 1, options)));
  panel.append(top, grid);
  host.append(panel);
  return () => panel.remove();
}

function arm(action: HTMLButtonElement, after: number, onPress: () => void): number {
  action.disabled = true;
  action.addEventListener('pointerdown', () => {
    if (!action.disabled) onPress();
  });
  action.addEventListener('click', (event) => {
    // A keyboard's Enter arrives only as a click.
    if (!action.disabled && event.detail === 0) onPress();
  });
  return window.setTimeout(() => {
    action.disabled = false;
    action.focus({ preventScroll: true });
  }, after);
}

export function showLost(host: HTMLElement, cause: Cause, onRetry: () => void): () => void {
  const panel = element('div', 'lost');
  const bubble = element('div', 'lost-bubble');
  bubble.textContent = LOST_ART[cause];
  const again = button('btn-big btn-retry');
  again.dataset.action = 'retry';
  const drawText = (): void => {
    again.textContent = `🔁 ${text().retry}`;
  };
  drawText();
  panel.append(bubble, again);
  host.append(panel);
  const timer = arm(again, RETRY_AFTER_MS, onRetry);
  speak(text().lost[cause]);
  return () => {
    window.clearTimeout(timer);
    panel.remove();
  };
}

export interface ResultOptions {
  stars: number;
  newTreasure: string | null;
  last: boolean;
  onNext: () => void;
}

export function showResult(host: HTMLElement, options: ResultOptions): () => void {
  const { stars, newTreasure, last, onNext } = options;
  const panel = element('div', 'result');
  const row = element('div', 'result-stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${stars} / 3`);
  for (let index = 0; index < 3; index += 1) {
    const star = element('span', index < stars ? 'result-star result-star-on' : 'result-star');
    star.textContent = '★';
    star.style.animationDelay = `${index * STAR_GAP_MS}ms`;
    row.append(star);
  }
  panel.append(row);
  if (newTreasure) {
    const find = element('p', 'result-find');
    find.textContent = newTreasure;
    panel.append(find);
  }
  const next = button('btn-big btn-next');
  next.dataset.action = 'next';
  next.textContent = last ? `🗺️ ${text().allDone}` : `➡️ ${text().next}`;
  panel.append(next);
  host.append(panel);
  const timers = [arm(next, NEXT_AFTER_MS, onNext)];
  for (let index = 0; index < stars; index += 1) {
    timers.push(window.setTimeout(() => burst(window.innerWidth / 2 + (index - 1) * 90, window.innerHeight * 0.34, 18), index * STAR_GAP_MS));
  }
  speak([text().stars1, text().stars2, text().stars3][stars - 1] ?? text().stars1);
  return () => {
    timers.forEach((timer) => window.clearTimeout(timer));
    panel.remove();
  };
}
