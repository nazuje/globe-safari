import { burst, canSpeak, homeButton, speak, stopSpeaking } from '@playroom/kit';
import { BOUNCE_MS, bounceBack, flyIn, FLY_MS } from './flight.ts';
import { foodById } from './foods.ts';
import type { Color } from './foods.ts';
import { buildMonster } from './monsters.ts';
import type { MonsterStyle, MonsterView } from './monsters.ts';
import { countWord } from './requests.ts';
import type { Level, MonsterRequest, PlateItem } from './requests.ts';
import {
  currentRequest,
  feed,
  foodLeft,
  fullness,
  HINT_AFTER_MISSES,
  newRound,
  nextReaction,
  showsHint,
  sneezeLine,
} from './round.ts';
import type { Reaction, Round } from './round.ts';

const HELLO_LINE = 'I am so hungry!';
const FULL_LINE = 'I am so full! Thank you!';
const AGAIN_LINE = 'More food?';

const HELLO_MS = 1700;
const CHOMP_MS = 480;
/** Lets a spoken number finish before the monster says something else. */
const LAST_COUNT_MS = 450;
const REACTION_MS = 1800;
const YUCK_MS = 480;
const SNEEZE_MS = 240;
const DANCE_MS = 3000;
const IDLE_MS = 12000;
/** After this many quiet nudges the monster stops asking and just waits. */
const MAX_NUDGES = 3;

const COLOR_PAINT: Record<Color, string> = {
  red: '#e5383b',
  yellow: '#ffd23f',
  green: '#3fbf5f',
  orange: '#ff8c1a',
  purple: '#8e44ec',
};

