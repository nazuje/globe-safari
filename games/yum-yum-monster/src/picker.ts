import { canSpeak, homeButton, languageButton, onLanguageChange, speak } from '@playroom/kit';
import { text } from './lang/index.ts';
import { buildMonster, MONSTERS } from './monsters.ts';
import type { MonsterStyle } from './monsters.ts';
import { LEVELS } from './requests.ts';
import type { Level } from './requests.ts';

const LEVEL_EMOJI: Record<Level, string> = { 1: '🍎', 2: '🌈', 3: '3️⃣', 4: '5️⃣', 5: '🔟' };

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
  button.setAttribute('aria-label', text().sayAgain);
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
    card.setAttribute('aria-label', text().monsters[style.id]);
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
  row.setAttribute('aria-label', text().chooseLevel);

  const caption = document.createElement('p');
  caption.className = 'grownups-caption';

  const buttons = document.createElement('div');
  buttons.className = 'level-row';

  const select = (level: Level): void => {
    caption.textContent = `${text().forGrownUps} ${text().levels[level]}`;
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
    button.textContent = LEVEL_EMOJI[level];
    button.setAttribute('aria-label', text().levels[level]);
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
  let level = options.level;
  const sayPick = (): void => speak(text().pick);

  const onLevel = (picked: Level): void => {
    level = picked;
    options.onLevel(picked);
  };

  const draw = (): void => {
    const screen = document.createElement('div');
    screen.className = 'picker';

    const bar = document.createElement('header');
    bar.className = 'topbar';
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = text().title;
    const home = homeButton();
    home.setAttribute('aria-label', text().home);
    const language = languageButton(['en', 'sl']);
    language.classList.add('topbar-end');
    bar.append(home, title, language);

    if (canSpeak()) bar.append(soundButton(sayPick));

    screen.append(bar, monsterCards(options.onPick), levelRow(level, onLevel));
    host.replaceChildren(screen);
  };

  draw();

  // Browsers stay silent until the first tap, so the page tries now and again then.
  sayPick();
  if (!navigator.userActivation?.hasBeenActive) document.addEventListener('click', sayPick, { once: true });
  const stopListening = onLanguageChange(() => {
    draw();
    sayPick();
  });
  return () => {
    stopListening();
    document.removeEventListener('click', sayPick);
  };
}
