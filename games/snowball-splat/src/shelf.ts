import { playSound, speak } from '@playroom/kit';
import { HAT_IDS, type HatId } from './hats.ts';
import { text } from './lang/index.ts';
import { button, element, wiggle } from './ui.ts';

export interface ShelfOptions {
  owned: readonly HatId[];
  picture: (hat: HatId) => string;
  onClose: () => void;
}

function hatTile(hat: HatId, options: ShelfOptions): HTMLButtonElement {
  const owned = options.owned.includes(hat);
  const tile = button(owned ? 'hat-tile' : 'hat-tile hat-missing');
  tile.dataset.hat = hat;
  const picture = element('img', 'hat-picture');
  picture.src = options.picture(hat);
  picture.alt = '';
  picture.draggable = false;
  tile.append(picture);
  tile.setAttribute('aria-label', owned ? text().hats[hat] : text().mysteryHat);
  tile.addEventListener('click', () => {
    wiggle(tile);
    playSound(owned ? 'ding' : 'boing');
    if (owned) speak(text().hats[hat]);
  });
  return tile;
}

/** The hat collection: every hat, with the ones still to find as shadows. */
export function showShelf(host: HTMLElement, options: ShelfOptions): () => void {
  document.body.dataset.screen = 'shelf';
  const screen = element('section', 'shelf');
  const head = element('div', 'shelf-head');
  const count = element('span', 'shelf-count');
  count.textContent = `🎩 ${options.owned.length} / ${HAT_IDS.length}`;
  const close = button('btn btn-sun shelf-close');
  close.textContent = '✕';
  close.setAttribute('aria-label', text().close);
  close.addEventListener('click', options.onClose);
  head.append(count, close);
  const grid = element('div', 'hat-grid');
  grid.append(...HAT_IDS.map((hat) => hatTile(hat, options)));
  screen.append(head, grid);
  host.append(screen);
  return () => screen.remove();
}
