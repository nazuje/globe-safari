import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, stopSpeaking, store, useClips } from '@playroom/kit';
import { createStage, type Stage } from '@playroom/stage3d';
import type { Kind } from './dangers.ts';
import { bindControls, type Controls } from './input.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { newSeed, startPlay, type PlayScreen } from './play.ts';
import { addBest, addFail, addFinish, addSkip, canSkip, cleanProgress, type Progress } from './progress.ts';
import { newRun, starsOf, stepRun, STANDING, type Run } from './run.ts';
import { showHome, showResult, showStages } from './screens.ts';
import { STAGES } from './stages.ts';
import { button, element } from './ui.ts';
import { createView, type View } from './view.ts';

const PROGRESS_KEY = 'dodge-arena:progress';
const CAMERA = { fov: 38, near: 1, far: 260 };

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

const calm = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

useClips(clips);

const bar = byId('topbar');
const arena = byId('arena');
const hudHost = byId('hud');
const overlay = byId('overlay');
const readout = byId('readout');
const home = homeButton();
const menu = button('bar-btn');
menu.textContent = '☰';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, menu, language, repeat);

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  home.setAttribute('aria-label', text().home);
  menu.setAttribute('aria-label', text().menu);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function showNo3d(): void {
  const note = element('p', 'no-3d');
  note.textContent = text().no3d;
  overlay.replaceChildren(note);
  repeat.hidden = true;
  menu.hidden = true;
  document.body.dataset.screen = 'no-3d';
}

interface Game {
  stage: Stage;
  view: View;
  controls: Controls;
}

function runGame({ stage, view, controls }: Game): void {
  let progress: Progress = cleanProgress(store.get<unknown>(PROGRESS_KEY, null));
  let play: PlayScreen | null = null;
  let backdrop: Run | null = null;
  let closeOverlay: () => void = () => {};
  let redraw: () => void = () => {};
  let spokenLast = (): string => text().greet;
  let clock = 0;
  let greeted = false;
  const taught = new Set<Kind>();

  function setScreen(name: string): void {
    document.body.dataset.screen = name;
    readout.dataset.screen = name;
    menu.hidden = name === 'home';
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
  }

  function startBackdrop(): void {
    backdrop = newRun('demo', STAGES[7] ?? null, newSeed());
  }

  function goHome(): void {
    clearScreen();
    setScreen('home');
    startBackdrop();
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showHome(overlay, { progress, onEndless: () => startRun('endless', null), onChallenge: goStages });
    };
    draw();
    redraw = draw;
    spokenLast = () => text().greet;
    if (greeted) speak(text().greet);
  }

  function goStages(): void {
    clearScreen();
    setScreen('stages');
    startBackdrop();
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showStages(overlay, progress, (id) => startRun('stage', id));
    };
    draw();
    redraw = draw;
    spokenLast = () => text().pickStage;
    speak(text().pickStage);
  }

  function resultLine(ended: Run, isBest: boolean): string {
    if (ended.phase === 'won') return starsOf(ended) === 3 ? text().allStars : text().stageDone;
    if (isBest) return text().newBest;
    return ended.mode === 'endless' ? text().greatRun : text().almost;
  }

  function showEnd(ended: Run, id: number | null): void {
    const before = progress.best;
    if (ended.mode === 'endless') saveProgress(addBest(progress, ended.clock));
    else if (id !== null) saveProgress(ended.phase === 'won' ? addFinish(progress, id, starsOf(ended)) : addFail(progress, id));
    const isBest = ended.mode === 'endless' && ended.clock > before && before > 0;
    const line = resultLine(ended, isBest);
    setScreen('result');
    const draw = (): void => {
      closeOverlay();
      closeOverlay = showResult(overlay, {
        seconds: ended.clock,
        stars: ended.mode === 'stage' ? starsOf(ended) : null,
        best: ended.mode === 'endless' ? progress.best : null,
        isBest,
        heading: resultLine(ended, isBest),
        goal: ended.stage && ended.phase === 'lost' ? ended.stage.goal : null,
        canNext: ended.phase === 'won' && id !== null && id < STAGES.length,
        canSkip: id !== null && canSkip(progress, id) && id < STAGES.length,
        onRetry: () => startRun(ended.mode === 'stage' ? 'stage' : 'endless', id),
        onNext: () => startRun('stage', (id ?? 0) + 1),
        onSkip() {
          if (id === null) return;
          saveProgress(addSkip(progress, id));
          startRun('stage', id + 1);
        },
        calm: calm(),
      });
    };
    draw();
    redraw = draw;
    spokenLast = () => resultLine(ended, isBest);
    speak(line);
  }

  function startRun(mode: 'endless' | 'stage', id: number | null): void {
    clearScreen();
    setScreen('play');
    const chosen = id === null ? null : (STAGES[id - 1] ?? null);
    play = startPlay({ mode, stage: chosen, hudHost, readout, view, controls, calm, taught, onEnd: (ended) => showEnd(ended, id) });
    redraw = () => play?.label();
    spokenLast = () => play?.line() ?? text().greet;
    if (!taught.size) speak(text().howTo);
  }

  stage.onFrame((seconds) => {
    clock += seconds;
    if (play) {
      play.frame(seconds, clock);
      return;
    }
    if (!backdrop) return;
    stepRun(backdrop, STANDING, seconds);
    backdrop.events.length = 0;
    if (backdrop.phase !== 'play') startBackdrop();
    if (backdrop) view.update(backdrop, clock, seconds, calm());
  });

  menu.addEventListener('click', goHome);
  repeat.addEventListener('click', () => speak(spokenLast()));
  onLanguageChange(() => {
    labelPage();
    redraw();
  });

  function greet(): void {
    if (greeted) return;
    greeted = true;
    if (document.body.dataset.screen === 'home') speak(text().greet);
  }

  stage.start();
  goHome();
  for (const type of ['touchend', 'click'] as const) document.addEventListener(type, greet, { capture: true });
}

labelPage();
const stage = createStage(arena, CAMERA);
if (stage) {
  const view = createView(stage);
  const controls = bindControls(stage.canvas);
  runGame({ stage, view, controls });
  window.addEventListener('pagehide', () => {
    stopSpeaking();
    controls.dispose();
    stage.dispose();
  });
} else {
  showNo3d();
}
