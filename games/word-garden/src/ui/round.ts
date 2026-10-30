import { burst, canSpeak } from '@playroom/kit';
import { pickExtras } from '../picker.ts';
import { sayLetter, sayWin, sayWord } from '../speech.ts';
import { hintTile, startSpelling, tapTile, type Spelling } from '../spelling.ts';
import type { PictureWord } from '../words.ts';
import { button, el, fly, wait } from './dom.ts';

const TRY_AGAIN = 'Try another one!';
const CHEERS = ['You did it!', 'Well done!', 'Hooray!', 'Great spelling!', 'You spelled it!'];
const WIGGLE_MS = 480;

export interface RoundOptions {
  picture: PictureWord;
  extras: number;
  showWord: boolean;
  /** Runs on the win. Returns any extra lines to say after the word. */
  onWin: (seedFrom: Element) => string[];
  /** The buttons that take over from the tray after a win. */
  winActions: () => HTMLElement[];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function tileFace(letter: string): HTMLElement {
  return el('span', { className: 'tile', text: letter });
}

function slotCenter(slot: Element): { x: number; y: number } {
  const box = slot.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** One word: the picture, the slots, the tray and the words of encouragement. */
export function createRound(options: RoundOptions) {
  const { picture, showWord } = options;
  const { word } = picture;
  let spelling: Spelling = startSpelling(word, pickExtras(word, options.extras, Math.random), Math.random);
  let wiggling = false;

  const hear = () => sayWord(word);
  const message = el('p', { className: 'message', attrs: { 'aria-live': 'polite' } });
  const slots = [...word].map((letter) =>
    el('span', { className: 'slot' }, [el('span', { className: 'ghost', text: letter })]),
  );
  const slotRow = el('div', { className: 'slots', attrs: { style: `--letters:${word.length}` } }, slots);
  const tileButtons = new Map<number, HTMLButtonElement>();
  const tray = el('div', { className: 'tray' });
  for (const tile of spelling.tiles) {
    const tileButton = button(tile.letter, 'tile', () => void onTap(tile.id));
    tileButton.setAttribute('aria-label', `letter ${tile.letter}`);
    tileButtons.set(tile.id, tileButton);
    tray.append(tileButton);
  }

  const root = el('section', { className: 'round' }, [
    el('div', { className: 'picture-side' }, [
      button(picture.emoji, 'picture', hear),
      canSpeak()
        ? button('🔊', 'hear', hear)
        : el('p', { className: 'no-sound', text: 'No sound here. A grown-up can read the word.' }),
    ]),
    el('div', { className: 'spell-side' }, [slotRow, message, tray]),
  ]);
  root.querySelector('.hear')?.setAttribute('aria-label', 'Hear the word');
  root.querySelector('.picture')?.setAttribute('aria-label', 'Hear the word');
  setShowWord(showWord);

  function clearHint() {
    for (const tileButton of tileButtons.values()) tileButton.classList.remove('is-hint');
  }

  function setShowWord(on: boolean) {
    slotRow.classList.toggle('show-word', on || !canSpeak());
  }

  async function onTap(tileId: number) {
    if (wiggling) return;
    const tileButton = tileButtons.get(tileId);
    const tile = spelling.tiles.find((candidate) => candidate.id === tileId);
    if (!tileButton || !tile) return;
    const slot = slots[spelling.filled];
    const result = tapTile(spelling, tileId);
    if (result.outcome === 'ignored') return;
    clearHint();
    if (result.outcome === 'wrong') {
      await tryAnother(tile.letter, tileButton, slot);
      return;
    }

    spelling = result.state;
    tileButton.classList.add('is-used');
    tileButton.disabled = true;
    message.textContent = '';
    if (result.outcome === 'correct') sayLetter(tile.letter);
    await fly(tileFace(tile.letter), tileButton, slot);
    lockIn(slot, tile.letter);
    if (result.outcome === 'complete') win(tile.letter);
  }

  function lockIn(slot: HTMLElement, letter: string) {
    slot.append(el('span', { className: 'letter', text: letter }));
    slot.classList.add('is-locked');
  }

  async function tryAnother(letter: string, tileButton: HTMLButtonElement, slot: HTMLElement) {
    wiggling = true;
    message.textContent = TRY_AGAIN;
    sayLetter(letter, TRY_AGAIN);
    tileButton.classList.add('is-away');
    await fly(tileFace(letter), tileButton, slot, 240);
    const visitor = el('span', { className: 'letter is-wiggling', text: letter });
    slot.append(visitor);
    await wait(WIGGLE_MS);
    visitor.remove();
    await fly(tileFace(letter), slot, tileButton, 240);
    tileButton.classList.remove('is-away');
    wiggling = false;
  }

  function win(lastLetter: string) {
    const center = slotCenter(slotRow);
    burst(center.x, center.y);
    slotRow.classList.add('is-won');
    const lines = options.onWin(slotRow);
    sayWin(lastLetter, word, [pick(CHEERS), ...lines]);
    message.textContent = word;
    message.classList.add('is-word');
    tray.replaceChildren(el('div', { className: 'win-actions' }, options.winActions()));
  }

  return {
    root,
    start: hear,
    setShowWord,
    hint() {
      if (wiggling) return;
      clearHint();
      const id = hintTile(spelling);
      if (id !== null) tileButtons.get(id)?.classList.add('is-hint');
    },
    /** Lets a keyboard play too: the first free tile with this letter. */
    typeLetter(letter: string) {
      const tile = spelling.tiles.find((candidate) => !candidate.used && candidate.letter === letter);
      if (tile) void onTap(tile.id);
    },
  };
}
