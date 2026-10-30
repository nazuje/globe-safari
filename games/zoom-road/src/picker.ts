import { speak } from '@playroom/kit';
import { SPEED_IDS, type SpeedId } from './course.ts';
import { isUnlocked } from './garage.ts';
import { text } from './lang/index.ts';
import { RIDES, type Ride } from './rides.ts';
import { lockedSound, pickSound } from './sounds.ts';
import { rideIcon } from './sprites.ts';
import { element, garageMeter } from './ui.ts';

const SPEED_ART: Record<SpeedId, string> = { slow: '🐢', fast: '🐇', super: '⚡' };

export interface PickerOptions {
  stars: number;
  speed: SpeedId;
  onSpeed: (speed: SpeedId) => void;
  onRide: (ride: Ride) => void;
}

function wiggle(card: HTMLElement): void {
  card.classList.remove('wiggle');
  void card.offsetWidth;
  card.classList.add('wiggle');
}

function rideCard(ride: Ride, options: PickerOptions): HTMLButtonElement {
  const open = isUnlocked(ride, options.stars);
  const card = element('button', open ? 'ride-card' : 'ride-card ride-locked');
  card.type = 'button';
  card.dataset.ride = ride.id;
  card.append(rideIcon(ride, 60));
  const label = element('span', 'ride-name');
  label.textContent = open ? text().rides[ride.id].replace('!', '') : `⭐ ${ride.stars}`;
  card.append(label);
  card.setAttribute('aria-label', open ? text().rides[ride.id] : `${text().locked}: ⭐ ${ride.stars}`);
  card.addEventListener('click', () => {
    if (open) {
      pickSound(ride.pitch);
      options.onRide(ride);
      return;
    }
    wiggle(card);
    lockedSound();
    speak(text().moreStars);
  });
  return card;
}

function speedRow(options: PickerOptions): HTMLElement {
  const row = element('div', 'speeds');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().speedGroup);
  const buttons = SPEED_IDS.map((speed) => {
    const button = element('button', 'speed-btn');
    button.type = 'button';
    button.dataset.speed = speed;
    const art = element('span', 'speed-art');
    art.textContent = SPEED_ART[speed];
    art.setAttribute('aria-hidden', 'true');
    const name = element('span', 'speed-name');
    name.textContent = text().speeds[speed].replace('!', '');
    button.append(art, name);
    button.setAttribute('aria-pressed', String(speed === options.speed));
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      options.speed = speed;
      options.onSpeed(speed);
      pickSound(speed === 'slow' ? 262 : speed === 'fast' ? 523 : 1047);
      speak(text().speeds[speed]);
    });
    return button;
  });
  row.append(...buttons);
  return row;
}

/** The garage, where a race starts. Rides still locked wait there as shadows. */
export function showPicker(host: HTMLElement, options: PickerOptions): () => void {
  document.body.dataset.screen = 'pick';
  const screen = element('section', 'pick');
  screen.append(speedRow(options), garageMeter(options.stars));
  const grid = element('div', 'rides');
  grid.append(...RIDES.map((ride) => rideCard(ride, options)));
  screen.append(grid);
  host.append(screen);
  return () => screen.remove();
}
