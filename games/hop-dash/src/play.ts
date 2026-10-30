import { burst, speak } from '@playroom/kit';
import { makeBackdrop } from './backdrop.ts';
import { buildLevel, type LevelPlan } from './build.ts';
import { aimCamera, drawFrame, makeView, scoreSpot, type LeavingHelper, type View } from './draw.ts';
import { showFinish } from './finish.ts';
import { addBit, dust, kick, makeFx, sparkle, updateFx } from './fx.ts';
import { text } from './lang/index.ts';
import { runStars, type StarCount } from './rating.ts';
import { RUNNER_PITCH, type RunnerId } from './runners.ts';
import { advance, createRun, press, release, type RunEvent } from './run.ts';
import * as sounds from './sounds.ts';
import { DIFFICULTIES, type DifficultyId } from './tuning.ts';
import { element } from './ui.ts';
import { WORLDS } from './worlds.ts';

const MOST_DPR = 2;
/** A long stall (a hidden tab, a phone call) shouldn't jump the game ahead. */
const LONGEST_FRAME = 0.1;
const FINISH_PAUSE_MS = 1300;
const DUST_EVERY = 0.085;
const STRIDE_PER_UNIT = 0.052;
const HELPER_LEAVES_AFTER = 1.2;
const TWO_FINGERS_MS = 45;
const OOPS_CHANCE = 0.3;
const LANDING_WORTH_DUST = 260;
const FLY_SECONDS = 0.42;
const CLUE_FINGER_REACH = 90;

/** Each lesson is taught until the child's own finger has done it. The game's helpful jumps on Easy don't count. */
const taught = { tap: false, again: false, againShown: 0 };
const MOST_AGAIN_HINTS = 5;

export interface RunResult {
  stars: StarCount;
  score: number;
  foundTreasure: boolean;
}

export interface FinishInfo {
  best: number;
  newBest: boolean;
  treasure: string | null;
}

export interface PlayOptions {
  plan: LevelPlan;
  runner: RunnerId;
  difficulty: DifficultyId;
  hasNext: boolean;
  onFinish: (result: RunResult) => FinishInfo;
  onAgain: () => void;
  onNext: () => void;
  onLevels: () => void;
}

export interface PlayScreen {
  stop: () => void;
  line: () => string;
  redraw: () => void;
}

