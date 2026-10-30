import { burst, say, speak, stopSpeaking } from '@playroom/kit';
import { drawFrame, makeStarLayers, makeView, type View } from './draw.ts';
import { bubblePuff, confetti, laughBurst, makeFx, SLOW_POOL_SIZE, sparkle, starPop, stormRain, updateFx } from './fx.ts';
import { advance, BOSS_AT, createGame, resultOf, setField, setPush, setTarget, type GameEvent, type Result } from './game.ts';
import type { KindId } from './kinds.ts';
import { text } from './lang/index.ts';
import type { LevelId, SpeedId } from './levels.ts';
import { setLimit } from './pool.ts';
import { THEMES } from './sky.ts';
import * as sounds from './sounds.ts';
import { element } from './ui.ts';

const MOST_DPR = 2;
/** A long stall (a hidden tab, a phone call) shouldn't jump the game ahead. */
const LONGEST_FRAME = 0.1;
const HINT_SECONDS = 7;
const LINE_GAP = 2.6;
const SLOW_FRAME = 0.03;
const SLOW_SECONDS = 2.5;
const RAIN_GAP = 0.06;
const FINISH_PAUSE_MS = 250;
const STAR_LESSON = 3;

/** The finger lesson comes once a session in words. The picture shows every game. */
let hintSpoken = false;
/** Stars caught this session. The first few get a picture lesson, and after that a child knows. */
let starsLearned = 0;
let starLineSaid = false;

export interface PlayOptions {
  levelId: LevelId;
  speedId: SpeedId;
  onMet: (friend: KindId) => void;
  onDone: (result: Result, stage: HTMLElement) => void;
}

export interface PlayScreen {
  stop: () => void;
  /** The line the 🔊 button repeats. */
  line: () => string;
}

