import '@playroom/kit/kit.css';
import './style.css';
import { getLanguage, homeButton, languageButton, onLanguageChange, playSound, speak, useClips } from '@playroom/kit';
import { SMALL_CHEST } from './art.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { makePatch, rollSurprise } from './patch.ts';
import { buildPicker, type Picker } from './picker.ts';
import { startPlay, type Play } from './play.ts';
import { PLACES, type Place } from './places.ts';
import { buildRoom, type Room } from './room.ts';
import { loadSave, saveGame, type Size } from './save.ts';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

useClips(clips);

const save = loadSave();
const app = byId('app');
const bar = byId('topbar');

const home = homeButton();
const title = document.createElement('h1');
title.className = 'title';
const sound = barButton('🔊', 'sound-btn');
const chest = barButton(SMALL_CHEST, 'chest-btn');
const dig = barButton('⛏️', 'dig-btn');
dig.hidden = true;
bar.append(home, title, sound, chest, dig, languageButton(['en', 'sl']));

function barButton(html: string, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `bar-btn ${className}`;
  button.innerHTML = html;
  return button;
}

let picker: Picker | null = null;
let play: Play | null = null;
let room: Room | null = null;

function usePlace(place: Place | null): void {
  const style = document.body.style;
  if (!place) {
    style.removeProperty('--sky-a');
    document.body.classList.remove('in-place');
    return;
  }
  document.body.classList.add('in-place');
  document.body.dataset.place = place.id;
  style.setProperty('--sky-a', place.sky[0]);
  style.setProperty('--sky-b', place.sky[1]);
  style.setProperty('--ground-1', place.ground[0]);
  style.setProperty('--ground-2', place.ground[1]);
  style.setProperty('--ground-3', place.ground[2]);
  style.setProperty('--hole', place.hole);
}

function closeRoom(): void {
  room?.element.remove();
  room = null;
  chest.hidden = false;
  dig.hidden = true;
  if (picker) picker.element.hidden = false;
  if (play) {
    play.element.hidden = false;
    usePlace(PLACES.find((place) => place.id === document.body.dataset.place) ?? null);
  }
}

function openRoom(): void {
  if (room) return;
  room = buildRoom(save);
  if (picker) picker.element.hidden = true;
  if (play) play.element.hidden = true;
  usePlace(null);
  app.append(room.element);
  chest.hidden = true;
  dig.hidden = false;
  playSound('whoosh');
  speak(text().roomOpen);
}

function startPatch(size: Size): void {
  save.size = size;
  saveGame(save);
  picker?.element.remove();
  picker = null;
  play?.stop();
  play?.element.remove();

  const place = PLACES[save.place] as Place;
  usePlace(place);
  const patch = makePatch({ save, size, surprise: rollSurprise(save, Math.random) });
  play = startPlay({
    save,
    patch,
    onNext: (next) => {
      playSound('pop');
      startPatch(next);
    },
    onFound: () => bump(chest),
  });
  app.append(play.element);
}

function bump(button: HTMLElement): void {
  button.classList.remove('bump');
  void button.offsetWidth;
  button.classList.add('bump');
}

function labelPage(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  title.textContent = words.title;
  home.setAttribute('aria-label', words.homeLabel);
  sound.setAttribute('aria-label', words.soundLabel);
  chest.setAttribute('aria-label', words.roomLabel);
  dig.setAttribute('aria-label', words.backLabel);
  picker?.relabel();
  play?.relabel();
  room?.relabel();
}

sound.addEventListener('click', () => {
  playSound('pop');
  if (room) speak(text().roomOpen);
  else if (play) play.sayAgain();
  else speak(text().pick);
});
chest.addEventListener('click', openRoom);
dig.addEventListener('click', () => {
  playSound('pop');
  closeRoom();
});

picker = buildPicker(save.size, (size) => {
  playSound('pop');
  startPatch(size);
});
app.append(picker.element);
labelPage();
onLanguageChange(labelPage);
speak(text().pick);
