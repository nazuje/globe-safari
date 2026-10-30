import { playSound, store } from '@playroom/kit';
import type { Stage } from '@playroom/stage3d';
import { cleanHats, roundHats, type HatId } from './hats.ts';
import { Hud } from './hud.ts';
import { text } from './lang/index.ts';
import type { SceneId } from './layout.ts';
import { showMenu } from './menu.ts';
import { Playfield } from './playfield.ts';
import { showResult } from './result.ts';
import { createRound, needsHelp, type Round, type RoundEvent } from './round.ts';
import { showShelf } from './shelf.ts';
import { goldenSound, hatSound, starSound, yetiSound, friendSound } from './sounds.ts';
import { hatPicture } from './thumbs.ts';
import { cleanBests, cleanLevel, countRound, type LevelId } from './tuning.ts';
import { element } from './ui.ts';
import { say, setLine, type Line } from './voice.ts';

const HATS_KEY = 'snowball-splat:hats';
const LEVEL_KEY = 'snowball-splat:level';
const BESTS_KEY = 'snowball-splat:bests';
const PLAYED_KEY = 'snowball-splat:played';
const HINT_IDLE_SECONDS = 5;
const CHEER_EVERY = 7;
const KEY_AIM_SPEED = 620;
const AIM_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

export interface Game {
  redraw(): void;
  backToMenu(): void;
  stop(): void;
}