export function startPlay(host: HTMLElement, options: PlayOptions): PlayScreen {
  document.body.dataset.screen = 'play';
  const stage = element('section', 'stage');
  const theme = THEMES[options.levelId];
  stage.style.background = `linear-gradient(180deg, ${theme.sky[0]}, ${theme.sky[1]} 55%, ${theme.sky[2]})`;
  const canvas = element('canvas', 'space');
  stage.append(canvas);
  host.append(stage);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser has no 2D canvas');
  const ctx = context;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const game = createGame(options.levelId, options.speedId, Math.random);
  const fx = makeFx(calm);
  let view: View = makeView(1, 1, 1);
  let layers: HTMLCanvasElement[] = [];
  let slow = false;
  let slowFor = 0;
  let frameId = 0;
  let lastFrame = performance.now();
  let hintLeft = HINT_SECONDS;
  let moved = false;
  let lineWait = 0;
  let rain = 0;
  let starStep = 0;
  let beatIn = 0.6;
  let beatStep = 0;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const fingers = new Map<number, number>();
  const keys = new Set<string>();

  function fit(): void {
    const box = canvas.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const dpr = slow ? 1 : Math.min(MOST_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view = makeView(box.width, box.height, dpr);
    layers = makeStarLayers(view, theme.starTint, slow ? 2 : 3);
    setField(game, view.field);
    canvas.dataset.size = `${box.width}x${box.height}`;
  }

  function px(x: number, y: number): { x: number; y: number } {
    return { x: x * view.width, y: y * view.height };
  }

  /** A short line, unless one has only just been said, so the game never chatters over itself. */
  function chat(line: string): void {
    if (lineWait > 0) return;
    lineWait = LINE_GAP;
    speak(line);
  }

  function shout(line: string): void {
    lineWait = LINE_GAP;
    speak(line);
  }

  function handleTickle(event: Extract<GameEvent, { type: 'tickle' }>): void {
    const spot = px(event.x, event.y);
    laughBurst(fx, spot.x, spot.y, view.unit);
    sounds.giggleSound(event.combo);
    if (event.kind === 'goldie') {
      sounds.goldenSound();
      sparkle(fx, spot.x, spot.y, view.unit, 12);
    }
    fx.meterPop = 1;
    fx.scorePop = 1;
    options.onMet(event.kind);
    canvas.dataset.tickled = String(game.tickled);
    canvas.dataset.score = String(game.score);
    canvas.dataset.combo = String(game.bestCombo);
    if (event.kind === 'achoo') canvas.dataset.achoo = '1';
    if (event.kind === 'goldie') canvas.dataset.goldenTickled = '1';
  }

  function handleFinish(): void {
    sounds.finishSound();
    confetti(fx, view.width, view.height, 90);
    canvas.dataset.phase = 'finished';
    canvas.dataset.score = String(game.score);
    finishTimer = setTimeout(() => options.onDone(resultOf(game), stage), FINISH_PAUSE_MS);
  }

  function handleHighFive(x: number, y: number): void {
    const spot = px(x, y);
    sounds.highFiveSound();
    shout(text().highFive);
    fx.flash = 1;
    fx.shipBump = 1;
    sparkle(fx, spot.x, spot.y - view.unit * 9, view.unit * 1.6, 30);
    const box = canvas.getBoundingClientRect();
    burst(box.left + spot.x, box.top + spot.y - view.unit * 9, 24);
    canvas.dataset.highFive = '1';
  }

  function handle(event: GameEvent): void {
    switch (event.type) {
      case 'wave':
        canvas.dataset.wave = String(event.index + 1);
        break;
      case 'shot': {
        sounds.shotSound(event.kind === 'bubble');
        const spot = px(event.x, event.y);
        bubblePuff(fx, spot.x, spot.y + view.unit * 5, view.unit);
        break;
      }
      case 'tickle':
        handleTickle(event);
        break;
      case 'nudge': {
        const spot = px(event.x, event.y);
        sparkle(fx, spot.x, spot.y, view.unit, 4);
        sounds.nudgeSound();
        break;
      }
      case 'star': {
        const spot = px(event.x, event.y);
        starPop(fx, spot.x, spot.y, view.unit);
        sounds.starSound(starStep);
        starStep += 1;
        fx.scorePop = 1;
        fx.starPop = 1;
        starsLearned += 1;
        canvas.dataset.score = String(game.score);
        canvas.dataset.caught = String(game.caught);
        break;
      }
      case 'goo':
        sounds.gooSound();
        chat(text().goo);
        canvas.dataset.goo = '1';
        break;
      case 'gooDrop':
        sounds.nudgeSound();
        break;
      case 'power': {
        const spot = px(event.x, event.y);
        sparkle(fx, spot.x, spot.y, view.unit, 12);
        sounds.powerSound();
        chat(text().powers[event.power]);
        canvas.dataset.power = event.power;
        break;
      }
      case 'storm':
        sounds.stormSound();
        shout(text().storm);
        canvas.dataset.storms = String(game.storms);
        break;
      case 'stormEnd':
        break;
      case 'golden':
        sounds.goldenSound();
        shout(text().golden);
        canvas.dataset.golden = '1';
        break;
      case 'cat':
        sounds.catSound();
        shout(text().cat);
        options.onMet('cat');
        canvas.dataset.cat = '1';
        break;
      case 'catStars':
        sounds.catSound();
        break;
      case 'bossComing':
        sounds.bossSound();
        shout(text().bossComing);
        canvas.dataset.phase = 'boss';
        break;
      case 'bossHit': {
        const spot = px(event.x, event.y);
        sounds.bossHitSound();
        if (Math.random() < 0.3) laughBurst(fx, spot.x, spot.y, view.unit);
        break;
      }
      case 'bossGiggle':
        sounds.bossGiggleSound(event.stage);
        if (event.stage === 1) chat(text().bossGiggling);
        canvas.dataset.bossStage = String(event.stage);
        break;
      case 'sneeze': {
        const spot = px(event.x, event.y);
        sounds.sneezeSound();
        shout(text().sneeze);
        sparkle(fx, spot.x, spot.y, view.unit * 1.5, 16);
        canvas.dataset.sneeze = '1';
        break;
      }
      case 'bossDone': {
        sounds.bossGiggleSound(2);
        const spot = px(event.x, event.y);
        for (let i = 0; i < 4; i++) laughBurst(fx, spot.x + (i - 1.5) * view.unit * 8, spot.y, view.unit * 1.5);
        if (game.boss) options.onMet(game.boss.kind);
        canvas.dataset.phase = 'highFive';
        break;
      }
      case 'highFive':
        handleHighFive(event.x, event.y);
        break;
      case 'finish':
        handleFinish();
        break;
    }
  }

  function stepBeat(seconds: number): void {
    if (game.phase === 'finished' || game.phase === 'highFive') return;
    beatIn -= seconds;
    if (beatIn > 0) return;
    // The beat quickens through the level, so the end feels like the end.
    const excitement = Math.min(1, game.clock / BOSS_AT);
    beatIn = game.storm > 0 ? 0.18 : 0.46 - excitement * 0.16;
    sounds.beatSound(Math.floor(beatStep / 4), beatStep % 2 === 0);
    beatStep += 1;
  }

  function stepRain(seconds: number): void {
    if (game.storm <= 0 || calm) return;
    rain -= seconds;
    if (rain > 0) return;
    rain = RAIN_GAP;
    stormRain(fx, view.width, view.height, view.unit);
  }

  function goldenTrail(): void {
    if (calm) return;
    const golden = game.aliens.find((alien) => alien.spawn.kind === 'goldie' && alien.laughing < 0);
    if (golden && Math.random() < 0.4) {
      const spot = px(golden.x, golden.y);
      sparkle(fx, spot.x, spot.y, view.unit * 0.6, 1);
    }
  }

  /** Old tablets drop to fewer pixels, particles and stars rather than a jerky game. */
  function watchSpeed(seconds: number): void {
    if (slow) return;
    slowFor = seconds > SLOW_FRAME ? slowFor + seconds : Math.max(0, slowFor - seconds);
    if (slowFor < SLOW_SECONDS) return;
    slow = true;
    setLimit(fx.pool, SLOW_POOL_SIZE);
    canvas.dataset.slow = '1';
    fit();
  }

  function teachStars(): boolean {
    const teaching = starsLearned < STAR_LESSON && game.bits.length > 0 && game.phase !== 'highFive' && game.phase !== 'finished';
    if (teaching) {
      canvas.dataset.starHint = '1';
      if (!starLineSaid) {
        starLineSaid = true;
        shout(text().catchStars);
      }
    }
    return teaching;
  }

  function frame(now: number): void {
    const seconds = Math.min(LONGEST_FRAME, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    lineWait = Math.max(0, lineWait - seconds);
    for (const event of advance(game, seconds)) handle(event);
    stepBeat(seconds);
    stepRain(seconds);
    goldenTrail();
    hintLeft = moved ? Math.min(hintLeft, 0.5) - seconds : hintLeft - seconds;
    updateFx(fx, seconds);
    watchSpeed(seconds);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawFrame({
      ctx,
      view,
      game,
      theme,
      layers,
      fx,
      time: now / 1000,
      hint: Math.max(0, Math.min(1, hintLeft * 2)),
      starHint: teachStars(),
      highFive: text().highFive,
    });
    frameId = requestAnimationFrame(frame);
  }

  function aim(clientX: number): void {
    const box = canvas.getBoundingClientRect();
    setTarget(game, (clientX - box.left) / box.width);
    moved = true;
    canvas.dataset.moved = '1';
  }

  function onDown(event: PointerEvent): void {
    event.preventDefault();
    fingers.set(event.pointerId, event.clientX);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // A pointer can be gone by the time this runs, and steering still works without it.
    }
    aim(event.clientX);
    const box = canvas.getBoundingClientRect();
    sparkle(fx, event.clientX - box.left, event.clientY - box.top, view.unit * 0.7, 4);
    sounds.tapSound();
  }

  function lastFinger(): number | undefined {
    return [...fingers.values()].at(-1);
  }

  function onMove(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      aim(event.clientX);
      return;
    }
    if (!fingers.has(event.pointerId)) return;
    fingers.set(event.pointerId, event.clientX);
    // With two fingers down, the newest one drives.
    if ([...fingers.keys()].at(-1) === event.pointerId) aim(event.clientX);
  }

  function onUp(event: PointerEvent): void {
    fingers.delete(event.pointerId);
    const other = lastFinger();
    if (other !== undefined) aim(other);
  }

  function pushFromKeys(): void {
    const left = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    setPush(game, Number(right) - Number(left));
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (event.type === 'keydown') keys.add(event.key);
    else keys.delete(event.key);
    pushFromKeys();
    moved = true;
    canvas.dataset.moved = '1';
  }

  const ignore = (event: Event): void => event.preventDefault();
  const resize = new ResizeObserver(fit);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', ignore);
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  resize.observe(canvas);
  fit();
  canvas.dataset.phase = 'playing';
  canvas.dataset.level = options.levelId;
  canvas.dataset.speed = options.speedId;
  canvas.dataset.score = '0';

  void say(text().levels[options.levelId]);
  if (!hintSpoken) {
    hintSpoken = true;
    void say(text().hint, { queue: true });
  } else {
    void say(text().go, { queue: true });
  }
  frameId = requestAnimationFrame(frame);

  return {
    stop(): void {
      cancelAnimationFrame(frameId);
      clearTimeout(finishTimer);
      resize.disconnect();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      stopSpeaking();
      stage.remove();
    },
    line: () => text().hint,
  };
}
