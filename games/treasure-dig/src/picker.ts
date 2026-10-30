import { DIGGER, miniGrid } from './art.ts';
import { text } from './lang/index.ts';
import type { Size } from './save.ts';

export interface Picker {
  element: HTMLElement;
  relabel(): void;
}

/** The first screen: a small patch or a big one, shown as pictures. */
export function buildPicker(chosen: Size, onPick: (size: Size) => void): Picker {
  const element = document.createElement('section');
  element.className = 'picker';
  element.innerHTML = `
    <div class="picker-digger">${DIGGER}</div>
    <div class="picker-cards">
      <button type="button" class="pick-card pick-small${chosen === 'small' ? ' chosen' : ''}" data-size="small">
        ${miniGrid(4, 4)}<strong></strong><small></small>
      </button>
      <button type="button" class="pick-card pick-big${chosen === 'big' ? ' chosen' : ''}" data-size="big">
        ${miniGrid(5, 6)}<strong></strong><small></small>
      </button>
    </div>`;
  element.querySelectorAll<HTMLElement>('[data-size]').forEach((card) => {
    card.addEventListener('click', () => onPick(card.dataset.size === 'big' ? 'big' : 'small'));
  });

  function relabel(): void {
    const words = text();
    const fill = (selector: string, name: string, hint: string): void => {
      const card = element.querySelector(selector) as HTMLElement;
      (card.querySelector('strong') as HTMLElement).textContent = name;
      (card.querySelector('small') as HTMLElement).textContent = hint;
    };
    fill('.pick-small', words.smallPatch, words.smallHint);
    fill('.pick-big', words.bigPatch, words.bigHint);
  }

  relabel();
  return { element, relabel };
}
