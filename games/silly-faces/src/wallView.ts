import { creatureSvg } from './art.ts';
import { text } from './lang/index.ts';
import type { Look } from './parts.ts';
import { onTap } from './tap.ts';
import { WALL_SIZE } from './wall.ts';

const BLINK_SPREAD_S = 6;

export interface WallEvents {
  friends: () => Look[];
  onFriend: (look: Look) => void;
  onEmpty: () => void;
}

export interface WallView {
  draw(): void;
  /** Sets every friend dancing, a little out of step. `move` picks the dance. */
  dance(move: number): void;
  stopDancing(): void;
}

export function createWallView(grid: HTMLElement, events: WallEvents): WallView {
  function slot(friend: Look | undefined, index: number): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    if (!friend) {
      button.className = 'slot slot-empty';
      button.setAttribute('aria-label', text().ui.empty);
      onTap(button, events.onEmpty);
      return button;
    }
    button.className = 'slot friend';
    button.setAttribute('aria-label', text().ui.friend(index + 1));
    button.innerHTML = `<span class="mover">${creatureSvg(friend, Number((Math.random() * BLINK_SPREAD_S).toFixed(1)))}</span>`;
    button.style.setProperty('--stagger', `${(index % 4) * 60}ms`);
    onTap(button, () => events.onFriend(friend));
    return button;
  }

  return {
    draw() {
      const friends = events.friends();
      grid.replaceChildren(...Array.from({ length: WALL_SIZE }, (_, index) => slot(friends[index], index)));
    },

    dance(move) {
      for (const friend of grid.querySelectorAll<HTMLElement>('.friend')) {
        friend.dataset.act = 'dance';
        friend.dataset.move = String(move);
      }
    },

    stopDancing() {
      for (const friend of grid.querySelectorAll<HTMLElement>('.friend')) delete friend.dataset.act;
    },
  };
}
