import { burst, playSound, speak } from '@playroom/kit';
import { itemArt, skeleton } from './art.ts';
import { DINOS, ITEMS, itemsIn, type DinoId, type Family, type Item } from './catalog.ts';
import { calm, sounds } from './fx.ts';
import { text } from './lang/index.ts';
import { itemLine } from './lines.ts';
import { collectedCount, has, missingBones, type Save } from './save.ts';

const SHELVES: Family[] = ['gem', 'pirate', 'royal', 'toy', 'space', 'nature', 'friend', 'gold', 'dragon'];

function wiggle(element: HTMLElement): void {
  if (calm()) return;
  element.animate(
    [{ rotate: '0deg', scale: '1' }, { rotate: '-12deg', scale: '1.2' }, { rotate: '12deg', scale: '1.2' }, { rotate: '0deg', scale: '1' }],
    { duration: 340 },
  );
}

function dinoCard(save: Save, dino: DinoId): HTMLElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'dino';
  const done = missingBones(save, dino).length === 0;
  card.classList.toggle('dino-done', done);
  card.innerHTML = `${skeleton(dino, (piece) => has(save, `${dino}-${piece}`))}<span class="plaque"></span>`;
  card.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    wiggle(card);
    if (done) {
      sounds.roar();
      playSound('boing');
    } else {
      playSound('bonk');
    }
  });
  return card;
}

function itemCard(save: Save, item: Item): HTMLElement {
  const card = document.createElement('button');
  card.type = 'button';
  const found = has(save, item.id);
  card.className = `thing ${found ? 'found' : 'missing'}`;
  card.dataset.id = item.id;
  card.innerHTML = itemArt(item.id);
  card.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    wiggle(card);
    if (found) {
      playSound('ding');
      speak(itemLine(item.id));
      const box = card.getBoundingClientRect();
      burst(box.left + box.width / 2, box.top + box.height / 2, 8);
    } else {
      playSound('bonk');
      speak(text().stillHiding);
    }
  });
  return card;
}

export interface Room {
  element: HTMLElement;
  relabel(): void;
}

/** Everything found so far, and the shadows of what's still out there. */
export function buildRoom(save: Save): Room {
  const element = document.createElement('section');
  element.className = 'room';

  const head = document.createElement('div');
  head.className = 'room-head';
  head.innerHTML = '<h2 class="room-title"></h2><p class="room-count"></p>';
  element.append(head);

  const museum = document.createElement('div');
  museum.className = 'shelf museum';
  museum.innerHTML = '<h3 class="shelf-title" data-shelf="museum"></h3>';
  const hall = document.createElement('div');
  hall.className = 'hall';
  const cards = DINOS.map((dino) => dinoCard(save, dino));
  hall.append(...cards);
  museum.append(hall);
  element.append(museum);

  const shelves = SHELVES.map((family) => {
    const shelf = document.createElement('div');
    shelf.className = 'shelf';
    shelf.innerHTML = `<h3 class="shelf-title"></h3>`;
    const row = document.createElement('div');
    row.className = 'things';
    row.append(...itemsIn(family).map((item) => itemCard(save, item)));
    shelf.append(row);
    element.append(shelf);
    return { family, shelf, row };
  });

  function relabel(): void {
    const words = text();
    (head.querySelector('.room-title') as HTMLElement).textContent = words.roomLabel;
    (head.querySelector('.room-count') as HTMLElement).textContent = `${collectedCount(save)} / ${ITEMS.length}`;
    (museum.querySelector('.shelf-title') as HTMLElement).textContent = words.museum;
    cards.forEach((card, index) => {
      const dino = DINOS[index] as DinoId;
      const name = words.dinos[dino];
      (card.querySelector('.plaque') as HTMLElement).textContent = name;
      card.setAttribute('aria-label', name);
    });
    for (const { family, shelf, row } of shelves) {
      (shelf.querySelector('.shelf-title') as HTMLElement).textContent = words.shelves[family];
      for (const card of row.children) {
        card.setAttribute('aria-label', card.classList.contains('found') ? words.shelves[family] : words.hidden);
      }
    }
  }

  relabel();
  return { element, relabel };
}
