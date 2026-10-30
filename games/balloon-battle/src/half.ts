import { stickersFor, type Character } from './characters.ts';
import { make } from './dom.ts';
import { isCalm } from './fx.ts';
import { balloonScale } from './tuning.ts';

const MOST_STICKERS_SHOWN = 8;

/** One player's half of the screen. It draws what it's told and knows nothing of the rules. */
export class Half {
  readonly root = make('section', 'half');
  readonly picker = make('div', 'picker');
  private readonly field = make('div', 'field');
  private readonly tally = make('div', 'tally');
  private readonly rig = make('div', 'rig');
  private readonly scaler = make('div', 'scaler');
  private readonly balloon = make('div', 'balloon');
  private readonly string = make('div', 'string');
  private readonly hero = make('div', 'hero');
  private readonly badge = make('div', 'badge');
  private readonly count = make('div', 'count');
  private readonly hint = make('div', 'hint', '👆');
  private wobbling: Animation | null = null;

  constructor() {
    this.scaler.append(this.balloon);
    this.rig.append(this.scaler);
    this.field.append(this.tally, this.string, this.rig, this.hero, this.badge, this.count, this.hint);
    this.root.append(this.field, this.picker);
    this.setFill(0);
  }

  show(character: Character | null, levelEmoji: string): void {
    this.root.style.setProperty('--balloon', character?.color ?? '#ffffff');
    this.root.classList.toggle('no-character', !character);
    this.hero.textContent = character?.emoji ?? '';
    this.badge.textContent = levelEmoji;
  }

  drawTally(wins: number, label: string, gained = false): void {
    this.tally.replaceChildren();
    this.tally.setAttribute('aria-label', label);
    if (wins === 0) return;
    this.tally.append(make('span', 'tally-count', String(wins)));
    stickersFor(wins, MOST_STICKERS_SHOWN).forEach((sticker, index) => {
      this.tally.append(make('span', index === 0 && gained ? 'sticker sticker-new' : 'sticker', sticker));
    });
  }

  setFill(fill: number): void {
    this.scaler.style.setProperty('--scale', String(balloonScale(fill)));
    this.root.classList.toggle('tense', fill >= 0.8 && fill < 1);
  }

  wobble(strength = 1): void {
    if (isCalm()) return;
    this.wobbling?.cancel();
    const tilt = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4) * strength;
    this.wobbling = this.balloon.animate(
      [
        { transform: 'scale(1)' },
        { transform: `scale(${1 + 0.08 * strength}, ${1 - 0.05 * strength}) rotate(${tilt}deg)` },
        { transform: `scale(${1 - 0.03 * strength}, ${1 + 0.04 * strength}) rotate(${-tilt / 2}deg)` },
        { transform: 'scale(1)' },
      ],
      { duration: 240, easing: 'ease-out' },
    );
  }

  /** Where the balloon is on screen, even in a half turned upside down. */
  balloonBox(): DOMRect {
    return this.balloon.getBoundingClientRect();
  }

  heroBox(): DOMRect {
    return this.hero.getBoundingClientRect();
  }

  pop(): void {
    this.root.classList.add('popped');
  }

  setMood(mood: '' | 'dance' | 'laugh'): void {
    this.root.dataset.mood = mood;
  }

  shake(): void {
    if (isCalm()) return;
    this.field.animate(
      [0, 1, 2, 3, 4, 5].map((step) => ({
        transform: `translate(${(step % 2 ? 1 : -1) * (10 - step * 2)}px, ${(step % 2 ? -1 : 1) * (8 - step)}px)`,
      })),
      { duration: 340 },
    );
  }

  boing(): void {
    if (isCalm()) return;
    this.hero.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-22%) scale(1.15)' }, { transform: 'translateY(0)' }],
      { duration: 240, easing: 'ease-out', composite: 'add' },
    );
  }

  showCount(words: string): void {
    this.count.textContent = words;
    this.count.classList.remove('count-in');
    // Reading the size restarts the pop-in for each number.
    void this.count.offsetWidth;
    this.count.classList.add('count-in');
  }

  setHint(on: boolean): void {
    this.root.classList.toggle('hinting', on);
  }

  setGold(gold: boolean): void {
    this.root.classList.toggle('gold', gold);
  }

  reset(): void {
    this.root.classList.remove('popped', 'tense');
    this.setMood('');
    this.setFill(0);
    this.setHint(false);
    this.showCount('');
  }
}
