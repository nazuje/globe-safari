import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, say, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { createStage, type Stage } from '@playroom/stage3d';
import { heroPicture } from './art/picture.ts';
import { CHARACTER_IDS, type CharacterId } from './characters.ts';
import { trailTiles } from './guide.ts';
import { bindControls, type Controls } from './input.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { buildLevel, helpFor, withHelp, type Level } from './level.ts';
import { LEVELS } from './levels.ts';
import { startPlay, type PlayScreen } from './play.ts';
import { addTreasure, addWin, cleanProgress, nextLevel, totalStars, type Progress } from './progress.ts';
import { newRun, stepRun, type Run } from './run.ts';
import { showCharacters, showMap } from './screens.ts';
import { stopSounds } from './sounds.ts';
import { SETTINGS, type Setting } from './tuning.ts';
import { button, element } from './ui.ts';
import { createView, type View } from './view.ts';

const PROGRESS_KEY = 'maze-escape:progress';
const SETTING_KEY = 'maze-escape:setting';
const CHARACTER_KEY = 'maze-escape:character';
const CAMERA = { fov: 34, near: 1, far: 140 };

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

function saved<T extends string>(key: string, options: readonly T[], fallback: T): T {
  const value = store.get<unknown>(key, fallback);
  return options.find((option) => option === value) ?? fallback;
}

const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

useClips(clips);

const bar = byId('topbar');
const maze = byId('maze');
const overlay = byId('overlay');
const heading = element('h1', 'title');
const home = homeButton();
const levels = button('bar-btn');
levels.textContent = '🗺️';
const change = button('bar-btn');
change.textContent = '🎭';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, language, repeat, levels, change);

let headingFor: (() => string) | null = null;

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = headingFor ? headingFor() : text().title;
  home.setAttribute('aria-label', text().home);
  levels.setAttribute('aria-label', text().showLevels);
  change.setAttribute('aria-label', text().changeCharacter);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function showNo3d(): void {
  const note = element('p', 'no-3d');
  note.textContent = text().no3d;
  overlay.replaceChildren(note);
  repeat.hidden = true;
  levels.hidden = true;
  change.hidden = true;
  document.body.dataset.screen = 'no-3d';
}

interface Game {
  stage: Stage;
  view: View;
  controls: Controls;
}

