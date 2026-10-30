import { nextRide, nextRideProgress } from './garage.ts';
import { text } from './lang/index.ts';
import { rideIcon } from './sprites.ts';

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const made = document.createElement(tag);
  made.className = className;
  return made;
}

/** The garage filling up: a bar of stars leading to a shadow of the next ride. */
export function garageMeter(stars: number): HTMLElement {
  const meter = element('div', 'meter');
  const count = element('span', 'meter-count');
  count.textContent = `⭐ ${stars}`;
  const next = nextRide(stars);
  const track = element('div', 'meter-track');
  const fill = element('div', 'meter-fill');
  fill.style.width = `${Math.round(nextRideProgress(stars) * 100)}%`;
  track.append(fill);
  meter.append(count, track);
  if (next) {
    const goal = element('span', 'meter-goal');
    goal.append(rideIcon(next, 44));
    meter.append(goal);
    meter.setAttribute('aria-label', `${text().nextRide}: ${next.stars}`);
  } else {
    meter.setAttribute('aria-label', text().fullGarage);
    const full = element('span', 'meter-goal');
    full.textContent = '🏆';
    meter.append(full);
  }
  meter.setAttribute('role', 'img');
  return meter;
}
