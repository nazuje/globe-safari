import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { createStage, type Stage } from '@playroom/stage3d';
import { flyerPicture } from './art/picture.ts';
import { buildCourse, LEVEL_IDS, LEVELS, type Course, type LevelId } from './course.ts';
import { flightStars, newFlight, stepFlight, type Flight } from './flight.ts';
import { FLYER_IDS, type FlyerId } from './flyers.ts';
import { bindSteering, type Steering } from './input.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { showPicker } from './picker.ts';
import { startFlight, type PlayScreen } from './play.ts';
import { addLanding, cleanProgress, trailFor, type LandingNews, type Progress } from './progress.ts';
import { showResult } from './result.ts';
import { stopSounds } from './sounds.ts';
import { button, element } from './ui.ts';
import { createView, type View } from './view.ts';
import { WORLD_IDS, WORLDS, type WorldId } from './worlds.ts';

const PROGRESS_KEY = 'cloud-flyer:progress';
const WORLD_KEY = 'cloud-flyer:world';
const LEVEL_KEY = 'cloud-flyer:level';
/** The sky drifts by slowly behind the picker. */
const MENU_PACE = 0.5;
const CAMERA = { fov: 58, near: 0.5, far: 760 };

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
const sky = byId('sky');
const overlay = byId('overlay');
const heading = element('h1', 'title');
const home = homeButton();
const change = button('bar-btn change-btn');
change.textContent = '✈️';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, change, repeat, language);

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  change.setAttribute('aria-label', text().changeFlyer);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function showNo3d(): void {
  const note = element('p', 'no-3d');
  note.textContent = text().no3d;
  overlay.replaceChildren(note);
  repeat.hidden = true;
  change.hidden = true;
  document.body.dataset.screen = 'no-3d';
}

interface Game {
  stage: Stage;
  view: View;
  steering: Steering;
}

function runGame({ stage, view, steering }: Game): void {
  const pictures: Partial<Record<FlyerId, string>> = {};
  for (const id of FLYER_IDS) pictures[id] = flyerPicture(stage.renderer, id) ?? undefined;

  let world: WorldId = saved(WORLD_KEY, WORLD_IDS, 'sunny');
  let level: LevelId = saved(LEVEL_KEY, LEVEL_IDS, 'easy');
  let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  let flyer: FlyerId = 'plane';
  let play: PlayScreen | null = null;
  let menuFlight: Flight | null = null;
  let closeOverlay: () => void = () => {};
  let redraw: () => void = () => {};
  let spokenLast = (): string => text().pick;
  let clock = 0;
  let seed = Date.now() % 100000;

  function setScreen(name: string): void {
    document.body.dataset.screen = name;
    document.documentElement.style.setProperty('--bar', WORLDS[world].bar);
  }

  function nextCourse(): Course {
    seed += 1;
    return buildCourse(LEVELS[level], seed, progress.flightsSinceSurprise);
  }

  function clearScreen(): void {
    closeOverlay();
    closeOverlay = () => {};
    redraw = () => {};
    play?.stop();
    play = null;
    menuFlight = null;
  }

  function driftMenu(): void {
    const course = nextCourse();
    view.setScene(WORLDS[world], course, calm());
    view.setFlyer(null, 0);
    menuFlight = newFlight(course);
  }

  function drawPicker(): void {
    closeOverlay();
    closeOverlay = showPicker(overlay, {
      pictures,
      world,
      level,
      stars: progress.stars,
      found: progress.found,
      onWorld(id) {
        world = id;
        store.set(WORLD_KEY, id);
        setScreen('pick');
        driftMenu();
      },
      onLevel(id) {
        level = id;
        store.set(LEVEL_KEY, id);
      },
      onFlyer: fly,
    });
  }

  function pick(): void {
    clearScreen();
    setScreen('pick');
    driftMenu();
    drawPicker();
    redraw = drawPicker;
    spokenLast = () => text().pick;
    speak(text().pick);
  }

  function landed(flight: Flight): void {
    const stars = flightStars(flight.ownRings, flight.course.rings.length, level);
    const news: LandingNews = addLanding(progress, {
      stars,
      score: flight.score,
      levelId: level,
      surprises: flight.course.surprises.map((surprise) => surprise.kind),
    });
    progress = news.progress;
    store.set(PROGRESS_KEY, progress);
    setScreen('result');
    const drawResult = (): void => {
      closeOverlay();
      closeOverlay = showResult(overlay, {
        flight,
        stars,
        news,
        flyer,
        best: progress.best[level],
        onAgain: () => fly(flyer),
      });
    };
    drawResult();
    redraw = drawResult;
    spokenLast = () => [text().stars1, text().stars2, text().stars3][stars - 1] ?? text().stars1;
  }

  function fly(chosen: FlyerId): void {
    clearScreen();
    flyer = chosen;
    setScreen('fly');
    const course = nextCourse();
    view.setScene(WORLDS[world], course, calm());
    view.setFlyer(chosen, trailFor(progress.stars));
    play = startFlight({ host: overlay, view, steering, course, onLanded: landed });
    spokenLast = () => text().steer;
  }

  stage.onFrame((seconds) => {
    clock += seconds;
    if (play) {
      play.frame(seconds, clock);
      return;
    }
    if (!menuFlight) return;
    stepFlight(menuFlight, null, seconds * MENU_PACE);
    view.update(menuFlight, clock, seconds);
    if (menuFlight.phase === 'landed') driftMenu();
  });

  change.addEventListener('click', pick);
  repeat.addEventListener('click', () => speak(spokenLast()));
  onLanguageChange(() => {
    labelPage();
    redraw();
  });

  stage.start();
  pick();

  if (import.meta.env.DEV) {
    Object.assign(window, {
      cloudFlyer: {
        stage,
        flight: () => play?.flight ?? null,
        seed(next: number) {
          seed = next;
        },
        warp(seconds: number) {
          for (let left = seconds; left > 0 && play; left -= 1 / 30) play.frame(1 / 30, (clock += 1 / 30));
        },
      },
    });
  }
}

labelPage();
const stage = createStage(sky, CAMERA);
if (stage) {
  const view = createView(stage);
  const steering = bindSteering(stage.canvas, () => view.span());
  runGame({ stage, view, steering });
  window.addEventListener('pagehide', () => {
    stopSounds();
    stopSpeaking();
    steering.dispose();
    stage.dispose();
  });
} else {
  showNo3d();
}
