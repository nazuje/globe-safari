import '@playroom/kit/kit.css';
import './style.css';
import {
  burst,
  canSpeak,
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  playSound,
  say,
  speak,
  store,
  useClips,
} from '@playroom/kit';
import { restoreCollection } from './collection.ts';
import { drawWorld } from './draw.ts';
import { FRIENDS, type FriendId } from './friends.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { createFrameWatch, createVoicePace } from './party.ts';
import {
  giantSound,
  goldenSound,
  landedSound,
  miniPopSound,
  missSound,
  popSound,
  rainSound,
  sneezeSound,
  tootSound,
  windupSound,
} from './sounds.ts';
import { Sprites } from './sprites.ts';
import { World, type GameEvent } from './world.ts';

const SAVE_KEY = 'pop-party:shelf';
const TOAST_MS = 1800;
const MAX_FRAME_S = 0.05;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const canvas = byId<HTMLCanvasElement>('play');
const stage = byId('stage');
const toast = byId('toast');
const sayButton = byId('say');
const home = homeButton();
byId('topbar').prepend(home);
sayButton.after(languageButton(['en', 'sl']));

const context = canvas.getContext('2d');
if (!context) throw new Error('No 2D canvas');
const ctx = context;

useClips(clips);

const calmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const voicePace = createVoicePace();
const frameWatch = createFrameWatch();
const sprites = new Sprites();

let dpr = Math.min(2, window.devicePixelRatio || 1);
let stageLeft = 0;
let stageTop = 0;
/** What the toast shows, kept so a language switch can redraw it. */
let shownFriend: FriendId | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const world = new World({
  collection: restoreCollection(store.get<unknown>(SAVE_KEY, null)),
  emit: react,
  calm: calmQuery.matches,
});

calmQuery.addEventListener('change', () => {
  world.calm = calmQuery.matches;
});

function save(): void {
  store.set(SAVE_KEY, world.collection);
}

/** A friend's name goes first in line and never cuts off the one before. */
function announce(line: string): void {
  if (canSpeak()) void say(line, { queue: true });
}

function cheer(): void {
  if (!canSpeak() || !voicePace.mayCheer(performance.now())) return;
  const { cheers } = text();
  speak(cheers[Math.floor(Math.random() * cheers.length)]!);
}

function showToast(): void {
  if (shownFriend) toast.textContent = text().friends[shownFriend];
  toast.classList.toggle('show', shownFriend !== null);
}

function meetFriend(friend: FriendId): void {
  voicePace.nameSpoken(performance.now());
  announce(text().friends[friend]);
  shownFriend = friend;
  showToast();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    shownFriend = null;
    showToast();
  }, TOAST_MS);
  labelPage();
}

function react(event: GameEvent): void {
  switch (event.type) {
    case 'pop':
      popSound(event.step);
      break;
    case 'mini-pop':
      miniPopSound();
      break;
    case 'miss':
      missSound();
      break;
    case 'giant-hit':
      giantSound(event.taps);
      break;
    case 'shower':
      playSound('whoosh');
      break;
    case 'sneeze-start':
      windupSound();
      break;
    case 'sneeze':
      sneezeSound();
      announce(text().sneeze);
      announce(text().blessYou);
      break;
    case 'toot-start':
      tootSound();
      announce(text().oops);
      break;
    case 'toot':
      tootSound();
      break;
    case 'rain':
      rainSound();
      announce(text().rain);
      break;
    case 'golden':
      goldenSound();
      burst(event.x + stageLeft, event.y + stageTop, 24);
      break;
    case 'new-friend':
      meetFriend(event.friend);
      break;
    case 'landed':
      landedSound();
      break;
    case 'party':
      playSound('tada');
      burst(event.x + stageLeft, event.y + stageTop, 28);
      cheer();
      break;
    case 'everyone':
      playSound('tada');
      burst(event.x + stageLeft, event.y + stageTop, 32);
      announce(text().everyone);
      break;
    case 'save':
      save();
      break;
  }
}

function labelPage(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  byId('title').textContent = words.title;
  home.setAttribute('aria-label', words.home);
  sayButton.setAttribute('aria-label', words.sayAgain);
  sayButton.title = words.sayAgain;
  canvas.setAttribute('aria-label', words.shelf(world.collection.found.length, FRIENDS.length));
}

function layout(): void {
  const box = stage.getBoundingClientRect();
  stageLeft = box.left;
  stageTop = box.top;
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  world.resize(box.width, box.height);
}

function tap(event: PointerEvent): void {
  event.preventDefault();
  world.tap(event.clientX - stageLeft, event.clientY - stageTop);
}

let lastFrame = performance.now();

function frame(now: number): void {
  const frameMs = now - lastFrame;
  lastFrame = now;
  if (frameWatch(frameMs)) {
    world.slow = true;
    dpr = 1;
    layout();
  }
  world.step(Math.min(MAX_FRAME_S, frameMs / 1000));
  drawWorld(ctx, world, sprites, dpr);
  requestAnimationFrame(frame);
}

stage.addEventListener('pointerdown', tap);
// A resting palm or a long press must never open a menu or select anything.
stage.addEventListener('contextmenu', (event) => event.preventDefault());
sayButton.addEventListener('click', () => {
  if (canSpeak()) speak(text().popThem);
});
new ResizeObserver(layout).observe(stage);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});
onLanguageChange(() => {
  labelPage();
  showToast();
});

labelPage();
layout();
if (canSpeak()) speak(text().popThem);
requestAnimationFrame(frame);

if (import.meta.env.DEV) Object.assign(window, { popWorld: world });
