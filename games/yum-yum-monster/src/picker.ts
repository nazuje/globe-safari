import { canSpeak, homeButton, speak } from '@playroom/kit';
import { buildMonster, MONSTERS } from './monsters.ts';
import type { MonsterStyle } from './monsters.ts';
import { LEVELS } from './requests.ts';
import type { Level } from './requests.ts';

const PICK_LINE = 'Pick a monster!';

const LEVEL_PICTURES: Record<Level, { emoji: string; caption: string }> = {
  1: { emoji: '🍎', caption: 'Level 1: name a food' },
  2: { emoji: '🌈', caption: 'Level 2: colors' },
  3: { emoji: '3️⃣', caption: 'Level 3: count to 3' },
  4: { emoji: '5️⃣', caption: 'Level 4: count to 5' },
  5: { emoji: '🔟', caption: 'Level 5: count to 10' },
};

export interface PickerOptions {
  level: Level;
  onLevel(level: Level): void;
  onPick(style: MonsterStyle): void;
}

function soundButton(onTap: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sound-btn';
  button.textContent = '🔊';
  button.setAttribute('aria-label', 'Say it again');
  button.addEventListener('click', onTap);
  return button;
}

function monsterCards(onPick: (style: MonsterStyle) => void): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'pick-grid';
  MONSTERS.forEach((style, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pick-card';
    card.style.setProperty('--tint', style.belly);
    card.style.setProperty('--delay', `${i * -0.35}s`);
    card.setAttribute('aria-label', style.label);
    card.append(buildMonster(style).root);
    card.addEventListener('click', () => onPick(style));
    grid.append(card);
  });
  const finger = document.createElement('div');
  finger.className = 'finger';
  finger.textContent = '👆';
  finger.setAttribute('aria-hidden', 'true');
  grid.append(finger);
  return grid;
}

function levelRow(start: Level, onLevel: (level: Level) => void): HTMLElement {
  const row = document.createElement('section');
  row.className = 'grownups';
  row.setAttribute('aria-label', 'For grown-ups: choose a level');

  const caption = document.createElement('p');
  caption.className = 'grownups-caption';

  const buttons = document.createElement('div');
  buttons.className = 'level-row';

  const select = (level: Level): void => {
    caption.textContent = `For grown-ups. ${LEVEL_PICTURES[level].caption}`;
    for (const button of buttons.children) {
      const on = (button as HTMLElement).dataset.level === String(level);
      button.setAttribute('aria-pressed', String(on));
    }
  };

  for (const level of LEVELS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-btn';
    button.dataset.level = String(level);
    button.textContent = LEVEL_PICTURES[level].emoji;
    button.setAttribute('aria-label', LEVEL_PICTURES[level].caption);
    button.addEventListener('click', () => {
      select(level);
      onLevel(level);
    });
    buttons.append(button);
  }

  row.append(buttons, caption);
  select(start);
  return row;
}

/** The start screen. Tapping a monster starts the game. Returns a function that tidies up. */
export function showPicker(host: HTMLElement, options: PickerOptions): () => void {
  const screen = document.createElement('div');
  screen.className = 'picker';

  const bar = document.createElement('header');
  bar.className = 'topbar';
  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'Yum Yum Monster';
  bar.append(homeButton(), title);

  const sayPick = (): void => speak(PICK_LINE);
  if (canSpeak()) {
    const sound = soundButton(sayPick);
    sound.classList.add('topbar-end');
    bar.append(sound);
  }

  screen.append(bar, monsterCards(options.onPick), levelRow(options.level, options.onLevel));
  host.replaceChildren(screen);

  // Browsers stay silent until the first tap, so the page tries now and again then.
  sayPick();
  if (!navigator.userActivation?.hasBeenActive) document.addEventListener('click', sayPick, { once: true });
  return () => document.removeEventListener('click', sayPick);
}
