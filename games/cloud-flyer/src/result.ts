import { burst, say, speak } from '@playroom/kit';
import type { Flight } from './flight.ts';
import type { FlyerId } from './flyers.ts';
import { FLYER_ICONS } from './flyers.ts';
import { text } from './lang/index.ts';
import { SURPRISE_ICONS } from './picker.ts';
import type { LandingNews } from './progress.ts';
import { button, element } from './ui.ts';

/** Long enough for a held steering finger to lift without hitting a button. */
const BUTTONS_AFTER_MS = 1100;
const STAR_GAP_MS = 320;

export interface ResultOptions {
  flight: Flight;
  stars: number;
  news: LandingNews;
  flyer: FlyerId;
  best: number;
  onAgain: () => void;

}

function starRow(stars: number): HTMLElement {
  const row = element('div', 'result-stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `${stars} / 3`);
  for (let index = 0; index < 3; index += 1) {
    const star = element('span', index < stars ? 'result-star result-star-on' : 'result-star');
    star.textContent = index < stars ? '⭐' : '☆';
    star.style.animationDelay = `${index * STAR_GAP_MS}ms`;
    row.append(star);
  }
  return row;
}

function celebrate(stars: number, timers: number[]): void {
  for (let index = 0; index < stars; index += 1) {
    timers.push(window.setTimeout(() => burst(window.innerWidth / 2 + (index - 1) * 90, window.innerHeight * 0.32, 18), index * STAR_GAP_MS));
  }
}

function announce(stars: number, news: LandingNews): void {
  const lines = [text().stars1, text().stars2, text().stars3];
  speak(lines[stars - 1] ?? text().stars1);
  if (news.newBest) void say(text().newBest, { queue: true });
  if (news.newTrail) void say(text().newTrail, { queue: true });
}

/** The end of a flight: stars, score, and one big button to go again. Nothing here can fail. */
export function showResult(host: HTMLElement, options: ResultOptions): () => void {
  const { flight, stars, news, flyer, best } = options;
  const panel = element('div', 'result');
  const score = element('p', 'result-score');
  score.textContent = `${text().score}: ${flight.score}`;
  const bestLine = element('p', news.newBest ? 'result-best result-new' : 'result-best');
  bestLine.textContent = `🏆 ${text().best}: ${best}`;
  panel.append(starRow(stars), score, bestLine);
  if (news.newTrail || news.newFinds.length > 0) {
    const finds = element('p', 'result-finds');
    finds.textContent = [...news.newFinds.map((kind) => SURPRISE_ICONS[kind]), ...(news.newTrail ? ['✨'] : [])].join(' ');
    panel.append(finds);
  }
  const again = button('btn btn-sun result-again');
  again.textContent = `${FLYER_ICONS[flyer]} ${text().again}`;
  again.disabled = true;
  again.addEventListener('click', options.onAgain);
  panel.append(again);
  host.append(panel);
  const timers: number[] = [];
  celebrate(stars, timers);
  timers.push(
    window.setTimeout(() => {
      again.disabled = false;
    }, BUTTONS_AFTER_MS),
  );
  announce(stars, news);
  return () => {
    for (const timer of timers) window.clearTimeout(timer);
    panel.remove();
  };
}
