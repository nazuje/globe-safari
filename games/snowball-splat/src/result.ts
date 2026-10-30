import type { HatId } from './hats.ts';
import { text } from './lang/index.ts';
import { button, element } from './ui.ts';

/** The buttons wake once the screen has been left alone this long, so mashing can't start a new round by accident. */
const CALM_MS = 1000;
/** A child who keeps tapping still gets in after this long. */
const LONGEST_WAIT_MS = 4000;

export interface ResultOptions {
  score: number;
  stars: number;
  best: boolean;
  newHats: readonly HatId[];
  picture: (hat: HatId) => string;
  onAgain: () => void;
  onOther: () => void;
}

/** The end of a round: stars, the score, and any hats found. */
export function showResult(host: HTMLElement, options: ResultOptions): () => void {
  document.body.dataset.screen = 'result';
  const screen = element('section', 'result');
  const card = element('div', 'result-card');
  const stars = element('div', 'result-stars');
  stars.setAttribute('role', 'img');
  stars.setAttribute('aria-label', text().stars[options.stars - 1]);
  for (let index = 0; index < 3; index++) {
    const star = element('span', index < options.stars ? 'result-star lit' : 'result-star');
    star.textContent = '⭐';
    star.style.animationDelay = `${index * 0.22}s`;
    stars.append(star);
  }
  const score = element('div', 'result-score');
  score.textContent = `⛄ ${options.score}${options.best ? ' 🏆' : ''}`;
  card.append(stars, score);
  if (options.newHats.length > 0) {
    const row = element('div', 'result-hats');
    for (const hat of options.newHats) {
      const picture = element('img', 'hat-picture');
      picture.src = options.picture(hat);
      picture.alt = text().hats[hat];
      row.append(picture);
    }
    card.append(row);
  }
  const again = button('btn btn-sun result-again');
  again.dataset.action = 'again';
  again.textContent = `🔁 ${text().again}`;
  again.addEventListener('click', options.onAgain);
  const other = button('btn result-other');
  other.dataset.action = 'other';
  other.textContent = `🗺️ ${text().otherPlace}`;
  other.addEventListener('click', options.onOther);
  again.disabled = true;
  other.disabled = true;
  const shownAt = performance.now();
  let wake: ReturnType<typeof setTimeout>;
  const wakeButtons = (): void => {
    again.disabled = false;
    other.disabled = false;
  };
  const waitForCalm = (): void => {
    clearTimeout(wake);
    if (!again.disabled) return;
    const left = LONGEST_WAIT_MS - (performance.now() - shownAt);
    wake = setTimeout(wakeButtons, Math.min(CALM_MS, Math.max(left, 0)));
  };
  screen.addEventListener('pointerdown', waitForCalm);
  waitForCalm();
  card.append(again, other);
  screen.append(card);
  host.append(screen);
  return () => {
    clearTimeout(wake);
    screen.remove();
  };
}
