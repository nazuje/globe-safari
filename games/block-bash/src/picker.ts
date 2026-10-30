import { text } from './lang/index.ts';
import { LEVELS, type Level } from './levels.ts';
import { DIFFICULTIES, type BestByLevel, type Difficulty } from './scoring.ts';
import { button, element } from './ui.ts';

export interface PickerState {
  difficulty: Difficulty;
  players: 1 | 2;
  best: BestByLevel;
  bonusOpen: boolean;
  current: number;
}

export interface PickerActions {
  onLevel(index: number): void;
  onDifficulty(difficulty: Difficulty): void;
  onPlayers(players: 1 | 2): void;
}

export interface Picker {
  open(state: PickerState): void;
  close(): void;
  isOpen(): boolean;
  redraw(state: PickerState): void;
}

const TILE_PAINTS = 5;
const DIFFICULTY_EMOJI: Record<Difficulty, string> = { easy: '🐣', tricky: '🐯' };

export function createPicker(app: HTMLElement, actions: PickerActions): Picker {
  const panel = element('div', 'picker');
  panel.hidden = true;
  app.append(panel);

  function toggle<T extends string | number>(
    options: readonly T[],
    current: T,
    label: (value: T) => string,
    title: string,
    onPick: (value: T) => void,
  ): HTMLElement {
    const group = element('div', 'toggle');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', title);
    for (const option of options) {
      const choice = button(option === current ? 'toggle-btn is-picked' : 'toggle-btn', label(option));
      choice.setAttribute('aria-pressed', String(option === current));
      choice.addEventListener('click', () => onPick(option));
      group.append(choice);
    }
    return group;
  }

  function tile(level: Level, index: number, state: PickerState): HTMLButtonElement {
    const stars = state.best[`${level.id}:${state.difficulty}`]?.stars ?? 0;
    const made = button(index === state.current ? 'tile is-current' : 'tile');
    made.dataset.paint = String(index % TILE_PAINTS);
    made.dataset.level = level.id;
    made.setAttribute('aria-label', text().levels[level.id]);
    made.append(
      element('span', 'tile-emoji', level.emoji),
      element('span', 'tile-stars', '⭐'.repeat(stars)),
    );
    made.addEventListener('click', () => actions.onLevel(index));
    return made;
  }

  function draw(state: PickerState): void {
    const words = text();
    const levels = LEVELS.map((level, index) => ({ level, index })).filter(({ level }) => !level.bonus || state.bonusOpen);
    const grid = element('div', 'tiles');
    grid.append(...levels.map(({ level, index }) => tile(level, index, state)));
    const settings = element('div', 'settings');
    settings.append(
      toggle(DIFFICULTIES, state.difficulty, (value) => `${DIFFICULTY_EMOJI[value]} ${words.difficulty[value]}`, words.howHard, actions.onDifficulty),
      toggle<1 | 2>([1, 2], state.players, (value) => (value === 1 ? `🦊 ${words.onePlayer}` : `🦊🐸 ${words.twoPlayers}`), words.howMany, actions.onPlayers),
    );
    panel.replaceChildren(settings, grid);
  }

  return {
    open(state) {
      panel.hidden = false;
      draw(state);
    },
    close() {
      panel.hidden = true;
    },
    isOpen: () => !panel.hidden,
    redraw(state) {
      if (!panel.hidden) draw(state);
    },
  };
}