/** Runs the screens around the 3D scene: menu, round, result and hat shelf. */
export function startGame(stage: Stage, host: HTMLElement, overlay: HTMLElement, onScreen: () => void): Game {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hud = new Hud();
  const hint = element('div', 'hint');
  hint.textContent = '👆';
  hint.setAttribute('aria-hidden', 'true');
  hint.hidden = true;
  const sight = element('div', 'sight');
  sight.hidden = true;
  const mitten = element('div', 'mitten');
  mitten.textContent = '🧤';
  mitten.setAttribute('aria-hidden', 'true');
  host.append(hint, sight, mitten);
  overlay.append(hud.root);

  let scene: SceneId = 'village';
  let level = cleanLevel(store.get<unknown>(LEVEL_KEY, 'easy'));
  let owned = cleanHats(store.get<unknown>(HATS_KEY, []));
  let bests = cleanBests(store.get<unknown>(BESTS_KEY, {}));
  let closeScreen: () => void = () => {};
  let newHats: HatId[] = [];
  let resultStars = 0;
  let wasBest = false;
  let splats = 0;
  let idle = 0;
  let hitOnce = false;
  const keys = new Set<string>();
  let aimX = 0;
  let aimY = 0;

  const playing = (): boolean => document.body.dataset.screen === 'play';
  const current = (): Round | null => field.round;

  function picture(hat: HatId): string {
    return hatPicture(stage.renderer, hat);
  }

  function leave(): void {
    closeScreen();
    closeScreen = () => {};
  }

  function collect(hat: HatId): void {
    if (owned.includes(hat)) return;
    owned = cleanHats([...owned, hat]);
    store.set(HATS_KEY, owned);
    newHats.push(hat);
    hatSound();
    say(() => text().newHat);
  }

  function arrive(line: Line, sound: () => void): void {
    say(line);
    sound();
  }

  function finish(round: Round): void {
    resultStars = round.stars;
    wasBest = round.score > bests[round.levelId];
    if (wasBest) {
      bests = { ...bests, [round.levelId]: round.score };
      store.set(BESTS_KEY, bests);
    }
    drawResult(round);
    say(() => (wasBest ? text().best : text().stars[resultStars - 1]));
  }

  function hearEvent(event: RoundEvent): void {
    const round = current();
    if (!round || round.demo) return;
    switch (event.type) {
      case 'splat':
      case 'friend':
      case 'giantHit':
        hitOnce = true;
        idle = 0;
        hint.hidden = true;
        if (event.type === 'splat') {
          splats += 1;
          if (splats % CHEER_EVERY === 0) say(() => text().cheers[(splats / CHEER_EVERY) % 3]);
        }
        break;
      case 'arrive':
        if (event.kind === 'golden') arrive(() => text().golden, goldenSound);
        else if (event.kind === 'penguin') arrive(() => text().penguin, friendSound);
        else arrive(() => text().yeti, yetiSound);
        break;
      case 'giantIn':
        say(() => text().giant);
        idle = 0;
        break;
      case 'giantBurst':
        say(() => text().finale);
        break;
      case 'star':
        starSound(event.stars);
        break;
      case 'done':
        finish(round);
        break;
    }
    hud.show(round.score, round.stars);
  }

  const field = new Playfield(stage, host, calm, {
    onHat: (hat) => {
      if (current()?.demo === false) collect(hat);
    },
    onEvent: hearEvent,
  });

  function newRound(demo: boolean, played = 0): Round {
    return createRound({
      scene,
      level: demo ? 'easy' : level,
      hats: roundHats(owned, Math.random),
      rng: Math.random,
      demo,
      played,
      fits: field.fits,
    });
  }

  function begin(): void {
    leave();
    document.body.dataset.screen = 'play';
    newHats = [];
    splats = 0;
    idle = 0;
    hitOnce = false;
    aimX = host.clientWidth / 2;
    aimY = host.clientHeight * 0.55;
    sight.hidden = true;
    hud.reset();
    const { before, after } = countRound(store.get<unknown>(PLAYED_KEY, 0));
    store.set(PLAYED_KEY, after);
    field.show(newRound(false, before));
    say(() => text().hint);
    onScreen();
  }

  function drawMenu(): void {
    leave();
    closeScreen = showMenu(overlay, {
      level,
      hats: owned.length,
      best: bests[level],
      onLevel: (chosen: LevelId) => {
        level = chosen;
        store.set(LEVEL_KEY, chosen);
        playSound('pop');
        drawMenu();
      },
      onScene: (chosen) => {
        scene = chosen;
        playSound('pop');
        begin();
      },
      onHats: () => {
        drawShelf();
        say(() => text().shelf);
      },
    });
    onScreen();
  }

  function drawShelf(): void {
    leave();
    closeScreen = showShelf(overlay, { owned, picture, onClose: menu });
    onScreen();
  }

  function drawResult(round: Round): void {
    leave();
    closeScreen = showResult(overlay, {
      score: round.score,
      stars: resultStars,
      best: wasBest,
      newHats,
      picture,
      onAgain: begin,
      onOther: menu,
    });
    onScreen();
  }

  function menu(): void {
    setLine(() => text().pick);
    drawMenu();
    field.show(newRound(true));
    say(() => text().pick);
  }

  function aimFromKeys(seconds: number): void {
    let moved = false;
    for (const key of keys) {
      const way = AIM_KEYS[key];
      if (!way) continue;
      aimX += way[0] * KEY_AIM_SPEED * seconds;
      aimY += way[1] * KEY_AIM_SPEED * seconds;
      moved = true;
    }
    if (!moved) return;
    aimX = Math.min(Math.max(aimX, 0), host.clientWidth);
    aimY = Math.min(Math.max(aimY, 0), host.clientHeight);
    sight.hidden = false;
    sight.style.transform = `translate(${aimX}px, ${aimY}px)`;
  }

  function showHint(): void {
    const round = current();
    const wanted = idle >= HINT_IDLE_SECONDS || !hitOnce || (round !== null && needsHelp(round));
    const spot = wanted ? field.hintSpot() : null;
    hint.hidden = !spot;
    if (spot) hint.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
    if (spot) {
      host.dataset.aimX = String(Math.round(spot.x));
      host.dataset.aimY = String(Math.round(spot.y));
    }
  }

  function everyFrame(seconds: number): void {
    const round = current();
    if (!round) return;
    host.dataset.phase = round.demo ? 'demo' : round.phase;
    host.dataset.score = String(round.score);
    host.dataset.targets = round.targets.map((target) => target.kind).join();
    if (!playing()) {
      hint.hidden = true;
      return;
    }
    idle += seconds;
    aimFromKeys(seconds);
    showHint();
  }

  function pointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    const box = host.getBoundingClientRect();
    throwAt(event.clientX - box.left, event.clientY - box.top);
  }

  function throwAt(x: number, y: number): void {
    field.throwTo(x, y);
    idle = 0;
    mitten.animate(
      [
        { transform: `translate(-50%, 0) rotate(0deg)` },
        { transform: `translate(calc(-50% + ${(x - host.clientWidth / 2) * 0.25}px), -46px) rotate(-16deg)` },
        { transform: `translate(-50%, 0) rotate(0deg)` },
      ],
      { duration: 240, easing: 'ease-out' },
    );
  }

  function keyDown(event: KeyboardEvent): void {
    if (!playing()) return;
    if (event.key in AIM_KEYS) {
      keys.add(event.key);
      event.preventDefault();
    } else if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
      sight.hidden = false;
      sight.style.transform = `translate(${aimX}px, ${aimY}px)`;
      throwAt(aimX, aimY);
      event.preventDefault();
    }
  }

  function keyUp(event: KeyboardEvent): void {
    keys.delete(event.key);
  }

  function noMenu(event: Event): void {
    event.preventDefault();
  }

  stage.canvas.addEventListener('pointerdown', pointerDown);
  stage.canvas.addEventListener('contextmenu', noMenu);
  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);
  stage.onFrame(everyFrame);
  if (import.meta.env.DEV) Object.assign(window, { __stage: stage, __field: field });

  setLine(() => text().pick);
  drawMenu();
  field.show(newRound(true));
  stage.start();

  return {
    redraw() {
      hud.label();
      const screen = document.body.dataset.screen;
      if (screen === 'menu') drawMenu();
      else if (screen === 'shelf') drawShelf();
      else if (screen === 'result') {
        const round = current();
        if (round) drawResult(round);
      }
    },
    backToMenu: menu,
    stop() {
      stage.canvas.removeEventListener('pointerdown', pointerDown);
      stage.canvas.removeEventListener('contextmenu', noMenu);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      stage.dispose();
    },
  };
}
