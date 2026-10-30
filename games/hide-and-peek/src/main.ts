import '@playroom/kit/kit.css';
import './style.css';
import {
  burst,
  canSpeak,
  getLanguage,
  homeButton,
  languageButton,
  onLanguageChange,
  say as sayAloud,
  speak,
  store,
  useClips,
} from '@playroom/kit';
import { pickClue, seekParts } from './clues.ts';
import { el } from './dom.ts';
import { newGame, reduce, restoreGame, ROUNDS, sceneOf, seekerOf, spotsInPlay, wiggleSpot } from './game.ts';
import type { Action, Phase, Player } from './game.ts';
import type { FriendId } from './lang/en.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
import { createRoom } from './room.ts';
import type { Room } from './room.ts';
import { friendById, FRIENDS, LEVELS, SCENES, spotById, surpriseFor } from './scenes.ts';
import type { Spot } from './scenes.ts';

const SAVE_KEY = 'hide-and-peek:game';
const FACE: Record<Player, string> = { kid: '🧒', grownup: '🧑' };

/** How long taps are ignored while something plays out, in milliseconds. */
const PAUSE = { screen: 500, hide: 600, open: 800, found: 1500 };

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

const stage = byId('stage');
const actions = byId('actions');
const promptText = byId('prompt-text');
const sayAgain = byId('say-again');
const score = byId('score');
const restart = byId('restart');
const title = byId('title');
const home = homeButton();

useClips(clips);

let state = restoreGame(store.get<unknown>(SAVE_KEY, null));
let room: Room | null = null;
let builtFor = '';
let spokenLine: string[] = [];
let quietUntil = 0;

function isQuiet(): boolean {
  return performance.now() < quietUntil;
}

function pauseTaps(ms: number): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  quietUntil = performance.now() + (reduced ? Math.min(ms, 300) : ms);
}

/** Shows a line and speaks it. Its parts play one after another where the language records them apart. */
function say(parts: string[]): void {
  spokenLine = parts;
  const line = parts.join(' ');
  promptText.textContent = line;
  if (!canSpeak()) return;
  if (text().speakInParts) parts.forEach((part, index) => void sayAloud(part, { queue: index > 0 }));
  else speak(line);
}

function dispatch(action: Action, pause = PAUSE.screen): boolean {
  if (isQuiet()) return false;
  const next = reduce(state, action);
  if (next === state) return false;
  const movedOn = next.phase !== state.phase;
  state = next;
  store.set(SAVE_KEY, state);
  pauseTaps(pause);
  render();
  if (movedOn) announce();
  return true;
}

function friendId(): FriendId {
  return friendById(state.friendId).id;
}

function hidingSpot(): Spot | null {
  return state.hidingSpot ? spotById(sceneOf(state), state.hidingSpot) : null;
}

function lastSeekLine(): string[] {
  const hidden = hidingSpot();
  const last = state.opened.at(-1);
  if (!hidden || !last) return [text().whereIs(friendId())];
  const scene = sceneOf(state);
  const surprise = surpriseFor(scene, last, state.round, text());
  return seekParts(scene, spotsInPlay(state), hidden, state.opened, surprise, text());
}

function foundLine(): string[] {
  const hidden = hidingSpot();
  return hidden ? [text().found(friendId(), hidden.id)] : [];
}

const LINES: Record<Phase, () => string[]> = {
  pickFriend: () => [text().whoHides],
  pickScene: () => [text().wherePlay],
  eyes: () => [text().closeEyes(state.round > 0)],
  hide: () => [state.hidingSpot ? text().hidden : text().hideFriend(friendId())],
  pass: () => [text().pass],
  seek: lastSeekLine,
  found: foundLine,
  end: () => [text().end],
};

function announce(): void {
  say(LINES[state.phase]());
  if (state.phase === 'found' && room && state.hidingSpot) {
    const { x, y } = room.centerOf(state.hidingSpot);
    burst(x, y, 28);
  }
  if (state.phase === 'end') {
    burst(innerWidth / 2, innerHeight * 0.4, 32);
    setTimeout(() => burst(innerWidth * 0.3, innerHeight * 0.5, 24), 500);
    setTimeout(() => burst(innerWidth * 0.7, innerHeight * 0.5, 24), 900);
  }
}

