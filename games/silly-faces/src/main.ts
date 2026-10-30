import '@playroom/kit/kit.css';
import './style.css';
import { canSpeak, getLanguage, homeButton, languageButton, onLanguageChange, speak, store, useClips } from '@playroom/kit';
import { createActor } from './actor.ts';
import { COLOR_SPECS, creatureSvg, POINTS } from './art.ts';
import { createDresser } from './dresser.ts';
import { confetti, puff, spray } from './fx.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { cleanLook, pick, randomLook, type Color, type Look, type Part } from './parts.ts';
import { perform, type Scene } from './performer.ts';
import { newMood, nextReaction } from './reactions.ts';
import { blip, boing, playNotes, sound } from './sounds.ts';
import { byId, calm, onTap, type TapPoint } from './tap.ts';
import { SOUNDS, tune, TUNE_COUNT, tuneLength, whirlTick } from './tunes.ts';
import { cleanWall, hang } from './wall.ts';
import { createWallView } from './wallView.ts';
import { whirlFrames } from './whirl.ts';

const LOOK_KEY = 'silly-faces:look';
const WALL_KEY = 'silly-faces:friends';

/** Fun games talk little: a spoken line is never closer than this to the last one. */
const QUIET_MS = 1500;
const CHAT_EVERY_PICKS = 4;
const WHIRL_STEP_MS = 75;
const DANCE_MOVES = 3;
const CONFETTI_EVERY_MS = 1500;

useClips(clips);

const app = byId('app');
const floor = byId('floor');
const hint = byId('hint');
const wallPanel = byId('wall');
const count = byId('count');

let look: Look = cleanLook(store.get<unknown>(LOOK_KEY, null), randomLook());
const friends: Look[] = cleanWall(store.get<unknown>(WALL_KEY, []));
const mood = newMood();
const actor = createActor(byId('actor'), look);

let picks = 0;
let lastChat = -QUIET_MS;
let danceNumber = 0;
let stopShow: (() => void) | null = null;
let finishWhirl: (() => void) | null = null;
let greeted = false;

function chat(line: string): void {
  const now = performance.now();
  // Nothing before hello: the greeting comes at the end of the first tap and would cut this off.
  if (!greeted || now - lastChat < QUIET_MS) return;
  lastChat = now;
  speak(line);
}

function say(line: string): void {
  lastChat = performance.now();
  speak(line);
}

function paintBackdrop(): void {
  app.style.setProperty('--backdrop', COLOR_SPECS[look.color].backdrop);
}

/** Puts a look on the creature, the tabs and the saved game. */
function wear(next: Look): void {
  look = next;
  actor.draw(look);
  paintBackdrop();
  dresser.refresh();
  store.set(LOOK_KEY, look);
}

const dresser = createDresser(byId('tabs'), byId('tray'), {
  look: () => look,
  onTab: () => {
    sound('pop');
    actor.poke();
  },
  onPick,
});

const scene: Scene = {
  actor,
  floor,
  look: () => look,
  recolor: (color: Color) => wear({ ...look, color }),
};

function hearts(): void {
  const { x, y } = actor.screen(POINTS.eyes(look).x, POINTS.eyes(look).y);
  spray('💖', x, y, 3, 150);
}

function delight(): void {
  hearts();
  if (!stopShow) actor.act('delight', 700);
}

function onPick(part: Part, id: string): void {
  finishWhirl?.();
  boing();
  wear({ ...look, [part]: id });
  delight();
  picks += 1;
  if (picks % CHAT_EVERY_PICKS === 0) chat(pick(text().delighted));
}

function tapCreature(point: TapPoint): void {
  actor.glance(point);
  puff('💕', point.x, point.y, { size: 34, ms: 700 });
  if (actor.current() && actor.current() !== 'delight') {
    actor.poke();
    blip();
    return;
  }
  const reaction = nextReaction(mood);
  perform(reaction, scene);
  chat(text().reactions[reaction]);
}

function bump(button: HTMLElement): void {
  if (!calm()) button.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200 });
}

function shuffle(button: HTMLElement): void {
  bump(button);
  if (finishWhirl) {
    blip();
    return;
  }
  const final = randomLook();
  if (stopShow) {
    boing();
    wear(final);
    hearts();
    return;
  }

  const frames = whirlFrames(final);
  let frame = 0;
  actor.act('whirl', frames.length * WHIRL_STEP_MS + 200);
  button.dataset.spinning = 'yes';
  const wheel = setInterval(() => {
    const showing = frames[frame];
    if (!showing) {
      finishWhirl?.();
      return;
    }
    actor.draw(showing);
    playNotes([whirlTick(frame)]);
    frame += 1;
  }, WHIRL_STEP_MS);

  finishWhirl = () => {
    clearInterval(wheel);
    finishWhirl = null;
    delete button.dataset.spinning;
    wear(final);
    boing();
    sound('ding');
    delight();
    chat(text().shuffled);
  };
}

/** The music, the moves and the paper, stopped all at once. */
function runShow(friendCount: number, setDancing: (move: number, length: number) => void, clearDancing: () => void): void {
  const number = danceNumber;
  danceNumber += 1;
  const length = tuneLength(number % TUNE_COUNT);
  const stopNotes = playNotes(tune(number, friendCount));
  const end = setTimeout(() => {
    stopShow?.();
    sound('tada');
  }, length);
  const paper = setInterval(() => confetti(), CONFETTI_EVERY_MS);
  confetti();
  setDancing(number % DANCE_MOVES, length);
  stopShow = () => {
    stopShow = null;
    stopNotes();
    clearTimeout(end);
    clearInterval(paper);
    clearDancing();
  };
}

