import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, store, useClips } from '@playroom/kit';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { LEVELS } from './levels.ts';
import { paintLandscape, wearWorld } from './landscape.ts';
import { showLevels, showRunners } from './menu.ts';
import { startPlay, type FinishInfo, type PlayScreen, type RunResult } from './play.ts';
import { RUNNER_IDS, type RunnerId } from './runners.ts';
import { bestKey, cleanProgress, record } from './save.ts';
import { DIFFICULTY_IDS, type DifficultyId } from './tuning.ts';
import { button, element } from './ui.ts';
import { WORLDS, type WorldId } from './worlds.ts';

const PROGRESS_KEY = 'hop-dash:progress';
const DIFFICULTY_KEY = 'hop-dash:difficulty';
const RUNNER_KEY = 'hop-dash:runner';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

function savedDifficulty(): DifficultyId {
  const saved = store.get<unknown>(DIFFICULTY_KEY, 'easy');
  return DIFFICULTY_IDS.find((difficulty) => difficulty === saved) ?? 'easy';
}

function savedRunner(): RunnerId {
  const saved = store.get<unknown>(RUNNER_KEY, 'bunny');
  return RUNNER_IDS.find((id) => id === saved) ?? 'bunny';
}

useClips(clips);

const bar = byId('topbar');
const app = byId('app');
const landscape = element('canvas', 'landscape');
landscape.setAttribute('aria-hidden', 'true');
document.body.prepend(landscape);
const heading = element('h1', 'title');
const home = homeButton();
const back = button('bar-btn back-btn');
const retry = button('bar-btn retry-btn');
retry.textContent = '🔁';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, back, retry, repeat, language);

let play: PlayScreen | null = null;
let closeMenu: () => void = () => {};
let screen: 'runners' | 'levels' | 'play' = 'runners';
let runner = savedRunner();
let difficulty = savedDifficulty();
let levelIndex = 0;

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  repeat.setAttribute('aria-label', text().sayAgain);
  retry.setAttribute('aria-label', text().retry);
  back.setAttribute('aria-label', screen === 'play' ? text().levels : text().changeRunner);
  back.textContent = screen === 'play' ? '🗺️' : '🏃';
}

function leaveScreen(): void {
  closeMenu();
  closeMenu = () => {};
  play?.stop();
  play = null;
}

let worldNow: WorldId = 'meadow';

function setWorld(world: WorldId): void {
  worldNow = world;
  wearWorld(WORLDS[world]);
  paintLandscape(landscape, WORLDS[world]);
}

/** The map stands in the world the child is up to, so it changes as they play. */
function nextWorld(): WorldId {
  const { best } = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  return (LEVELS.find((plan) => !best[bestKey(plan.id, difficulty)]) ?? LEVELS[0]!).world;
}

function drawRunners(): void {
  closeMenu = showRunners(app, {
    difficulty,
    onDifficulty: (chosen) => {
      difficulty = chosen;
      store.set(DIFFICULTY_KEY, chosen);
    },
    onRunner: (chosen) => {
      runner = chosen;
      store.set(RUNNER_KEY, chosen);
      speak(text().runners[chosen]);
      levels(false);
    },
  });
}

function drawLevels(): void {
  closeMenu = showLevels(app, {
    difficulty,
    progress: cleanProgress(store.get<unknown>(PROGRESS_KEY, null)),
    onLevel: go,
  });
}

function runners(): void {
  leaveScreen();
  screen = 'runners';
  setWorld('meadow');
  labelPage();
  drawRunners();
  speak(text().who);
}

function levels(sayWhere: boolean): void {
  leaveScreen();
  screen = 'levels';
  setWorld(nextWorld());
  labelPage();
  drawLevels();
  if (sayWhere) speak(text().where);
}

function finished(index: number, result: RunResult): FinishInfo {
  const plan = LEVELS[index]!;
  const before = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  const saved = record(before, {
    levelId: plan.id,
    difficulty,
    stars: result.stars,
    score: result.score,
    foundTreasure: result.foundTreasure,
  });
  store.set(PROGRESS_KEY, saved.progress);
  return {
    best: saved.progress.best[bestKey(plan.id, difficulty)]?.score ?? result.score,
    newBest: saved.newBest,
    treasure: saved.firstTreasure ? plan.treasure : null,
  };
}

function go(index: number): void {
  leaveScreen();
  screen = 'play';
  levelIndex = index;
  setWorld(LEVELS[index]!.world);
  labelPage();
  play = startPlay(app, {
    plan: LEVELS[index]!,
    runner,
    difficulty,
    hasNext: index < LEVELS.length - 1,
    onFinish: (result) => finished(index, result),
    onAgain: () => go(index),
    onNext: () => go(index + 1),
    onLevels: () => levels(true),
  });
}

back.addEventListener('click', () => (screen === 'play' ? levels(true) : runners()));
retry.addEventListener('click', () => go(levelIndex));
repeat.addEventListener('click', () => {
  if (screen === 'runners') speak(text().who);
  else if (screen === 'levels') speak(text().where);
  else if (play) speak(play.line());
});

onLanguageChange(() => {
  labelPage();
  if (play) {
    play.redraw();
    return;
  }
  closeMenu();
  if (screen === 'runners') drawRunners();
  else drawLevels();
});

window.addEventListener('resize', () => paintLandscape(landscape, WORLDS[worldNow]));

labelPage();
runners();
