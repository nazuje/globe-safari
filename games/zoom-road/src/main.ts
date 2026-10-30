import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, store, useClips } from '@playroom/kit';
import { SPEED_IDS, type SpeedId } from './course.ts';
import { cleanStars } from './garage.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { showPicker } from './picker.ts';
import { startRace, type RaceScreen } from './play.ts';
import type { Ride } from './rides.ts';
import { sceneForRace } from './scenery.ts';
import { element } from './ui.ts';

const STARS_KEY = 'zoom-road:stars';
const SPEED_KEY = 'zoom-road:speed';
const RACES_KEY = 'zoom-road:races';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

function savedSpeed(): SpeedId {
  const saved = store.get<unknown>(SPEED_KEY, 'slow');
  return SPEED_IDS.find((speed) => speed === saved) ?? 'slow';
}

useClips(clips);

const bar = byId('topbar');
const app = byId('app');
const heading = element('h1', 'title');
const home = homeButton();
const change = element('button', 'bar-btn change-btn');
change.type = 'button';
change.textContent = '🚗';
const repeat = element('button', 'bar-btn');
repeat.type = 'button';
repeat.textContent = '🔊';
repeat.hidden = !canSpeak();
const language = languageButton(['en', 'sl']);
language.classList.add('topbar-end');
bar.append(home, heading, change, repeat, language);

let race: RaceScreen | null = null;
let closePicker: () => void = () => {};
let ride: Ride | null = null;

function labelPage(): void {
  document.documentElement.lang = getLanguage();
  document.title = text().title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', text().description);
  heading.textContent = text().title;
  home.setAttribute('aria-label', text().home);
  change.setAttribute('aria-label', text().changeRide);
  repeat.setAttribute('aria-label', text().sayAgain);
}

function leaveScreen(): void {
  closePicker();
  closePicker = () => {};
  race?.stop();
  race = null;
}

function openPicker(): void {
  closePicker();
  closePicker = showPicker(app, {
    stars: cleanStars(store.get<unknown>(STARS_KEY, 0)),
    speed: savedSpeed(),
    onSpeed: (speed) => store.set(SPEED_KEY, speed),
    onRide: go,
  });
}

function pick(): void {
  leaveScreen();
  openPicker();
  speak(text().pick);
}

function go(chosen: Ride): void {
  leaveScreen();
  ride = chosen;
  const raceNumber = cleanStars(store.get<unknown>(RACES_KEY, 0));
  store.set(RACES_KEY, raceNumber + 1);
  const stars = cleanStars(store.get<unknown>(STARS_KEY, 0));
  race = startRace(app, {
    ride: chosen,
    speed: savedSpeed(),
    scene: sceneForRace(raceNumber),
    stars,
    onStars: (earned) => store.set(STARS_KEY, stars + earned),
    onAgain: () => {
      if (ride) go(ride);
    },
    onPick: pick,
  });
}

change.addEventListener('click', pick);
repeat.addEventListener('click', () => speak(race ? race.line() : text().pick));

onLanguageChange(() => {
  labelPage();
  if (race) race.redraw();
  else openPicker();
});

labelPage();
pick();
