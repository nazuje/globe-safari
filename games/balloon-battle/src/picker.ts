import { availableCharacters, type CharacterId } from './characters.ts';
import { make, onTap } from './dom.ts';
import { text } from './lang/index.ts';
import { LEVELS, type Level } from './tuning.ts';

export interface CharacterChoice {
  rounds: number;
  /** The other player's character, which this player can't also take. */
  taken: CharacterId | null;
  onPick: (id: CharacterId) => void;
}

/** The first step: one big friend each. */
export function drawCharacters(into: HTMLElement, { rounds, taken, onPick }: CharacterChoice): void {
  const characters = availableCharacters(rounds);
  const grid = make('div', 'pick-grid');
  grid.dataset.count = String(characters.length);
  characters.forEach(({ id, emoji }, index) => {
    const button = make('button', 'pick', emoji);
    button.type = 'button';
    button.style.setProperty('--wave', `${index * 0.12}s`);
    button.setAttribute('aria-label', text().names[id]);
    button.classList.toggle('taken', id === taken);
    onTap(button, () => onPick(id));
    grid.append(button);
  });
  into.replaceChildren(grid);
}

export interface LevelChoice {
  heroEmoji: string;
  onPick: (level: Level) => void;
}

/** The second step: how big you are, which sets how much air a tap gives. */
export function drawLevels(into: HTMLElement, { heroEmoji, onPick }: LevelChoice): void {
  const words = text();
  const grid = make('div', 'level-grid');
  LEVELS.forEach(({ id, emoji }, index) => {
    const button = make('button', 'level');
    button.type = 'button';
    button.style.setProperty('--wave', `${index * 0.2}s`);
    button.append(
      make('span', 'level-emoji', emoji),
      make('span', 'level-label', words.levels[id].label),
      make('span', 'level-ages', words.levels[id].ages),
    );
    onTap(button, () => onPick(id));
    grid.append(button);
  });
  into.replaceChildren(make('div', 'picking-hero', heroEmoji), grid);
}
