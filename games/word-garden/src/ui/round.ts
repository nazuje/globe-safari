import { burst, canSpeak } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { pickExtras } from '../picker.ts';
import { sayLetter, sayWin, sayWord } from '../speech.ts';
import { hintTile, startSpelling, tapTile, type Spelling } from '../spelling.ts';
import type { PictureWord } from '../words.ts';
import { button, el, fly, wait } from './dom.ts';

const WIGGLE_MS = 480;

export interface RoundOptions {
  picture: PictureWord;
  extras: number;
  showWord: boolean;
  /** A round left unfinished, to carry on from where it stopped. */
  resume?: Spelling;
  /** Runs on the win. Returns any extra lines to say after the word. */
  onWin: (seedFrom: Element) => string[];
  /** The buttons that take over from the tray after a win. */
  winActions: () => HTMLElement[];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function slotCenter(slot: Element): { x: number; y: number } {
  const box = slot.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** One word: the picture, the slots, the tray and the words of encouragement. */
export function createRound(options: RoundOptions) {
  const { picture, showWord } = options;
  const { word } = picture;
  // One language for the whole round. A language switch draws a new round.
  const words = text();
  const tileFace = (letter: string) => el('span', { className: 'tile', text: words.show(letter) });
  let spelling: Spelling =
    options.resume ??
    startSpelling(word, pickExtras(word, options.extras, Math.random, words.lexicon, words.letters), Math.random);
  let wiggling = false;
  let stopped = false;

  const hear = () => sayWord(word);
  const message = el('p', { className: 'message', attrs: { 'aria-live': 'polite' } });
  const slots = [...word].map((letter) =>
    el('span', { className: 'slot' }, [el('span', { className: 'ghost', text: words.show(letter) })]),
  );
  const slotRow = el('div', { className: 'slots', attrs: { style: `--letters:${word.length}` } }, slots);
  const tileButtons = new Map<number, HTMLButtonElement>();
  const tray = el('div', { className: 'tray' });
  for (const tile of spelling.tiles) {
    const tileButton = button(words.show(tile.letter), 'tile', () => void onTap(tile.id));
    tileButton.setAttribute('aria-label', words.tileLabel(words.show(tile.letter)));
    if (tile.used) useUp(tileButton);
    tileButtons.set(tile.id, tileButton);
    tray.append(tileButton);
  }

  const root = el('section', { className: 'round' }, [
    el('div', { className: 'picture-side' }, [
      button(picture.emoji, 'picture', hear),
      canSpeak()
        ? button('🔊', 'hear', hear)
        : el('p', { className: 'no-sound', text: words.noSound }),
    ]),
    el('div', { className: 'spell-side' }, [slotRow, message, tray]),
  ]);
  root.querySelector('.hear')?.setAttribute('aria-label', words.hearWord);
  root.querySelector('.picture')?.setAttribute('aria-label', words.hearWord);
  setShowWord(showWord);
  for (const [at, slot] of slots.slice(0, spelling.filled).entries()) lockIn(slot, word[at]);

  function useUp(tileButton: HTMLButtonElement) {
    tileButton.classList.add('is-used');
    tileButton.disabled = true;
  }

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
    useUp(tileButton);
    message.textContent = '';
    if (result.outcome === 'correct') sayLetter(tile.letter);
    await fly(tileFace(tile.letter), tileButton, slot);
    lockIn(slot, tile.letter);
    if (result.outcome === 'complete') win(tile.letter);
  }

  function lockIn(slot: HTMLElement, letter: string) {
    slot.append(el('span', { className: 'letter', text: words.show(letter) }));
    slot.classList.add('is-locked');
  }

  async function tryAnother(letter: string, tileButton: HTMLButtonElement, slot: HTMLElement) {
    wiggling = true;
    message.textContent = words.tryAnother;
    sayLetter(letter, words.tryAnother);
    tileButton.classList.add('is-away');
    await fly(tileFace(letter), tileButton, slot, 240);
    const visitor = el('span', { className: 'letter is-wiggling', text: words.show(letter) });
    slot.append(visitor);
    await wait(WIGGLE_MS);
    visitor.remove();
    await fly(tileFace(letter), slot, tileButton, 240);
    tileButton.classList.remove('is-away');
    wiggling = false;
  }

  function win(lastLetter: string) {
    // The last letter was on its way when the child left. The flower still counts, but there's nothing to show.
    if (stopped) {
      options.onWin(slotRow);
      return;
    }
    const center = slotCenter(slotRow);
    burst(center.x, center.y);
    slotRow.classList.add('is-won');
    const lines = options.onWin(slotRow);
    sayWin(lastLetter, word, [pick(words.cheers), ...lines]);
    message.textContent = words.show(word);
    message.classList.add('is-word');
    tray.replaceChildren(el('div', { className: 'win-actions' }, options.winActions()));
  }

  return {
    root,
    start: hear,
    setShowWord,
    /** Where the round has got to, to carry on from later. */
    spelling: () => spelling,
    /** The round has left the screen, so it must stay quiet. Any letter still in flight lands unseen. */
    stop() {
      stopped = true;
    },
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
