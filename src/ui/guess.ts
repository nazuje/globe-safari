import type { Animal, Region } from '../data/types.ts';
import { starBurst } from './confetti.ts';
import { bigButton, el, shuffle } from './dom.ts';
import { animalPicture } from './photo.ts';
import { speakerButton, stopSpeaking } from './speech.ts';

export interface GuessOptions {
  /** Called when the family says they guessed right. */
  onStar: () => void;
}

function mysteryFace(animal: Animal): { face: HTMLElement; showShadow: () => void } {
  const shadow = el('span', { className: 'mystery-shadow', text: animal.emoji, attrs: { 'aria-hidden': 'true' } });
  const face = el('div', { className: 'flip-face flip-front mystery' }, [
    el('span', { className: 'mystery-mark', text: '?', attrs: { 'aria-hidden': 'true' } }),
    shadow,
    el('span', { className: 'mystery-caption', text: 'Who am I?' }),
  ]);
  return { face, showShadow: () => face.classList.add('show-shadow') };
}

function revealFace(animal: Animal): HTMLElement {
  return el('div', { className: 'flip-face flip-back', attrs: { 'aria-hidden': 'true' } }, [
    animalPicture(animal),
    el('h3', { className: 'animal-name', text: `${animal.emoji} ${animal.name}` }),
    el('p', { className: 'fun-fact' }, [
      el('span', { text: animal.funFact }),
      speakerButton(`${animal.name}! ${animal.funFact}`, 'Read the fun fact'),
    ]),
  ]);
}

function clueItem(clue: string, index: number): HTMLLIElement {
  return el('li', { className: 'clue' }, [
    el('span', { className: 'clue-number', text: String(index + 1), attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'clue-text', text: clue }),
    speakerButton(clue, `Read clue ${index + 1}`),
  ]);
}

/**
 * "Who lives here?": one mystery animal at a time. Clues appear one by one,
 * then a big reveal flips the card. Parents award a star with "We got it!".
 */
export function renderGuessGame(container: HTMLElement, region: Region, { onStar }: GuessOptions): void {
  let order = shuffle(region.animals);
  let position = 0;

  function showAnimal() {
    stopSpeaking();
    const animal = order[position];
    let cluesShown = 1;

    const { face: front, showShadow } = mysteryFace(animal);
    const back = revealFace(animal);
    const card = el('div', { className: 'flip-card guess-card' }, [
      el('div', { className: 'flip-inner' }, [front, back]),
    ]);
    const clues = el('ol', { className: 'clues', attrs: { 'aria-live': 'polite' } }, [clueItem(animal.clues[0], 0)]);
    const actions = el('div', { className: 'guess-actions' });
    const progress = el('p', {
      className: 'guess-progress',
      text: `Mystery animal ${position + 1} of ${order.length}`,
    });

    const nextClue = bigButton('Next clue 🔍', () => {
      clues.append(clueItem(animal.clues[cluesShown], cluesShown));
      cluesShown += 1;
      if (cluesShown >= animal.clues.length) {
        nextClue.disabled = true;
        nextClue.textContent = 'No more clues!';
        showShadow();
      }
    }, 'btn-clue');

    const reveal = (gotIt: boolean) => {
      if (gotIt) onStar();
      card.classList.add('is-flipped');
      back.removeAttribute('aria-hidden');
      front.setAttribute('aria-hidden', 'true');
      starBurst(card, gotIt ? 26 : 14);
      const isLast = position === order.length - 1;
      actions.replaceChildren(
        bigButton(isLast ? 'Play again 🔁' : 'Next animal ➡️', () => {
          if (isLast) {
            order = shuffle(region.animals);
            position = 0;
          } else {
            position += 1;
          }
          showAnimal();
        }, 'btn-next'),
      );
    };

    actions.append(
      nextClue,
      bigButton('Reveal! ✨', () => reveal(false), 'btn-reveal'),
      bigButton('We got it! ⭐', () => reveal(true), 'btn-star'),
    );

    container.replaceChildren(el('div', { className: 'guess' }, [progress, card, clues, actions]));
  }

  showAnimal();
}