function bigButton(label: string, color: string, action: Action, pause?: number): HTMLElement {
  const wrap = el('div', 'go');
  const button = el('button', `btn big-btn ${color}`, label);
  button.type = 'button';
  button.addEventListener('click', () => dispatch(action, pause));
  wrap.append(button, el('span', 'finger', '👈'));
  return wrap;
}

function card(emoji: string, label: string, className: string, action: Action): HTMLElement {
  const button = el('button', `card ${className}`);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.append(el('span', 'card-emoji', emoji));
  button.addEventListener('click', () => dispatch(action));
  return button;
}

function picker(cards: HTMLElement[]): HTMLElement {
  const grid = el('div', 'picker');
  grid.append(...cards);
  return grid;
}

function levelButtons(): HTMLElement {
  const row = el('div', 'levels');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', text().levelsLabel);
  for (const level of LEVELS) {
    const button = el('button', 'small-btn', text().spotCount(level.spots));
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.level === level.id));
    button.addEventListener('click', () => {
      const next = reduce(state, { type: 'setLevel', level: level.id });
      if (next === state) return;
      state = next;
      store.set(SAVE_KEY, state);
      render();
    });
    row.append(button);
  }
  return row;
}

function poster(art: string, ...extra: HTMLElement[]): HTMLElement {
  const box = el('div', 'poster');
  box.append(el('div', 'poster-art', art), ...extra);
  return box;
}

function buildRoom(): HTMLElement {
  const friend = friendById(state.friendId);
  room = createRoom(sceneOf(state), spotsInPlay(state), friend, tapSpot);
  return room.element;
}

function tapSpot(spot: Spot): void {
  if (state.phase === 'hide') {
    if (dispatch({ type: 'hideAt', spotId: spot.id }, PAUSE.hide)) say(LINES.hide());
    return;
  }
  if (state.phase !== 'seek' || isQuiet()) return;
  if (state.opened.includes(spot.id)) {
    say(spokenLine);
    return;
  }
  const pause = spot.id === state.hidingSpot ? PAUSE.found : PAUSE.open;
  if (dispatch({ type: 'open', spotId: spot.id }, pause) && state.phase === 'seek') say(lastSeekLine());
}

function showRoom(): void {
  const hidden = hidingSpot();
  const seeking = state.phase === 'seek';
  const wiggle = wiggleSpot(state);
  const clue = seeking && hidden && state.opened.length > 0 && !wiggle;
  const friendShows = state.phase === 'hide' || state.phase === 'found';
  room?.show({
    opened: state.opened,
    round: state.round,
    friendAt: friendShows ? state.hidingSpot : null,
    found: state.phase === 'found',
    wiggle,
    pointedAt: clue ? pickClue(sceneOf(state), spotsInPlay(state), hidden, state.opened).anchors : [],
    tappable: seeking || (state.phase === 'hide' && !hidden),
  });
}

function pickFriendScreen(): void {
  stage.append(
    picker(
      FRIENDS.map((friend) =>
        card(friend.emoji, text().friendName(friend.id), 'card-friend', { type: 'pickFriend', friendId: friend.id }),
      ),
    ),
  );
  actions.append(levelButtons());
}

function pickSceneScreen(): void {
  stage.append(
    picker(
      SCENES.map((scene) =>
        card(scene.emoji, text().sceneName(scene.id), `card-scene scene-${scene.id}`, { type: 'pickScene', sceneId: scene.id }),
      ),
    ),
  );
  actions.append(levelButtons());
}

function eyesScreen(): void {
  stage.append(poster('🙈', el('div', 'poster-note', FACE[seekerOf(state)])));
  actions.append(bigButton(text().eyesShut, 'btn-sun', { type: 'eyesShut' }));
}

