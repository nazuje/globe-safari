import { store } from '@playroom/kit';
import { button, el } from './dom.ts';
import {
  BESTS_KEY,
  BOARD_SIZES,
  PLAYER_NAMES,
  SETUP_KEY,
  nextFace,
  readBests,
  readSetup,
  type Mode,
  type Setup,
} from './setup.ts';
import { say } from './voice.ts';

const MODES: { mode: Mode; label: string; emoji: string; spoken: string }[] = [
  { mode: 'together', label: 'Together', emoji: '🧒🧑', spoken: 'Together! Take turns.' },
  { mode: 'solo', label: 'Just me', emoji: '🧒', spoken: 'Just me!' },
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
    for (const { mode, label, emoji, spoken } of MODES) {
      const choice = choiceButton(emoji, label, '');
      choice.setAttribute('aria-pressed', String(setup.mode === mode));
      choice.addEventListener('click', () => {
        say(spoken);
        update({ mode });
      });
      row.append(choice);
    }
    return row;
  }

  function faceRow(): HTMLElement {
    const row = el('div', 'face-row');
    PLAYER_NAMES.forEach((name, player) => {
      const chip = button('face-chip');
      chip.append(el('span', 'face-emoji', setup.faces[player]), el('span', 'face-name', name));
      chip.setAttribute('aria-label', `Change ${name}'s picture`);
      chip.addEventListener('click', () => {
        const faces: [string, string] = [...setup.faces];
        faces[player] = nextFace(setup.faces[player], setup.faces[1 - player]);
        say(name);
        update({ faces });
      });
      row.append(chip);
    });
    return row;
  }

  function sizeRow(): HTMLElement {
    const row = el('div', 'choice-row');
    for (const { pairs, label, emoji, spoken } of BOARD_SIZES) {
      const best = setup.mode === 'solo' ? bests[pairs] : undefined;
      const choice = choiceButton(emoji, label, best === undefined ? `${pairs} pairs` : `Best ${best}`);
      choice.setAttribute('aria-pressed', String(setup.pairs === pairs));
      choice.addEventListener('click', () => {
        say(spoken);
        update({ pairs });
      });
      row.append(choice);
    }
    return row;
  }

  function draw(): void {
    const play = button('btn btn-leaf play-btn', 'Play! 🐾');
    play.addEventListener('click', () => onPlay(setup));
    screen.replaceChildren(
      el('h2', 'setup-label', "Who's playing?"),
      modeRow(),
      ...(setup.mode === 'together' ? [faceRow()] : []),
      el('h2', 'setup-label', 'How many cards?'),
      sizeRow(),
      play,
    );
  }

  draw();
  host.replaceChildren(screen);
}
