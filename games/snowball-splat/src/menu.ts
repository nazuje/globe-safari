import { speak } from '@playroom/kit';
import { HAT_IDS } from './hats.ts';
import { text } from './lang/index.ts';
import { SCENE_IDS, type SceneId } from './layout.ts';
import { LEVEL_IDS, type LevelId } from './tuning.ts';
import { button, element } from './ui.ts';

const SCENE_ART: Record<SceneId, string> = { village: '🏘️', lake: '⛸️', night: '🏮' };
const LEVEL_ART: Record<LevelId, string> = { easy: '🐢', medium: '🐇', hard: '⚡' };

export interface MenuOptions {
  level: LevelId;
  hats: number;
  best: number;
  onLevel: (level: LevelId) => void;
  onScene: (scene: SceneId) => void;
  onHats: () => void;
}

function levelRow(options: MenuOptions, onChange: (level: LevelId) => void): HTMLElement {
  const row = element('div', 'levels');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().levelGroup);
  const buttons = LEVEL_IDS.map((level) => {
    const made = button('level-btn');
    made.dataset.level = level;
    const art = element('span', 'level-art');
    art.textContent = LEVEL_ART[level];
    art.setAttribute('aria-hidden', 'true');
    const name = element('span', 'level-name');
    name.textContent = text().levels[level].replace('!', '');
    made.append(art, name);
    made.setAttribute('aria-pressed', String(level === options.level));
    made.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === made));
      options.level = level;
      options.onLevel(level);
      onChange(level);
      speak(text().levels[level]);
    });
    return made;
  });
  row.append(...buttons);
  return row;
}

function sceneCard(scene: SceneId, options: MenuOptions): HTMLButtonElement {
  const card = button(`scene-card scene-${scene}`);
  card.dataset.scene = scene;
  const art = element('span', 'scene-art');
  art.textContent = SCENE_ART[scene];
  art.setAttribute('aria-hidden', 'true');
  const name = element('span', 'scene-name');
  name.textContent = text().scenes[scene].replace('!', '');
  card.append(art, name);
  card.setAttribute('aria-label', text().scenes[scene]);
  card.addEventListener('click', () => options.onScene(scene));
  return card;
}

/** Where a round starts: a level, a place and the hat shelf. One tap on a place and it begins. */
export function showMenu(host: HTMLElement, options: MenuOptions): () => void {
  document.body.dataset.screen = 'menu';
  const screen = element('section', 'menu');
  const bestLabel = element('span', 'menu-best');
  bestLabel.textContent = `🏆 ${options.best}`;
  bestLabel.hidden = options.best === 0;
  const scenes = element('div', 'scenes');
  scenes.append(...SCENE_IDS.map((scene) => sceneCard(scene, options)));
  const hats = button('btn menu-hats');
  hats.dataset.action = 'hats';
  hats.textContent = `🎩 ${options.hats} / ${HAT_IDS.length}`;
  hats.setAttribute('aria-label', `${text().hatsButton}: ${options.hats} / ${HAT_IDS.length}`);
  hats.addEventListener('click', options.onHats);
  const foot = element('div', 'menu-foot');
  foot.append(hats, bestLabel);
  screen.append(levelRow(options, () => undefined), scenes, foot);
  host.append(screen);
  return () => screen.remove();
}
