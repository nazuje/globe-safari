import { say } from '@playroom/kit';
import { newlyUnlocked } from './garage.ts';
import { text } from './lang/index.ts';
import type { Ride } from './rides.ts';
import { unlockSound } from './sounds.ts';
import { rideIcon } from './sprites.ts';
import { element, garageMeter } from './ui.ts';

/** Long enough that fingers still mashing the road can't press Again by accident. */
const BUTTON_DELAY_MS = 900;

export interface TrophyOptions {
  earned: number;
  /** The star total before this race and after it. */
  before: number;
  after: number;
  onAgain: () => void;
  onPick: () => void;
}

function pickOne(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0]!;
}

function newRideCard(ride: Ride): HTMLElement {
  const card = element('div', 'new-ride');
  card.append(rideIcon(ride, 72));
  const name = element('span', 'new-ride-name');
  name.textContent = `${text().newRide.replace('!', ':')} ${text().rides[ride.id]}`;
  card.append(name);
  return card;
}

/** The end of a race. Returns a redraw for a language change. */
export function showTrophy(host: HTMLElement, options: TrophyOptions): () => void {
  const unlocked = newlyUnlocked(options.before, options.after);
  const shownAt = performance.now();
  const panel = element('section', 'trophy');
  host.append(panel);

  const guarded = (action: () => void) => () => {
    if (performance.now() - shownAt >= BUTTON_DELAY_MS) action();
  };

  const draw = (): void => {
    const cup = element('div', 'trophy-cup');
    cup.textContent = '🏆';
    cup.setAttribute('aria-hidden', 'true');
    const earned = element('div', 'trophy-stars');
    earned.textContent = `⭐ +${options.earned}`;
    const again = element('button', 'btn btn-leaf trophy-again');
    again.type = 'button';
    again.textContent = `▶ ${text().again}`;
    again.addEventListener('click', guarded(options.onAgain));
    const change = element('button', 'btn trophy-change');
    change.type = 'button';
    change.textContent = text().changeRide;
    change.addEventListener('click', guarded(options.onPick));
    panel.replaceChildren(cup, earned, ...unlocked.map(newRideCard), garageMeter(options.after), again, change);
  };

  draw();
  void say(pickOne(text().cheers));
  if (unlocked.length > 0) {
    unlockSound();
    void say(text().newRide, { queue: true });
    for (const ride of unlocked) void say(text().rides[ride.id], { queue: true });
  }
  return draw;
}
