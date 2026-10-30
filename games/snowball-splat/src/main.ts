import '@playroom/kit/kit.css';
import './style.css';
import {
  canSpeak,
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  stopSpeaking,
  useClips,
} from '@playroom/kit';
import { createStage } from '@playroom/stage3d';
import { startGame } from './game.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { hushSounds } from './sounds.ts';
import { button, element } from './ui.ts';
import { redrawCaption, sayAgain, setCaption } from './voice.ts';

const ARMED_MS = 2500;

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const bar = byId('topbar');
const stageHost = byId('stage');
const overlay = byId('overlay');
const caption = byId('caption');
setCaption(caption);

const heading = element('h1', 'title');
const home = homeButton();
const change = button('bar-btn change-btn');
change.textContent = '🗺️';
const repeat = button('bar-btn');
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, change, repeat, language);

let noStageMessage: HTMLElement | null = null;
let armed = false;
let armedTimer: ReturnType<typeof setTimeout>;

function disarm(): void {
  armed = false;
  clearTimeout(armedTimer);
  change.classList.remove('armed');
}

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  change.setAttribute('aria-label', text().changePlace);
  repeat.setAttribute('aria-label', text().sayAgain);
  stageHost.setAttribute('aria-label', text().gameArea);
  if (noStageMessage) noStageMessage.textContent = text().noStage;
  redrawCaption();
}

const stage = createStage(stageHost, { far: 260 });
if (stage) {
  const game = startGame(stage, stageHost, overlay, labelPage);
  change.addEventListener('click', () => {
    // Leaving mid-round takes two taps, so a child mashing the screen can't lose the round.
    if (armed) {
      disarm();
      game.backToMenu();
      return;
    }
    armed = true;
    change.classList.add('armed');
    armedTimer = setTimeout(disarm, ARMED_MS);
  });
  repeat.addEventListener('click', sayAgain);
  onLanguageChange(() => {
    labelPage();
    game.redraw();
  });
  window.addEventListener('pagehide', () => {
    stopSpeaking();
    hushSounds();
    game.stop();
  });
  // The page is taken apart on the way out, so coming back from the browser's cache needs a fresh start.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) location.reload();
  });
} else {
  document.body.dataset.screen = 'none';
  noStageMessage = element('p', 'no-stage');
  overlay.append(noStageMessage);
  repeat.hidden = true;
  change.hidden = true;
  onLanguageChange(labelPage);
}

labelPage();
