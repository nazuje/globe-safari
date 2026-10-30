import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, store, useClips } from '@playroom/kit';
import { cleanSaved, meetFriend, recordRun, type Saved } from './collection.ts';
import { showFriends } from './friends.ts';
import type { Result } from './game.ts';
import type { KindId } from './kinds.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { LEVEL_IDS, SPEED_IDS, type LevelId, type SpeedId } from './levels.ts';
import { showMenu } from './menu.ts';
import { startPlay, type PlayScreen } from './play.ts';
import { showResults, type ResultsPanel } from './results.ts';
import { button, element } from './ui.ts';

const SAVE_KEY = 'tickle-blaster:saved';
const SPEED_KEY = 'tickle-blaster:speed';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

function savedSpeed(): SpeedId {
  const saved = store.get<unknown>(SPEED_KEY, 'easy');
  return SPEED_IDS.find((speed) => speed === saved) ?? 'easy';
}

useClips(clips);

const bar = byId('topbar');
const app = byId('app');
const heading = element('h1', 'title');
const home = homeButton();
const levelsBtn = button('bar-btn levels-bar-btn', '🪐');
const repeat = button('bar-btn', '🔊');
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, levelsBtn, repeat, language);

let saved: Saved = cleanSaved(store.get<unknown>(SAVE_KEY, null));
let play: PlayScreen | null = null;
let results: ResultsPanel | null = null;
let closeScreen: () => void = () => {};
let redrawScreen: () => void = () => {};
let newFriends: KindId[] = [];

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  levelsBtn.setAttribute('aria-label', text().levelsButton);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function leaveScreen(): void {
  closeScreen();
  closeScreen = () => {};
  redrawScreen = () => {};
  play?.stop();
  play = null;
  results = null;
}

function openMenu(): void {
  closeScreen();
  closeScreen = showMenu(app, {
    saved,
    speed: savedSpeed(),
    onSpeed: (speed) => store.set(SPEED_KEY, speed),
    onLevel: go,
    onFriends: openFriends,
  });
  redrawScreen = openMenu;
}

function menu(): void {
  leaveScreen();
  openMenu();
  speak(text().pick);
}

function openFriends(): void {
  leaveScreen();
  closeScreen = showFriends(app, saved);
  redrawScreen = openFriends;
}

function meet(friend: KindId): void {
  const met = meetFriend(saved, friend);
  saved = met.saved;
  store.set(SAVE_KEY, saved);
  if (met.isNew) newFriends.push(friend);
}

function finish(result: Result, stage: HTMLElement): void {
  const run = recordRun(saved, result);
  saved = run.saved;
  store.set(SAVE_KEY, saved);
  const next = LEVEL_IDS[LEVEL_IDS.indexOf(result.levelId) + 1];
  results = showResults(stage, {
    result,
    newBest: run.newBest,
    best: saved.best[`${result.levelId}:${result.speedId}`] ?? result.score,
    friends: newFriends,
    hasNext: next !== undefined,
    onAgain: () => go(result.levelId),
    onNext: () => go(next ?? result.levelId),
    onLevels: menu,
  });
  redrawScreen = () => results?.redraw();
}

function go(level: LevelId): void {
  leaveScreen();
  newFriends = [];
  play = startPlay(app, { levelId: level, speedId: savedSpeed(), onMet: meet, onDone: finish });
}

levelsBtn.addEventListener('click', menu);
repeat.addEventListener('click', () => {
  if (results) speak(results.line());
  else speak(play ? play.line() : text().pick);
});

/** Browsers keep speech quiet until the first tap, so that tap is when the menu gets its voice. */
function promptOnFirstTap(): void {
  const events = ['touchend', 'click'] as const;
  const prompt = (): void => {
    for (const type of events) document.removeEventListener(type, prompt);
    if (document.body.dataset.screen === 'menu') void say(text().pick, { queue: true });
  };
  for (const type of events) document.addEventListener(type, prompt);
}

onLanguageChange(() => {
  labelPage();
  redrawScreen();
});

labelPage();
openMenu();
promptOnFirstTap();