function runGame({ stage, view, controls }: Game): void {
  const pictures: Partial<Record<CharacterId, string>> = {};
  for (const id of CHARACTER_IDS) pictures[id] = heroPicture(stage.renderer, id) ?? undefined;

  let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  let setting: Setting = saved(SETTING_KEY, SETTINGS, 'easy');
  let character: CharacterId = saved(CHARACTER_KEY, CHARACTER_IDS, 'fox');
  let play: PlayScreen | null = null;
  let closeOverlay: () => void = () => {};
  let redraw: () => void = () => {};
  let spokenLast = (): string => text().pick;
  let clock = 0;
  let backdrop: Run | null = null;
  let greeted = false;
  const losses = new Map<string, number>();

  function setScreen(name: string): void {
    document.body.dataset.screen = name;
    levels.hidden = name !== 'play';
    change.hidden = name !== 'map';
  }

  function saveProgress(next: Progress): void {
    progress = next;
    store.set(PROGRESS_KEY, progress);
  }

  function clearScreen(): void {
    closeOverlay();
    closeOverlay = () => {};
    redraw = () => {};
    play?.stop();
    play = null;
    backdrop = null;
    controls.release();
    headingFor = null;
  }

  /** Behind the menus, the base hums along by itself. */
  function showBackdrop(id: number): void {
    const level = buildLevel(LEVELS[id - 1] ?? (LEVELS[0] as (typeof LEVELS)[number]), id, 'easy');
    view.setLevel(level, character);
    backdrop = newRun(level);
    view.restart(backdrop);
  }

  function pickCharacter(): void {
    clearScreen();
    setScreen('pick');
    showBackdrop(5);
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showCharacters(overlay, pictures, (id) => {
        character = id;
        store.set(CHARACTER_KEY, id);
        pickLevel();
      });
    };
    draw();
    redraw = draw;
    spokenLast = () => text().pick;
    labelPage();
    // Browsers keep sound blocked until the first tap, so the very first prompt waits for it.
    if (greeted) speak(text().pick);
  }

  function pickLevel(): void {
    clearScreen();
    setScreen('map');
    showBackdrop(9);
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showMap(overlay, {
        progress,
        setting,
        onSetting(next) {
          setting = next;
          store.set(SETTING_KEY, next);
          draw();
        },
        onLevel: startLevel,
      });
    };
    draw();
    redraw = draw;
    spokenLast = () => text().pickLevel;
    headingFor = () => `★ ${totalStars(progress, setting)}`;
    labelPage();
    void say(text().pickLevel, { queue: true });
  }

  function levelWithHelp(id: number): Level {
    const plain = buildLevel(LEVELS[id - 1] ?? (LEVELS[0] as (typeof LEVELS)[number]), id, setting);
    return withHelp(plain, helpFor(losses.get(`${setting}:${id}`) ?? 0));
  }

  function startLevel(id: number): void {
    clearScreen();
    setScreen('play');
    const level = levelWithHelp(id);
    const key = `${setting}:${id}`;
    view.setLevel(level, character);
    play = startPlay({
      host: overlay,
      view,
      controls,
      level,
      calm,
      levelNow: () => {
        const next = levelWithHelp(id);
        return play?.run().level.help === next.help ? play.run().level : next;
      },
      rebuild: (next) => view.setLevel(next, character),
      onLoss: () => losses.set(key, (losses.get(key) ?? 0) + 1),
      onWin(stars) {
        losses.delete(key);
        saveProgress(addWin(progress, setting, id, stars));
      },
      onTreasure() {
        const isNew = !progress.treasures.includes(id);
        saveProgress(addTreasure(progress, id));
        return isNew;
      },
      onNext() {
        if (id >= LEVELS.length) pickLevel();
        else startLevel(id + 1);
      },
    });
    redraw = () => play?.redraw();
    spokenLast = () => play?.line() ?? text().pickLevel;
    headingFor = () => text().level(id);
    labelPage();
  }

  stage.onFrame((seconds) => {
    clock += seconds;
    if (play) {
      play.frame(seconds, clock);
      return;
    }
    if (!backdrop) return;
    stepRun(backdrop, null, seconds);
    backdrop.events.length = 0;
    if (backdrop.phase !== 'play') backdrop = newRun(backdrop.level);
    view.update(backdrop, clock, seconds, calm());
  });

  levels.addEventListener('click', pickLevel);
  change.addEventListener('click', pickCharacter);
  repeat.addEventListener('click', () => speak(spokenLast()));
  onLanguageChange(() => {
    labelPage();
    redraw();
  });

  function greet(event: Event): void {
    if (greeted) return;
    greeted = true;
    const onCard = event.target instanceof Element && event.target.closest('.hero-card');
    if (document.body.dataset.screen === 'pick' && !onCard) speak(text().pick);
  }

  stage.start();
  pickCharacter();
  for (const type of ['touchend', 'click'] as const) document.addEventListener(type, greet, { capture: true });

  if (import.meta.env.DEV || import.meta.env.MODE === 'replay') {
    Object.assign(window, {
      mazeEscape: {
        stage,
        view,
        run: () => play?.run() ?? null,
        progress: () => progress,
        next: () => nextLevel(progress, setting),
        start: startLevel,
        losses,
        trail: () => (play ? (trailTiles(play.run(), 1)[0] ?? null) : null),
      },
    });
  }
}

labelPage();
const stage = createStage(maze, CAMERA);
if (stage) {
  const view = createView(stage);
  const controls = bindControls(stage.canvas);
  runGame({ stage, view, controls });
  window.addEventListener('pagehide', () => {
    stopSounds();
    stopSpeaking();
    controls.dispose();
    stage.dispose();
  });
} else {
  showNo3d();
}
