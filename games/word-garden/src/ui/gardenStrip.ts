import { flowerAt, friendsFor } from '../garden.ts';
import { text } from '../lang/index.ts';
import { prefersCalm, el, wait } from './dom.ts';

const SPROUT_MS = 800;

function plantEl(index: number): HTMLElement {
  return el('span', { className: 'plant', text: flowerAt(index) });
}

/** The strip of soil under each round: the newest flowers, with any friends above them. */
export function createGardenStrip(plantCount: number, onOpen: () => void) {
  const row = el('span', { className: 'strip-row' });
  const friends = el('span', { className: 'strip-friends' });
  const root = el(
    'button',
    { className: 'strip', attrs: { type: 'button', 'aria-label': text().myGarden }, onClick: onOpen },
    [friends, row],
  );

  // Flowers sit against the right edge, so older ones slide off the left.
  const newest = Math.max(0, plantCount - 14);
  for (let i = newest; i < plantCount; i++) row.append(plantEl(i));
  for (const friend of friendsFor(plantCount).slice(-5)) {
    friends.append(el('span', { className: 'friend', text: friend.emoji }));
  }

  return {
    root,
    /** Where a seed should land. */
    target: root,
    /** Shows a sprout that opens into the flower for the plant at `index`. */
    async grow(index: number, friendEmoji: string | null): Promise<void> {
      const plant = el('span', { className: 'plant is-sprout', text: '🌱' });
      row.append(plant);
      if (!prefersCalm()) await wait(SPROUT_MS);
      plant.textContent = flowerAt(index);
      plant.classList.replace('is-sprout', 'is-bloom');
      if (friendEmoji) friends.append(el('span', { className: 'friend is-arriving', text: friendEmoji }));
    },
  };
}
