import { onLanguageChange, store } from '@playroom/kit';
import { button, el } from './dom.ts';
import { text } from './lang/index.ts';
import {
  BESTS_KEY,
  BOARD_SIZES,
  SETUP_KEY,
  nextFace,
  readBests,
  readSetup,
  type Mode,
  type Setup,
} from './setup.ts';
import { say } from './voice.ts';

const MODES: { mode: Mode; emoji: string }[] = [
  { mode: 'together', emoji: '🧒🧑' },
  { mode: 'solo', emoji: '🧒' },
];

function choiceButton(emoji: string, label: string, note: string): HTMLButtonElement {
  const choice = button('choice');
  choice.append(el('span', 'choice-emoji', emoji), el('span', 'choice-label', label));
  if (note) choice.append(el('span', 'choice-note', note));
  return choice;
}

/** The first screen: who is playing and how big the board is. */
export function showSetup(host: HTMLElement, onPlay: (setup: Setup) => void): void {
  let setup = readSetup(store.get<unknown>(SETUP_KEY, null));
  const bests = readBests(store.get<unknown>(BESTS_KEY, null));
  const screen = el('section', 'setup');

  function update(change: Partial<Setup>): void {
    setup = { ...setup, ...change };
    store.set(SETUP_KEY, setup);
    draw();
  }

  function modeRow(): HTMLElement {
    const row = el('div', 'choice-row');
    for (const { mode, emoji } of MODES) {
      const choice = choiceButton(emoji, text().modes[mode].label, '');
      choice.setAttribute('aria-pressed', String(setup.mode === mode));
      choice.addEventListener('click', () => {
        say(() => text().modes[mode].spoken);
        update({ mode });
      });
      row.append(choice);
    }
    return row;
  }

  function faceRow(): HTMLElement {
    const row = el('div', 'face-row');
    text().playerNames.forEach((name, player) => {
      const chip = button('face-chip');
      chip.append(el('span', 'face-emoji', setup.faces[player]), el('span', 'face-name', name));
      chip.setAttribute('aria-label', text().changeFace(name));
      chip.addEventListener('click', () => {
        const faces: [string, string] = [...setup.faces];
        faces[player] = nextFace(setup.faces[player], setup.faces[1 - player]);
        say(() => text().playerNames[player]);
        update({ faces });
      });
      row.append(chip);
    });
    return row;
  }

  function sizeRow(): HTMLElement {
    const row = el('div', 'choice-row');
    for (const { pairs, emoji } of BOARD_SIZES) {
      const best = setup.mode === 'solo' ? bests[pairs] : undefined;
      const note = best === undefined ? text().sizeNote(pairs) : text().bestNote(best);
      const choice = choiceButton(emoji, text().sizes[pairs].label, note);
      choice.setAttribute('aria-pressed', String(setup.pairs === pairs));
      choice.addEventListener('click', () => {
        say(() => text().sizes[pairs].spoken);
        update({ pairs });
      });
      row.append(choice);
    }
    return row;
  }

  function draw(): void {
    const play = button('btn btn-leaf play-btn', text().play);
    play.addEventListener('click', () => {
      stopListening();
      onPlay(setup);
    });
    screen.replaceChildren(
      el('h2', 'setup-label', text().whoPlays),
      modeRow(),
      ...(setup.mode === 'together' ? [faceRow()] : []),
      el('h2', 'setup-label', text().howManyCards),
      sizeRow(),
      play,
    );
  }

  const stopListening = onLanguageChange(draw);
  draw();
  host.replaceChildren(screen);
}
