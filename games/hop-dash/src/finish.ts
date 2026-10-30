import { burst, speak } from '@playroom/kit';
import { buttonsReady, buttonsWait } from './gate.ts';
import { text } from './lang/index.ts';
import type { StarCount } from './rating.ts';
import { starCountSound } from './sounds.ts';
import { button, element } from './ui.ts';

const STAR_GAP_MS = 320;

export interface FinishOptions {
  stars: StarCount;
  score: number;
  best: number;
  newBest: boolean;
  treasure: string | null;
  hasNext: boolean;
  onAgain: () => void;
  onNext: () => void;
  onLevels: () => void;
}

export function finishLine(stars: StarCount): string {
  if (stars === 3) return text().threeStars;
  return stars === 2 ? text().twoStars : text().oneStar;
}

function showStar(row: HTMLElement, index: number): void {
  const star = row.children[index];
  if (!(star instanceof HTMLElement)) return;
  star.classList.add('on');
  starCountSound(index);
  const box = star.getBoundingClientRect();
  burst(box.left + box.width / 2, box.top + box.height / 2, 14);
}

function actionButton(panel: HTMLElement, art: string, label: string, className: string, onTap: () => void): HTMLButtonElement {
  const made = button(`finish-btn ${className}`);
  made.textContent = art;
  made.setAttribute('aria-label', label);
  made.addEventListener('click', () => {
    if (panel.dataset.ready === 'true') onTap();
  });
  return made;
}

/** The flag's reward: stars arrive one by one, then big buttons for what's next. */
export function showFinish(host: HTMLElement, options: FinishOptions): { close: () => void; redraw: () => void } {
  const panel = element('section', 'finish');
  const timers: ReturnType<typeof setTimeout>[] = [];
  const draw = (reveal: boolean): void => {
    panel.replaceChildren();
    const row = element('div', 'finish-stars');
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', text().starsLabel(options.stars));
    for (let i = 0; i < 3; i++) {
      const star = element('span', i < options.stars && !reveal ? 'finish-star on' : 'finish-star');
      star.textContent = '★';
      row.append(star);
    }
    const score = element('p', 'finish-score');
    score.textContent = `${options.score}`;
    score.setAttribute('aria-label', `${text().score}: ${options.score}`);
    const best = element('p', 'finish-best');
    best.textContent = options.newBest ? `🏆 ${text().newBest.replace('!', '')}` : `🏆 ${options.best}`;
    panel.append(row, score, best);
    if (options.treasure) {
      const treasure = element('p', 'finish-treasure');
      treasure.textContent = options.treasure;
      panel.append(treasure);
    }
    const actions = element('div', 'finish-actions');
    const again = actionButton(panel, '🔁', text().retry, 'finish-again', options.onAgain);
    const levels = actionButton(panel, '🗺️', text().levels, 'finish-map', options.onLevels);
    actions.append(levels, again);
    if (options.hasNext) actions.append(actionButton(panel, '▶️', text().next, 'finish-next', options.onNext));
    panel.append(actions);
    if (reveal) {
      for (let i = 0; i < options.stars; i++) timers.push(setTimeout(() => showStar(row, i), 200 + i * STAR_GAP_MS));
    }
  };
  draw(true);
  panel.dataset.ready = 'false';
  const shownAt = performance.now();
  let lastTap = shownAt;
  const noticeTap = (): void => {
    if (panel.dataset.ready === 'false') lastTap = performance.now();
  };
  // The buttons wake once the screen has been left alone, however long the mashing goes on.
  const check = (): void => {
    const now = performance.now();
    if (buttonsReady(shownAt, lastTap, now)) panel.dataset.ready = 'true';
    else timers.push(setTimeout(check, buttonsWait(shownAt, lastTap, now) + 10));
  };
  window.addEventListener('pointerdown', noticeTap, true);
  window.addEventListener('keydown', noticeTap, true);
  check();
  host.append(panel);
  speak(options.newBest ? text().newBest : finishLine(options.stars));
  return {
    close: () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('pointerdown', noticeTap, true);
      window.removeEventListener('keydown', noticeTap, true);
      panel.remove();
    },
    redraw: () => draw(false),
  };
}
