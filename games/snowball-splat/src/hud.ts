import { text } from './lang/index.ts';
import { element, wiggle } from './ui.ts';

/** The splat counter and three stars, over the top of the game. */
export class Hud {
  readonly root = element('div', 'hud');
  private readonly count = element('span', 'hud-count');
  private readonly stars = Array.from({ length: 3 }, () => element('span', 'hud-star'));
  private shownScore = 0;

  constructor() {
    const icon = element('span', 'hud-icon');
    icon.textContent = '⛄';
    icon.setAttribute('aria-hidden', 'true');
    const row = element('span', 'hud-stars');
    row.setAttribute('aria-hidden', 'true');
    for (const star of this.stars) {
      star.textContent = '⭐';
      row.append(star);
    }
    this.root.append(icon, this.count, row);
    this.root.setAttribute('role', 'status');
    this.reset();
  }

  reset(): void {
    this.shownScore = 0;
    this.count.textContent = '0';
    for (const star of this.stars) star.classList.remove('lit');
    this.label();
  }

  label(): void {
    this.root.setAttribute('aria-label', `${text().score}: ${this.shownScore}`);
  }

  show(score: number, stars: number): void {
    if (score !== this.shownScore) {
      this.shownScore = score;
      this.count.textContent = String(score);
      wiggle(this.count);
      this.label();
    }
    this.stars.forEach((star, index) => star.classList.toggle('lit', index < stars));
  }
}