export function startPlay(host: HTMLElement, options: PlayOptions): PlayScreen {
  const { plan, runner } = options;
  document.body.dataset.screen = 'play';
  const stage = element('section', 'stage');
  const canvas = element('canvas', 'world');
  stage.append(canvas);
  host.append(stage);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser has no 2D canvas');
  const ctx = context;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const level = buildLevel(plan, DIFFICULTIES[options.difficulty]);
  const world = WORLDS[plan.world];
  const backdrop = makeBackdrop(world);
  const run = createRun(level);
  const fx = makeFx();
  const fingers = new Set<number>();
  let view: View = makeView(1, 1, 1);
  let frameId = 0;
  let lastFrame = performance.now();
  let lastTap = -Infinity;
  let time = 0;
  let leaving: LeavingHelper | null = null;
  let spokenScoop = false;
  let finishPanel: { close: () => void; redraw: () => void } | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;

  function fit(): void {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(MOST_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    const fresh = makeView(box.width, box.height, dpr);
    aimCamera(fresh, run, 0, true);
    view = fresh;
    backdrop.sky = null;
  }

  function fingerDown(): void {
    const now = performance.now();
    // Two fingers landing together, or a resting palm, count as one tap.
    if (now - lastTap < TWO_FINGERS_MS) return;
    lastTap = now;
    if (run.on === -1 && run.jumps === 1) taught.again = true;
    taught.tap = true;
    press(run);
  }

  function fingerUp(): void {
    if (fingers.size === 0) release(run);
  }

  function pointerDown(event: PointerEvent): void {
    event.preventDefault();
    fingers.add(event.pointerId);
    fingerDown();
  }

  function pointerUp(event: PointerEvent): void {
    fingers.delete(event.pointerId);
    fingerUp();
  }

  function keyDown(event: KeyboardEvent): void {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    event.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (!event.repeat) fingerDown();
  }

  function keyUp(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.code === 'ArrowUp') release(run);
  }

  function endRun(): void {
    const stars = runStars(run);
    const info = options.onFinish({ stars, score: run.score, foundTreasure: run.foundTreasure });
    canvas.dataset.finished = 'true';
    canvas.dataset.stars = String(stars);
    finishPanel = showFinish(stage, {
      stars,
      score: run.score,
      best: info.best,
      newBest: info.newBest,
      treasure: info.treasure,
      hasNext: options.hasNext,
      onAgain: options.onAgain,
      onNext: options.onNext,
      onLevels: options.onLevels,
    });
  }

  function collectItem(index: number): void {
    const item = level.items[index]!;
    const x = (item.x - view.camX) * view.scale;
    const y = view.height - (item.y - view.camY) * view.scale;
    fx.scorePop = 1;
    canvas.dataset.score = String(run.score);
    if (item.kind === 'star' || item.kind === 'carrot') {
      sounds[item.kind === 'star' ? 'starSound' : 'carrotSound']();
      const art = item.kind === 'star' ? 'star' : '🥕';
      addBit(fx, { x, y, vx: (scoreSpot.x - x) / FLY_SECONDS, vy: (scoreSpot.y - y) / FLY_SECONDS, life: FLY_SECONDS, size: 22, art, screen: true });
      return;
    }
    if (item.kind === 'chest') {
      sounds.treasureSound();
      speak(text().treasure);
      canvas.dataset.treasure = 'true';
      const box = canvas.getBoundingClientRect();
      burst(box.left + x, box.top + y, 30);
      sparkle(fx, item.x, item.y, '✨', 12, 170);
    }
  }

  function react(event: RunEvent): void {
    switch (event.type) {
      case 'jump':
        sounds.jumpSound(RUNNER_PITCH[runner]);
        kick(fx, 7);
        if (!calm) dust(fx, event.x, event.y, world.grass, 5, 90);
        if (taught.tap && !taught.again && taught.againShown < MOST_AGAIN_HINTS) taught.againShown++;
        return;
      case 'skim':
        sounds.landSound();
        if (!calm) dust(fx, event.x, event.y, world.grass, 3, 60);
        return;
      case 'double':
        sounds.doubleSound(RUNNER_PITCH[runner]);
        kick(fx, 6);
        fx.ring = 1;
        fx.ringX = event.x;
        fx.ringY = event.y;
        if (!calm) sparkle(fx, event.x, event.y + 16, '✨', 5, 130);
        return;
      case 'land':
        if (event.impact > LANDING_WORTH_DUST) {
          sounds.landSound();
          kick(fx, -Math.min(7, event.impact / 80));
          if (!calm) dust(fx, event.x, event.y, world.grass, 7, 170);
        }
        return;
      case 'spring':
        sounds.springSound();
        kick(fx, 9);
        if (!calm) sparkle(fx, event.x, event.y + 24, '✨', 6, 150);
        return;
      case 'bounce':
        sounds.bounceSound(40 + (event.x % 200));
        kick(fx, 9);
        return;
      case 'jelly':
        sounds.jellySound();
        kick(fx, 8);
        canvas.dataset.jellies = String(run.jellyBounces);
        if (!calm) sparkle(fx, event.x, event.y, '💦', 4, 120);
        return;
      case 'tumble':
        sounds.tumbleSound();
        fx.shake = 6;
        canvas.dataset.tumbles = String(run.tumbles);
        if (Math.random() < OOPS_CHANCE) speak(text().oops);
        return;
      case 'scoop':
        sounds.scoopSound();
        canvas.dataset.rescues = String(run.rescues);
        if (!spokenScoop) speak(text().scooped);
        spokenScoop = true;
        return;
      case 'drop':
        sounds.dropSound();
        leaving = { helper: run.rescues % 2 === 1 ? 'stork' : 'cloud', x: event.x, y: event.y + 70, age: 0 };
        return;
      case 'rocket':
        sounds.rocketSound();
        speak(text().rocket);
        canvas.dataset.rocket = 'true';
        return;
      case 'item':
        collectItem(event.index);
        return;
      case 'flag': {
        sounds.flagSound();
        const box = canvas.getBoundingClientRect();
        burst(box.left + box.width / 2, box.top + box.height * 0.3, 40);
        speak(level.castle ? text().castle : text().flag);
        return;
      }
      case 'finish':
        finishTimer = setTimeout(endRun, FINISH_PAUSE_MS);
        return;
      case 'rocketEnd':
        sounds.dropSound();
        return;
    }
  }

  function runningDust(seconds: number): void {
    fx.stride += run.speed * seconds * STRIDE_PER_UNIT;
    if (run.rocketTo !== null) {
      fx.dustIn -= seconds;
      if (fx.dustIn <= 0 && !calm) {
        fx.dustIn = 0.04;
        dust(fx, run.x - 34, run.y + 2, '#ffb03c', 2, 40);
      }
      return;
    }
    if (run.on === -1 || run.speed < 50 || calm) return;
    fx.dustIn -= seconds;
    if (fx.dustIn <= 0) {
      fx.dustIn = DUST_EVERY;
      dust(fx, run.x - 12, run.y, world.dark ? '#ffffff55' : '#ffffffaa', 1, 50);
    }
  }

  function updateHelper(seconds: number): void {
    if (!leaving) return;
    leaving.age += seconds;
    if (leaving.age > HELPER_LEAVES_AFTER) leaving = null;
  }

  /** Up at the ring on the way to a hidden path, with the second jump still to use. */
  function atClue(): boolean {
    if (run.foundTreasure || run.jumps !== 1) return false;
    return level.clues.some((clue) => Math.abs(run.x - clue.tapX) < CLUE_FINGER_REACH && Math.abs(run.y - clue.tapY) < CLUE_FINGER_REACH);
  }

  function hintNow(): { tap: boolean; again: boolean } {
    const inAir = run.on === -1 && run.scoop === null && run.rocketTo === null;
    const again = !taught.again && taught.againShown > 0 && taught.againShown <= MOST_AGAIN_HINTS && inAir && run.jumps === 1;
    return { tap: !taught.tap && !run.finished, again: again || (inAir && atClue()) };
  }

  function frame(now: number): void {
    const seconds = Math.min(LONGEST_FRAME, (now - lastFrame) / 1000);
    lastFrame = now;
    time += seconds;
    for (const event of advance(run, seconds)) react(event);
    runningDust(seconds);
    updateFx(fx, seconds);
    updateHelper(seconds);
    aimCamera(view, run, seconds, false);
    drawFrame({ ctx, view, backdrop, run, fx, runner, time, calm, leaving, hint: hintNow() });
    frameId = requestAnimationFrame(frame);
  }

  function clearFingers(): void {
    fingers.clear();
    fingerUp();
  }

  const blockMenu = (event: Event): void => event.preventDefault();

  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('contextmenu', blockMenu);
  window.addEventListener('pointerup', pointerUp);
  window.addEventListener('pointercancel', pointerUp);
  window.addEventListener('blur', clearFingers);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('resize', fit);
  fit();
  frameId = requestAnimationFrame(frame);
  if (!taught.tap) speak(text().tapToJump);

  return {
    stop() {
      cancelAnimationFrame(frameId);
      clearTimeout(finishTimer);
      finishPanel?.close();
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('blur', clearFingers);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('resize', fit);
      stage.remove();
    },
    line: () => {
      if (!taught.tap) return text().tapToJump;
      return taught.again ? text().worlds[plan.world] : text().tapAgain;
    },
    redraw: () => finishPanel?.redraw(),
  };
}
