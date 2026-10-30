import { flowerAt, friendsFor } from '../garden.ts';
import { sayLine, sayWord } from '../speech.ts';
import { findWord } from '../words.ts';
import { button, el } from './dom.ts';

export interface GardenScreenOptions {
  garden: readonly string[];
  onSpell: (word: string) => void;
  onLevels: () => void;
  /** Present when a level is under way, to carry on with it. */
  onContinue: (() => void) | null;
}

function wordCard(word: string, onSpell: (word: string) => void): HTMLDialogElement {
  const picture = findWord(word)?.picture.emoji ?? '🌱';
  const dialog = el('dialog', { className: 'word-card' }, [
    button(picture, 'picture', () => sayWord(word)),
    el('p', { className: 'card-word', text: word }),
    el('div', { className: 'win-actions' }, [
      button('✏️ Spell it again', 'btn btn-leaf', () => onSpell(word)),
      button('Back', 'btn', () => dialog.close()),
    ]),
  ]);
  dialog.addEventListener('close', () => dialog.remove());
  return dialog;
}

/** Every flower the child has grown. Tapping one says its word and offers to spell it again. */
export function createGardenScreen(options: GardenScreenOptions): HTMLElement {
  const { garden } = options;
  const root = el('section', { className: 'garden' });

  const openWord = (word: string) => {
    const card = wordCard(word, (chosen) => {
      card.close();
      options.onSpell(chosen);
    });
    root.append(card);
    card.showModal();
    sayWord(word);
  };

  const friends = friendsFor(garden.length).map((friend) => {
    const tap = () => sayLine(`A ${friend.name}!`);
    const friendButton = button(friend.emoji, 'garden-friend', tap);
    friendButton.setAttribute('aria-label', friend.name);
    return friendButton;
  });
  const flowers = garden.map((word, index) => {
    const flower = button(flowerAt(index), 'garden-flower', () => openWord(word));
    flower.setAttribute('aria-label', `Flower for ${word}`);
    return flower;
  });

  root.append(
    garden.length === 0
      ? el('p', { className: 'garden-empty', text: 'No flowers yet. Spell a word to plant a seed! 🌱' })
      : el('p', { className: 'garden-tip', text: 'Tap a flower to hear its word.' }),
    ...(friends.length > 0 ? [el('div', { className: 'garden-friends' }, friends)] : []),
    ...(flowers.length > 0 ? [el('div', { className: 'garden-bed' }, flowers)] : []),
    el('div', { className: 'win-actions' }, [
      options.onContinue && button('🌱 Spell more', 'btn btn-leaf', options.onContinue),
      button('Levels', 'btn btn-sun', options.onLevels),
    ]),
  );
  return root;
}
