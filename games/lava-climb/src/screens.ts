import { text } from './lang/index.ts';
import { WORLD_IDS, WORLD_OF } from './levels.ts';
import { totalStars, type Progress } from './save.ts';
import { button, element } from './ui.ts';

export interface MapOptions {
  progress: Progress;
  onLevel: (index: number) => void;
  onLocked: () => void;
}

function levelButton(index: number, progress: Progress, options: MapOptions): HTMLButtonElement {
  const words = text();
  const open = index < progress.open;
  const stars = progress.stars[index]!;
  const fresh = index === progress.stars.findIndex((best, at) => best === 0 && at < progress.open);
  const made = button(`level-btn${open ? '' : ' locked'}${fresh ? ' fresh' : ''}`);
  const number = element('span', 'level-number');
  number.textContent = open ? String(index + 1) : '🔒';
  const row = element('span', 'level-stars');
  row.textContent = open ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  made.append(number, row);
  if (progress.secrets.includes(index)) {
    const secret = element('span', 'level-secret');
    secret.textContent = '💛';
    made.append(secret);
  }
  made.setAttribute('aria-label', open ? `${words.level(index + 1)}, ${words.starsLabel(stars)}` : words.locked(index + 1));
  made.addEventListener('click', () => (open ? options.onLevel(index) : options.onLocked()));
  return made;
}

/** The tower to climb: The Top is at the top and level 1 at the bottom, with lava below it all. */
export function showMap(host: HTMLElement, options: MapOptions): void {
  const words = text();
  const { progress } = options;
  const page = element('div', 'map');
  const badges = element('div', 'badges');
  const badge = (mark: string, value: number, label: string, className: string): void => {
    const made = element('div', `badge ${className}`);
    made.textContent = `${mark} ${value}`;
    made.setAttribute('aria-label', `${label}: ${value}`);
    badges.append(made);
  };
  badge('🔥', progress.singes, words.singes, 'badge-singe');
  badge('★', totalStars(progress), words.stars, 'badge-stars');
  badge('💛', progress.secrets.length, words.secrets, 'badge-secret');
  page.append(badges);
  for (const world of [...WORLD_IDS].reverse()) {
    const band = element('section', `band band-${world}`);
    const name = element('h2', 'band-name');
    name.textContent = words.worlds[world];
    const grid = element('div', 'band-grid');
    WORLD_OF.forEach((owner, index) => {
      if (owner === world) grid.append(levelButton(index, progress, options));
    });
    band.append(name, grid);
    page.append(band);
  }
  const lava = element('div', 'map-lava');
  page.append(lava);
  host.replaceChildren(page);
  const fresh = page.querySelector('.level-btn.fresh') ?? page.querySelector('.level-btn:not(.locked)');
  fresh?.scrollIntoView({ block: 'center' });
}
