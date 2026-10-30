import { speak } from '@playroom/kit';
import { bestOnLevel, friendsMet, type Saved } from './collection.ts';
import { FRIENDS } from './kinds.ts';
import { text } from './lang/index.ts';
import { LEVELS, SPEED_IDS, type LevelId, type SpeedId } from './levels.ts';
import { LEVEL_ART } from './sky.ts';
import * as sounds from './sounds.ts';
import { alienArt, artIcon } from './sprites.ts';
import { element, starRow } from './ui.ts';

const SPEED_ICONS: Record<SpeedId, string> = { easy: '🐢', fast: '🐇', wild: '🚀' };

export interface MenuOptions {
  saved: Saved;
  speed: SpeedId;
  onSpeed: (speed: SpeedId) => void;
  onLevel: (level: LevelId) => void;
  onFriends: () => void;
}

function speedRow(options: MenuOptions): HTMLElement {
  const row = element('div', 'speeds');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().speedGroup);
  const buttons = SPEED_IDS.map((speed) => {
    const choice = element('button', 'speed-btn');
    choice.type = 'button';
    const icon = element('span', 'speed-icon');
    icon.textContent = SPEED_ICONS[speed];
    const name = element('span', 'speed-name');
    name.textContent = text().speeds[speed];
    choice.append(icon, name);
    choice.setAttribute('aria-pressed', String(speed === options.speed));
    choice.addEventListener('click', () => {
      for (const [index, other] of buttons.entries()) other.setAttribute('aria-pressed', String(SPEED_IDS[index] === speed));
      options.onSpeed(speed);
      sounds.tapSound();
      speak(text().speeds[speed]);
    });
    return choice;
  });
  row.append(...buttons);
  return row;
}

/** The planet to play next: the first one with no stars yet. */
function nextLevel(saved: Saved): LevelId {
  return LEVELS.find((level) => (saved.stars[level.id] ?? 0) === 0)?.id ?? LEVELS[0].id;
}

function levelCard(id: LevelId, options: MenuOptions): HTMLElement {
  const hero = id === nextLevel(options.saved);
  const card = element('button', hero ? 'level-card level-hero' : 'level-card');
  card.type = 'button';
  card.dataset.level = id;
  const name = element('span', 'level-name');
  name.textContent = text().levels[id];
  const best = bestOnLevel(options.saved, id);
  card.append(artIcon(LEVEL_ART[id], 96, 'level-art'), name, starRow(options.saved.stars[id] ?? 0));
  if (hero) {
    // A finger tapping at the planet says "start here" to someone who can't read.
    const finger = element('span', 'level-finger');
    finger.textContent = '👆';
    finger.setAttribute('aria-hidden', 'true');
    card.append(finger);
  }
  if (best > 0) {
    const score = element('span', 'level-best');
    score.textContent = `${text().best}: ${best}`;
    card.append(score);
  }
  card.addEventListener('click', () => {
    sounds.tapSound();
    options.onLevel(id);
  });
  return card;
}

function friendsButton(options: MenuOptions): HTMLElement {
  const open = element('button', 'friends-btn');
  open.type = 'button';
  const label = element('span', 'friends-label');
  label.textContent = text().friendsTitle;
  const count = element('span', 'friends-count');
  count.textContent = `${friendsMet(options.saved)} / ${FRIENDS.length}`;
  open.append(artIcon(alienArt('puff', 'laugh'), 44), label, count);
  open.addEventListener('click', () => {
    sounds.tapSound();
    options.onFriends();
  });
  return open;
}

export function showMenu(host: HTMLElement, options: MenuOptions): () => void {
  document.body.dataset.screen = 'menu';
  const menu = element('section', 'menu');
  const grid = element('div', 'levels');
  grid.append(...LEVELS.map((level) => levelCard(level.id, options)));
  menu.append(speedRow(options), grid, friendsButton(options));
  host.append(menu);
  return () => menu.remove();
}
