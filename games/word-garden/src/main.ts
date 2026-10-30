import '@playroom/kit/kit.css';
import './style.css';
import { homeButton } from '@playroom/kit';
import { friendArriving } from './garden.ts';
import { pickNext } from './picker.ts';
import { loadSave, writeSave } from './save.ts';
import { button, el, fly } from './ui/dom.ts';
import { createGardenScreen } from './ui/gardenScreen.ts';
import { createGardenStrip } from './ui/gardenStrip.ts';
import { createRound } from './ui/round.ts';
import { createStartScreen } from './ui/startScreen.ts';
import { findWord, type Level } from './words.ts';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

const topbar = byId('topbar');
const screen = byId('screen');
const save = loadSave();
let currentLevel: Level | null = null;
let onKey: ((letter: string) => void) | null = null;

function showTopbar(title: string | null, end: HTMLElement[] = []) {
  topbar.replaceChildren(
    homeButton(),
    ...(title ? [el('h1', { className: 'title', text: title })] : []),
    ...end,
  );
}

function gardenLabel(): string {
  return save.garden.length > 0 ? `🌻 ${save.garden.length}` : '🌻';
}

function gardenButton(className: string): HTMLElement {
  const open = button(gardenLabel(), className, showGarden);
  open.setAttribute('aria-label', 'My garden');
  return open;
}

function showStart() {
  onKey = null;
  showTopbar('Word Garden', [gardenButton('pill topbar-end')]);
  screen.replaceChildren(createStartScreen(playLevel));
}

function continueAction(): (() => void) | null {
  const level = currentLevel;
  return level && (() => playLevel(level));
}

function showGarden() {
  onKey = null;
  showTopbar('My garden');
  screen.replaceChildren(
    createGardenScreen({
      garden: save.garden,
      onSpell: spellAgain,
      onLevels: showStart,
      onContinue: continueAction(),
    }),
  );
}

function playLevel(level: Level) {
  currentLevel = level;
  const pool = level.words.map((entry) => entry.word);
  const next = pickNext(pool, save.seen[level.id] ?? [], Math.random);
  save.seen[level.id] = next.seen;
  writeSave(save);
  playWord(next.word, 'grow');
}

function spellAgain(word: string) {
  playWord(word, 'replay');
}

/** A new word grows a flower. Spelling an old one again is just for the joy of it. */
function playWord(word: string, mode: 'grow' | 'replay') {
  const found = findWord(word);
  if (!found) return;
  const strip = createGardenStrip(save.garden.length, showGarden);
  const countPill = gardenButton('pill');

  const onWin = (seedFrom: Element): string[] => {
    if (mode === 'replay') return [];
    const index = save.garden.length;
    save.garden.push(word);
    writeSave(save);
    countPill.textContent = gardenLabel();
    const friend = friendArriving(save.garden.length);
    const seed = el('span', { className: 'seed', text: '🌱' });
    void fly(seed, seedFrom, strip.target, 700).then(() => strip.grow(index, friend?.emoji ?? null));
    return friend ? [`A ${friend.name} came to your garden!`] : [];
  };

  const winActions = () =>
    mode === 'grow'
      ? [
          button('Next ➜', 'btn btn-leaf next', () => playLevel(found.level)),
          button('🌻 My garden', 'btn btn-sun', showGarden),
        ]
      : [button('🌻 My garden', 'btn btn-leaf next', showGarden)];

  const round = createRound({
    picture: found.picture,
    extras: found.level.extras,
    showWord: save.showWord,
    onWin,
    winActions,
  });

  const helpers = createHelpers(round);
  showTopbar(null, [countPill, helpers.toggle]);
  screen.replaceChildren(helpers.panel, round.root, strip.root);
  onKey = (letter) => round.typeLetter(letter);
  round.start();
}

/** The grown-up tools: tucked behind one small button so they don't distract the child. */
function createHelpers(round: ReturnType<typeof createRound>) {
  const showWord = el('input', { attrs: { type: 'checkbox' } });
  showWord.checked = save.showWord;
  showWord.addEventListener('change', () => {
    save.showWord = showWord.checked;
    writeSave(save);
    round.setShowWord(showWord.checked);
  });

  const panel = el('div', { className: 'helpers', attrs: { id: 'helpers', hidden: '' } }, [
    button('💡 Hint', 'pill', () => round.hint()),
    el('label', { className: 'pill' }, [showWord, 'Show the word']),
    button('Levels', 'pill', showStart),
  ]);
  const toggle = button('Grown-ups', 'pill topbar-end', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'helpers');
  return { panel, toggle };
}

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[a-z]$/.test(event.key)) onKey?.(event.key);
});

showStart();
