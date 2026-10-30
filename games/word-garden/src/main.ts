import '@playroom/kit/kit.css';
import './style.css';
import {
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  useClips,
  type Language,
} from '@playroom/kit';
import { friendArriving } from './garden.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { pickNext } from './picker.ts';
import { loadSave, writeSave } from './save.ts';
import type { Spelling } from './spelling.ts';
import { button, el, fly } from './ui/dom.ts';
import { createGardenScreen } from './ui/gardenScreen.ts';
import { createGardenStrip } from './ui/gardenStrip.ts';
import { createRound } from './ui/round.ts';
import { createStartScreen } from './ui/startScreen.ts';
import { findWord } from './words.ts';

type Mode = 'grow' | 'replay';

/** A word being spelled, and the language it belongs to. */
interface RoundPlace {
  language: Language;
  word: string;
  mode: Mode;
}

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const topbar = byId('topbar');
const screen = byId('screen');
const saves: Record<Language, ReturnType<typeof loadSave>> = { en: loadSave('en'), sl: loadSave('sl') };
/** The level under way. Its id means the same in every language. */
let currentLevel: number | null = null;
let onKey: ((letter: string) => void) | null = null;
let redrawScreen: () => void = showStart;
let activeRound: (RoundPlace & { round: ReturnType<typeof createRound> }) | null = null;
/** The round left behind by a language switch, so switching straight back carries on with it. */
let pausedRound: (RoundPlace & { spelling: Spelling }) | null = null;

function save() {
  return saves[getLanguage()];
}

function showPageLanguage() {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
}

function showTopbar(title: string | null, end: HTMLElement[] = []) {
  const home = homeButton();
  home.setAttribute('aria-label', text().home);
  const flag = languageButton(['en', 'sl']);
  if (end.length === 0) flag.classList.add('topbar-end');
  topbar.replaceChildren(
    home,
    ...(title ? [el('h1', { className: 'title', text: title })] : []),
    ...end,
    flag,
  );
}

function gardenLabel(plants: number): string {
  return plants > 0 ? `🌻 ${plants}` : '🌻';
}

function gardenButton(className: string): HTMLElement {
  const open = button(gardenLabel(save().garden.length), className, showGarden);
  open.setAttribute('aria-label', text().myGarden);
  return open;
}

/** Leaves any round on screen for good and hands it back. */
function leaveRound() {
  const left = activeRound;
  left?.round.stop();
  activeRound = null;
  pausedRound = null;
  onKey = null;
  return left;
}

function showStart() {
  leaveRound();
  redrawScreen = showStart;
  showTopbar(text().title, [gardenButton('pill topbar-end')]);
  screen.replaceChildren(createStartScreen((level) => playLevel(level.id)));
}

function continueAction(): (() => void) | null {
  const level = currentLevel;
  return level === null ? null : () => playLevel(level);
}

function showGarden() {
  leaveRound();
  redrawScreen = showGarden;
  showTopbar(text().myGarden);
  screen.replaceChildren(
    createGardenScreen({
      garden: save().garden,
      onSpell: spellAgain,
      onLevels: showStart,
      onContinue: continueAction(),
    }),
  );
}

function playLevel(levelId: number) {
  const level = text().levels.find((candidate) => candidate.id === levelId);
  if (!level) return;
  currentLevel = levelId;
  const current = save();
  const pool = level.words.map((entry) => entry.word);
  const next = pickNext(pool, current.seen[levelId] ?? [], Math.random);
  current.seen[levelId] = next.seen;
  writeSave(current, getLanguage());
  playWord(next.word, 'grow');
}

function spellAgain(word: string) {
  playWord(word, 'replay');
}

/** A new word grows a flower. Spelling an old one again is just for the joy of it. */
function playWord(word: string, mode: Mode, resume?: Spelling) {
  const words = text();
  const found = findWord(word, words.levels);
  if (!found) return;
  leaveRound();
  // A late last letter must land in this round's garden, whichever language is showing by then.
  const language = getLanguage();
  const current = saves[language];
  const strip = createGardenStrip(current.garden.length, showGarden);
  const countPill = gardenButton('pill');

  const onWin = (seedFrom: Element): string[] => {
    if (mode === 'replay') return [];
    const index = current.garden.length;
    current.garden.push(word);
    writeSave(current, language);
    countPill.textContent = gardenLabel(current.garden.length);
    if (!seedFrom.isConnected) return [];
    const friend = friendArriving(current.garden.length);
    const seed = el('span', { className: 'seed', text: '🌱' });
    void fly(seed, seedFrom, strip.target, 700).then(() => strip.grow(index, friend?.emoji ?? null));
    return friend ? [words.friendCame(friend.name)] : [];
  };

  const winActions = () =>
    mode === 'grow'
      ? [
          button(words.next, 'btn btn-leaf next', () => playLevel(found.level.id)),
          button(words.myGardenButton, 'btn btn-sun', showGarden),
        ]
      : [button(words.myGardenButton, 'btn btn-leaf next', showGarden)];

  const round = createRound({
    picture: found.picture,
    extras: found.level.extras,
    showWord: current.showWord,
    resume,
    onWin,
    winActions,
  });

  const helpers = createHelpers(round);
  showTopbar(null, [countPill, helpers.toggle]);
  screen.replaceChildren(helpers.panel, round.root, strip.root);
  activeRound = { language, word, mode, round };
  onKey = (letter) => round.typeLetter(letter);
  round.start();
}

/**
 * Spelling is different in each language, so a round can't change language. An
 * unfinished one waits while the new language gets a word from the same level,
 * and switching straight back carries on with it.
 */
function changeLanguage(language: Language) {
  showPageLanguage();
  const waiting = pausedRound?.language === language ? pausedRound : null;
  const left = leaveRound();
  if (!left) {
    redrawScreen();
    return;
  }
  if (waiting) playWord(waiting.word, waiting.mode, waiting.spelling);
  else if (left.mode === 'grow' && currentLevel !== null) playLevel(currentLevel);
  else showGarden();

  const spelling = left.round.spelling();
  const finished = spelling.filled === spelling.word.length;
  if (!finished) pausedRound = { language: left.language, word: left.word, mode: left.mode, spelling };
}

/** The grown-up tools: tucked behind one small button so they don't distract the child. */
function createHelpers(round: ReturnType<typeof createRound>) {
  const showWord = el('input', { attrs: { type: 'checkbox' } });
  const words = text();
  const current = save();
  const language = getLanguage();
  showWord.checked = current.showWord;
  showWord.addEventListener('change', () => {
    current.showWord = showWord.checked;
    writeSave(current, language);
    round.setShowWord(showWord.checked);
  });

  const panel = el('div', { className: 'helpers', attrs: { id: 'helpers', hidden: '' } }, [
    button(words.hint, 'pill', () => round.hint()),
    el('label', { className: 'pill' }, [showWord, words.showWord]),
    button(words.levelsButton, 'pill', showStart),
  ]);
  const toggle = button(words.grownUps, 'pill topbar-end', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'helpers');
  return { panel, toggle };
}

window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  // Slovenian tiles show capitals, so Caps Lock still counts. Words are stored in lowercase.
  const key = getLanguage() === 'sl' ? event.key.toLowerCase() : event.key;
  if (/^\p{Ll}$/u.test(key)) onKey?.(key);
});

onLanguageChange(changeLanguage);
showPageLanguage();
showStart();
