import type { Animal, Region } from '../data/types.ts';
import { el } from './dom.ts';
import { animalPicture } from './photo.ts';
import { speakerButton } from './speech.ts';

function exploreCard(animal: Animal, index: number): HTMLElement {
  const back = el('div', { className: 'flip-face flip-back', attrs: { 'aria-hidden': 'true' } }, [
    el('h3', { className: 'animal-name', text: `${animal.emoji} ${animal.name}` }),
    el('p', { className: 'fun-fact' }, [el('span', { text: animal.funFact })]),
    speakerButton(`${animal.name}! ${animal.funFact}`, `Read about the ${animal.name}`),
  ]);
  const front = el('div', { className: 'flip-face flip-front' }, [
    animalPicture(animal),
    el('span', { className: 'tap-hint', text: 'Tap me!' }),
  ]);
  const card = el(
    'div',
    {
      className: 'flip-card explore-card',
      attrs: { role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': `Animal card ${index + 1}` },
    },
    [el('div', { className: 'flip-inner' }, [front, back])],
  );

  const flip = () => {
    const flipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(flipped));
    back.setAttribute('aria-hidden', String(!flipped));
    front.setAttribute('aria-hidden', String(flipped));
  };
  card.addEventListener('click', flip);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      flip();
    }
  });
  return card;
}

/** "Meet them all": a grid of flip cards, one for every animal in the region. */
export function renderExploreGrid(container: HTMLElement, region: Region): void {
  container.replaceChildren(
    el('div', { className: 'explore-grid' }, region.animals.map(exploreCard)),
  );
}