export interface PlayOptions {
  style: MonsterStyle;
  level: Level;
  /** A saved round to carry on with, or null for a fresh one. */
  resume: Round | null;
  /** Called on every change, with null once the round is over. */
  onProgress(round: Round | null): void;
  onLeave(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  created.className = className;
  parent?.append(created);
  return created;
}

/** Sizes a pile so all of its food fits in a tile. */
function pileColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function fillPile(pile: HTMLElement, emoji: string, count: number): void {
  pile.style.setProperty('--cols', String(pileColumns(count)));
  pile.replaceChildren(
    ...Array.from({ length: count }, () => {
      const piece = document.createElement('span');
      piece.textContent = emoji;
      return piece;
    }),
  );
}

function pictureFor(request: MonsterRequest, level: Level, eaten: number, parent: HTMLElement): void {
  const emoji = foodById(request.correctId).emoji;
  if (request.color) {
    const swatch = element('span', 'swatch', parent);
    swatch.style.background = COLOR_PAINT[request.color];
    return;
  }
  if (level === 5) {
    element('span', 'ask-number', parent).textContent = String(request.count);
    element('span', 'ask-food', parent).textContent = emoji;
    return;
  }
  for (let i = 0; i < request.count; i++) {
    const copy = element('span', i < eaten ? 'ask-food ask-eaten' : 'ask-food', parent);
    copy.textContent = emoji;
  }
}

/** The game itself. Returns a function that stops it and clears the screen's timers. */
export function startPlay(host: HTMLElement, options: PlayOptions): () => void {
  const { style, level, onProgress, onLeave } = options;
  let round = options.resume ?? newRound(level);
  let busy = true;
  let lastReaction: Reaction | null = null;
  let nudges = 0;
  let idleTimer: number | undefined;
  const timers = new Set<number>();

  // A stopped game just never wakes up, so nothing below needs to check for it.
  const pause = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        resolve();
      }, ms);
      timers.add(id);
    });

  const screen = element('div', 'play');
  const bar = element('header', 'topbar', screen);
  const leave = element('button', 'leave-btn topbar-end');
  leave.type = 'button';
  leave.textContent = '⚙️';
  leave.setAttribute('aria-label', 'Change monster or level');
  leave.addEventListener('click', onLeave);
  bar.append(homeButton(), leave);

  const ask = element('section', 'ask', screen);
  ask.setAttribute('aria-live', 'polite');
  const bubble = element('div', 'bubble', ask);
  const picture = element('div', 'ask-picture', bubble);
  const text = element('p', 'ask-text', bubble);

  const stage = element('div', 'stage', screen);
  const monster: MonsterView = buildMonster(style);
  stage.append(monster.root);

  const plate = element('div', 'plate', screen);
  const finger = element('div', 'finger');
  finger.textContent = '👆';
  finger.setAttribute('aria-hidden', 'true');

  const save = (): void => onProgress(round);

  const sayRequest = (): void => speak(currentRequest(round).line);

  const showLine = (emoji: string, line: string): void => {
    picture.replaceChildren();
    element('span', 'ask-food', picture).textContent = emoji;
    text.textContent = line;
  };

  const showAsk = (): void => {
    const request = currentRequest(round);
    picture.replaceChildren();
    pictureFor(request, level, round.eaten, picture);
    text.textContent = request.line;
    monster.setTally(level === 5 ? request.count : 0, round.eaten);
  };

  const tiles = (): HTMLElement[] => [...plate.querySelectorAll<HTMLElement>('.tile')];

  const showHint = (): void => {
    const request = currentRequest(round);
    const hinting = showsHint(round);
    for (const tile of tiles()) {
      const right = tile.dataset.food === request.correctId;
      tile.classList.toggle('tile-pulse', hinting && right);
      tile.classList.toggle('tile-fade', hinting && !right);
    }
  };

  const showFinger = (): void => {
    const request = currentRequest(round);
    const right = tiles().find((tile) => tile.dataset.food === request.correctId);
    (showsHint(round) && right ? right : plate).append(finger);
  };

  const stopIdle = (): void => {
    window.clearTimeout(idleTimer);
    finger.remove();
  };

  const armIdle = (): void => {
    window.clearTimeout(idleTimer);
    if (nudges >= MAX_NUDGES) return;
    idleTimer = window.setTimeout(() => {
      nudges += 1;
      // A second quiet spell means the child is stuck, so show the answer.
      if (nudges >= 2) round = { ...round, misses: Math.max(round.misses, HINT_AFTER_MISSES) };
      save();
      showHint();
      showFinger();
      monster.tickle();
      sayRequest();
      armIdle();
    }, IDLE_MS);
  };

  const listen = (): void => {
    monster.setMood('hungry');
    busy = false;
    armIdle();
  };

  const reactTo = async (): Promise<void> => {
    const reaction = nextReaction(lastReaction);
    lastReaction = reaction;
    monster.setFullness(fullness(round));
    monster.setMood(reaction.mood);
    showLine('😋', reaction.line);
    speak(reaction.line);
    await pause(REACTION_MS);
    showRequest();
  };

  const celebrate = async (): Promise<void> => {
    onProgress(null);
    monster.setFullness(1);
    monster.setTally(0, 0);
    monster.setMood('dance');
    showLine('🎉', FULL_LINE);
    plate.replaceChildren();
    speak(FULL_LINE);
    for (let i = 0; i < 4; i++) {
      const box = monster.root.getBoundingClientRect();
      burst(box.left + box.width * (0.25 + 0.5 * Math.random()), box.top + box.height * (0.2 + 0.5 * Math.random()), 24);
      await pause(DANCE_MS / 4);
    }
    const again = element('button', 'btn btn-sun again', plate);
    again.type = 'button';
    again.textContent = '🍽️';
    again.setAttribute('aria-label', 'More food');
    again.addEventListener('click', () => {
      round = newRound(level);
      save();
      monster.setFullness(0);
      void sayHello();
    });
    speak(AGAIN_LINE);
  };

  const eat = async (item: PlateItem, tile: HTMLElement): Promise<void> => {
    const food = foodById(item.foodId);
    const request = currentRequest(round);
    const left = foodLeft(round, item) - 1;
    const result = feed(round, item.foodId);
    if (result.outcome === 'wrong') return;
    round = result.round;
    save();

    fillPile(tile.querySelector<HTMLElement>('.pile')!, food.emoji, left);
    flyIn(food.emoji, tile, monster.mouth);
    await pause(FLY_MS);

    monster.setMood('chomp');
    const counting = request.kind === 'count';
    if (counting) speak(countWord(result.bites));
    if (level === 5) monster.setTally(request.count, result.bites);
    else picture.querySelectorAll('.ask-food')[result.bites - 1]?.classList.add('ask-eaten');
    await pause(CHOMP_MS);

    if (result.outcome === 'bite') {
      listen();
      return;
    }
    if (counting) await pause(LAST_COUNT_MS);
    await (result.outcome === 'round-done' ? celebrate() : reactTo());
  };

  const sneeze = async (item: PlateItem, tile: HTMLElement): Promise<void> => {
    const { emoji } = foodById(item.foodId);
    round = feed(round, item.foodId).round;
    save();

    flyIn(emoji, tile, monster.mouth);
    await pause(FLY_MS);

    monster.setMood('yuck');
    speak(sneezeLine());
    await pause(YUCK_MS);

    monster.setMood('sneeze');
    await pause(SNEEZE_MS);
    bounceBack(emoji, monster.mouth, tile);
    await pause(BOUNCE_MS);

    tile.classList.remove('tile-wiggle');
    void tile.offsetWidth;
    tile.classList.add('tile-wiggle');
    showHint();
    if (showsHint(round)) showFinger();
    sayRequest();
    listen();
  };

  const onTile = (item: PlateItem, tile: HTMLElement): void => {
    if (busy) return;
    busy = true;
    stopIdle();
    nudges = 0;
    const isRight = item.foodId === currentRequest(round).correctId;
    void (isRight ? eat(item, tile) : sneeze(item, tile));
  };

  const fillPlate = (): void => {
    plate.replaceChildren();
    for (const item of currentRequest(round).plate) {
      const food = foodById(item.foodId);
      const tile = element('button', 'tile', plate);
      tile.type = 'button';
      tile.dataset.food = item.foodId;
      tile.setAttribute('aria-label', food.one);
      fillPile(element('span', 'pile', tile), food.emoji, foodLeft(round, item));
      tile.addEventListener('click', () => onTile(item, tile));
    }
    showHint();
  };

  function showRequest(): void {
    nudges = 0;
    showAsk();
    fillPlate();
    if (round.index === 0 && round.eaten === 0) showFinger();
    sayRequest();
    listen();
  }

  async function sayHello(): Promise<void> {
    busy = true;
    plate.replaceChildren();
    monster.setMood('wiggle');
    showLine('😋', HELLO_LINE);
    speak(HELLO_LINE);
    await pause(HELLO_MS);
    showRequest();
  }

  const sayAgain = (): void => {
    if (busy) return;
    monster.tickle();
    sayRequest();
    armIdle();
  };

  monster.root.addEventListener('click', sayAgain);
  if (canSpeak()) {
    const sound = element('button', 'sound-btn', ask);
    sound.type = 'button';
    sound.textContent = '🔊';
    sound.setAttribute('aria-label', 'Say it again');
    sound.addEventListener('click', sayAgain);
  }

  host.replaceChildren(screen);
  save();
  monster.setFullness(fullness(round));
  if (options.resume) showRequest();
  else void sayHello();

  return () => {
    window.clearTimeout(idleTimer);
    for (const id of timers) window.clearTimeout(id);
    stopSpeaking();
    for (const flyer of document.querySelectorAll('.flyer')) flyer.remove();
  };
}