function dance(button: HTMLElement): void {
  bump(button);
  if (stopShow) {
    blip();
    return;
  }
  finishWhirl?.();
  say(text().dance);
  const host = byId('actor');
  runShow(
    friends.length,
    (move, length) => {
      host.dataset.move = String(move);
      actor.act('dance', length + 500);
    },
    () => actor.act('delight', 700),
  );
}

function danceWithFriends(button: HTMLElement): void {
  bump(button);
  if (stopShow) {
    blip();
    return;
  }
  if (friends.length === 0) {
    say(text().takePicture);
    return;
  }
  say(text().danceAll);
  runShow(
    friends.length,
    (move) => wallView.dance(move),
    () => wallView.stopDancing(),
  );
}

function flyToWall(button: HTMLElement): void {
  if (calm()) return;
  const from = actor.svg().getBoundingClientRect();
  const to = button.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'flyer';
  flyer.innerHTML = creatureSvg(look);
  flyer.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
  document.body.append(flyer);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const fly = flyer.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.12) rotate(14deg)`, opacity: 0.8 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)', fill: 'forwards' },
  );
  void fly.finished.finally(() => {
    flyer.remove();
    bump(button);
  });
}

function showCount(): void {
  count.textContent = String(friends.length);
  count.hidden = friends.length === 0;
}

function takePicture(button: HTMLElement): void {
  bump(button);
  finishWhirl?.();
  playNotes(SOUNDS.camera);
  const flash = document.createElement('div');
  flash.className = 'flash';
  document.body.append(flash);
  setTimeout(() => flash.remove(), 300);

  const wallButton = byId('wall-open');
  if (hang(friends, look) === 'known') {
    chat(text().known);
    bump(wallButton);
    return;
  }
  store.set(WALL_KEY, friends);
  showCount();
  flyToWall(wallButton);
  if (!stopShow) actor.act('pose', 500);
  chat(text().saved);
}

function closeWall(): void {
  stopShow?.();
  wallPanel.hidden = true;
}

const wallView = createWallView(byId('wall-grid'), {
  friends: () => friends,
  onFriend(friend) {
    closeWall();
    finishWhirl?.();
    boing();
    wear({ ...friend });
    delight();
    say(text().back);
  },
  onEmpty() {
    sound('pop');
    chat(text().takePicture);
  },
});

function openWall(button: HTMLElement): void {
  bump(button);
  stopShow?.();
  finishWhirl?.();
  sound('pop');
  wallView.draw();
  wallPanel.hidden = false;
  if (friends.length === 0) chat(text().takePicture);
}

function label(id: string, words: string): void {
  byId(id).setAttribute('aria-label', words);
}

function showWords(): void {
  const { title, description, ui } = text();
  document.title = title;
  document.documentElement.lang = getLanguage();
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  byId('title').textContent = title;
  byId('again').hidden = !canSpeak();
  byId('wall-title').textContent = ui.wallTitle;
  label('actor', ui.creature);
  label('again', ui.again);
  label('dice', ui.dice);
  label('dance', ui.dance);
  label('camera', ui.camera);
  label('wall-open', ui.wall);
  label('wall-close', ui.close);
  label('wall-dance', ui.danceAll);
  document.querySelector('.home-btn')?.setAttribute('aria-label', ui.home);
}

function redrawWords(): void {
  showWords();
  dresser.redraw();
  if (!wallPanel.hidden) wallView.draw();
}

/** The first tap in the game is when sound becomes possible, so that is when it says hello. */
function greetOnFirstTap(): void {
  const play = byId('play');

  const dropHint = (): void => hint.remove();
  play.addEventListener('pointerdown', dropHint, { once: true });

  const greet = (): void => {
    if (greeted) return;
    greeted = true;
    say(text().intro);
  };
  // These are the events iOS counts as a tap. A pointerdown isn't one, so the first line would be lost.
  play.addEventListener('touchend', greet, { once: true });
  play.addEventListener('click', greet, { once: true });
}

function start(): void {
  const topbar = byId('topbar');
  topbar.prepend(homeButton());
  topbar.append(languageButton(['en', 'sl']));
  onTap(byId('again'), () => {
    greeted = true;
    say(text().intro);
  });

  onTap(byId('actor'), tapCreature);
  onTap(byId('dice'), () => shuffle(byId('dice')));
  onTap(byId('dance'), () => dance(byId('dance')));
  onTap(byId('camera'), () => takePicture(byId('camera')));
  onTap(byId('wall-open'), () => openWall(byId('wall-open')));
  onTap(byId('wall-close'), () => {
    sound('pop');
    closeWall();
  });
  onTap(byId('wall-dance'), () => danceWithFriends(byId('wall-dance')));

  // A long press on a phone would otherwise open a menu.
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  // The eyes follow every tap on the page, not only taps on the creature.
  byId('play').addEventListener('pointerdown', (event) => actor.glance({ x: event.clientX, y: event.clientY }));

  onLanguageChange(redrawWords);
  showWords();
  showCount();
  paintBackdrop();
  greetOnFirstTap();
}

start();