function hideScreen(): void {
  if (builtFor !== 'hide') stage.append(buildRoom());
  if (state.hidingSpot) actions.append(bigButton(text().ready, 'btn-leaf', { type: 'ready' }));
  else actions.append(el('span', 'finger finger-up', '👆'));
}

function passScreen(): void {
  const pass = el('div', 'poster-note', `${FACE[state.hider]} 📱 ➡️ ${FACE[seekerOf(state)]}`);
  stage.append(poster('🤲', pass));
  actions.append(bigButton(text().hereICome, 'btn-grape', { type: 'startSeeking' }));
}

function seekScreen(): void {
  if (builtFor !== 'seek') stage.append(buildRoom());
  if (state.phase === 'found') {
    const label = state.round + 1 >= ROUNDS ? text().hooray : text().next;
    actions.append(bigButton(label, 'btn-sun', { type: 'next' }));
    return;
  }
  const hint = el('div', 'seek-hint');
  hint.append(el('span', 'finger finger-up', '👆'), el('span', 'seek-friend', friendById(state.friendId).emoji));
  actions.append(hint);
}

function endScreen(): void {
  const friend = friendById(state.friendId).emoji;
  stage.append(poster(friend, el('div', 'poster-note', `🎉 ${FACE.kid} 🤗 ${FACE.grownup} 🎉`)));
  actions.append(bigButton(text().playAgain, 'btn-leaf', { type: 'playAgain' }));
}

const SCREENS: Record<Phase, () => void> = {
  pickFriend: pickFriendScreen,
  pickScene: pickSceneScreen,
  eyes: eyesScreen,
  hide: hideScreen,
  pass: passScreen,
  seek: seekScreen,
  found: seekScreen,
  end: endScreen,
};

function renderScore(): void {
  const inGame = state.phase !== 'pickFriend' && state.phase !== 'pickScene';
  score.replaceChildren();
  if (!inGame) return;
  for (const player of ['kid', 'grownup'] as const) {
    const count = state.stars[player];
    score.append(el('span', 'score-player', FACE[player] + '⭐'.repeat(count)));
  }
}

function renderRestart(asking = false): void {
  restart.replaceChildren();
  if (state.phase === 'pickFriend') return;
  const toggle = el('button', 'small-btn', '↺');
  toggle.type = 'button';
  toggle.setAttribute('aria-label', text().startOverLabel);
  toggle.addEventListener('click', () => renderRestart(!asking));
  restart.append(toggle);
  if (!asking) return;
  const confirm = el('button', 'small-btn', text().startOver);
  confirm.type = 'button';
  confirm.addEventListener('click', () => {
    state = newGame(state);
    store.set(SAVE_KEY, state);
    builtFor = '';
    render();
    announce();
  });
  restart.append(confirm);
}

function roomKey(phase: Phase): string {
  if (phase === 'found') return 'seek';
  return phase;
}

function render(): void {
  const key = roomKey(state.phase);
  const keepRoom = key === builtFor && (key === 'hide' || key === 'seek');
  if (!keepRoom) stage.replaceChildren();
  actions.replaceChildren();
  SCREENS[state.phase]();
  builtFor = key;
  document.body.dataset.phase = state.phase;
  showRoom();
  renderScore();
  renderRestart();
}

/** The words on the page that stay put from screen to screen. */
function showPageWords(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  title.textContent = words.title;
  score.setAttribute('aria-label', words.stars);
  sayAgain.setAttribute('aria-label', words.sayAgain);
  home.setAttribute('aria-label', words.backHome);
  sayAgain.hidden = !canSpeak();
}

sayAgain.addEventListener('click', () => say(spokenLine));
byId('topbar').prepend(home);
title.after(languageButton(['en', 'sl']));

// The room stays up, so nothing replays and no progress moves. Only the words change.
onLanguageChange(() => {
  showPageWords();
  render();
  say(LINES[state.phase]());
});

// Browsers block speech until the first tap, so a tap on empty space says the opening line.
window.addEventListener(
  'pointerup',
  (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('button, a')) say(spokenLine);
  },
  { once: true },
);

showPageWords();
render();
announce();
