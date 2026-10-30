import { burst } from '@playroom/kit';
import { button, centerOf, el } from './dom.ts';
import { awardStar, loadProgress, saveLevel, say } from './screen.ts';
import { LEVELS } from './rounds.ts';
import type { Level } from './rounds.ts';
import type { ScoredMode } from './progress.ts';

/** What the round gives each game mode while it plays one question. */
export interface Turn {
  area: HTMLElement;
  /** Aborted when the child leaves or changes level, so late animation steps stop. */
  signal: AbortSignal;
  win(from: HTMLElement): void;
  /** Call once the turn is over. Returns the Next button to place on the page. */
  finish(): HTMLButtonElement;
}

interface RoundOptions<T> {
  mode: ScoredMode;
  root: HTMLElement;
  signal: AbortSignal;
  deal(level: Level): T[];
  play(item: T, turn: Turn): void;
  onExit(): void;
}

function levelButton(option: (typeof LEVELS)[number], current: Level, onPick: () => void): HTMLButtonElement {
  const pick = button('level-btn', `${option.emoji} ${option.name}`, onPick);
  pick.setAttribute('aria-pressed', String(option.level === current));
  return pick;
}

function roundEnd<T>(options: RoundOptions<T>, level: Level, won: number, restart: (level: Level) => void): HTMLElement {
  const card = el('section', 'round-end');
  const line = won > 0 ? `You got ${won} ${won === 1 ? 'star' : 'stars'}! Great science!` : 'Great science!';
  card.append(el('div', 'round-stars', won > 0 ? '⭐'.repeat(won) : '🧪'), el('h2', 'round-line', line));
  const actions = el('div', 'actions');
  actions.append(button('btn btn-sun', '🔁 Again', () => restart(level)));
  if (level < 2) {
    actions.append(button('btn btn-leaf', '🌳 Harder', () => restart((level + 1) as Level)));
  }
  actions.append(button('btn', '🧪 Back to the lab', options.onExit));
  card.append(actions);
  say(line);
  requestAnimationFrame(() => {
    const { x, y } = centerOf(card);
    if (won > 0) burst(x, y, 28);
  });
  return card;
}

/** Plays a round of a few questions, with the level picker and progress dots around it. */
export function runRound<T>(options: RoundOptions<T>): void {
  const { mode, root, signal, deal, play } = options;
  let itemControl: AbortController | null = null;
  signal.addEventListener('abort', () => itemControl?.abort());

  function start(level: Level): void {
    itemControl?.abort();
    saveLevel(mode, level);
    const deck = deal(level);
    let index = 0;
    let won = 0;

    const levels = el('div', 'levels');
    for (const option of LEVELS) {
      levels.append(levelButton(option, level, () => start(option.level)));
    }
    const dots = el('div', 'dots');
    dots.setAttribute('aria-hidden', 'true');
    const marks = deck.map(() => el('span', 'dot'));
    dots.append(...marks);
    const area = el('div', 'turn');
    root.replaceChildren(levels, dots, area);

    function next(): void {
      itemControl?.abort();
      if (index >= deck.length) {
        dots.remove();
        area.replaceChildren(roundEnd(options, level, won, start));
        return;
      }
      marks[index]?.classList.add('dot-now');
      const item = deck[index] as T;
      index += 1;
      const control = new AbortController();
      itemControl = control;
      area.replaceChildren();
      play(item, {
        area,
        signal: control.signal,
        win(from) {
          won += 1;
          awardStar(mode, from);
        },
        finish() {
          const mark = marks[index - 1];
          mark?.classList.replace('dot-now', 'dot-done');
          return button('btn btn-sun btn-big', index >= deck.length ? 'Finish 🎉' : 'Next ➡️', next);
        },
      });
    }
    next();
  }

  start(loadProgress().level[mode]);
}
