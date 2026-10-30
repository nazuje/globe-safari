import { burst, say, speak, stopSpeaking } from '@playroom/kit';
import type { ObstacleKind, SpeedId } from './course.ts';
import { counterSpot, drawFrame, laneX, makeView, type View } from './draw.ts';
import { addBit, confetti, flyTo, makeFx, sparkle, updateFx } from './fx.ts';
import { text } from './lang/index.ts';
import { advance, COUNTDOWN, createRace, GIANT_STARS, steer, type RaceEvent } from './race.ts';
import type { Ride } from './rides.ts';
import type { Scene } from './scenery.ts';
import * as sounds from './sounds.ts';
import { showTrophy } from './trophy.ts';
import { element } from './ui.ts';

const MOST_DPR = 2;
const FINISH_PAUSE_MS = 1700;
/** A long stall (a hidden tab, a phone call) shouldn't jump the race ahead. */
const LONGEST_FRAME = 0.1;
const ARROW_SECONDS = 6;
const BONK_LINE_CHANCE = 0.3;

const BONK_BITS: Record<ObstacleKind, string> = {
  cow: '🐄',
  duck: 'duck',
  hay: '🌾',
  cone: 'cone',
  puddle: '💧',
};

/** The arrow lesson comes once a session in words; the pictures pulse every race. */
let hintSpoken = false;

export interface RaceOptions {
  ride: Ride;
  speed: SpeedId;
  scene: Scene;
  /** The star total at the start of this race. */
  stars: number;
  /** Called with the race's stars after every pickup, so leaving early loses nothing. */
  onStars: (earned: number) => void;
  onAgain: () => void;
  onPick: () => void;
}

export interface RaceScreen {
  stop: () => void;
  /** The line the 🔊 button repeats. */
  line: () => string;
  redraw: () => void;
}

function bonkBits(kind: ObstacleKind): number {
  return kind === 'puddle' || kind === 'hay' ? 8 : 1;
}

export function startRace(host: HTMLElement, options: RaceOptions): RaceScreen {
  const { ride, scene } = options;
  document.body.dataset.screen = 'race';
  const stage = element('section', 'stage');
  const canvas = element('canvas', 'road');
  stage.append(canvas);
  host.append(stage);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser has no 2D canvas');
  const ctx = context;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const race = createRace(options.speed, scene.obstacles, Math.random);
  const fx = makeFx();
  let view: View = makeView(1, 1, 1);
  let frameId = 0;
  let lastFrame = performance.now();
  let lastLight = -1;
  let arrowsLeft = ARROW_SECONDS + COUNTDOWN;
  const triedSides = new Set<number>();
  let trail = 0;
  let atTrophy = false;
  let redrawTrophy: (() => void) | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;

  function fit(): void {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(MOST_DPR, window.devicePixelRatio || 1);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    view = makeView(box.width, box.height, dpr);
  }

  function rideSpot(): { x: number; y: number } {
    return { x: laneX(view, race.x), y: view.rideY };
  }

  function collected(art: string, lane: number, size: number): void {
    const from = { x: laneX(view, lane), y: view.rideY };
    flyTo(fx, from, counterSpot(view), art, size);
    if (!calm) sparkle(fx, from.x, from.y, '✨', 4, view.lane * 0.7);
    fx.counterPop = 1;
    options.onStars(race.stars);
    canvas.dataset.stars = String(race.stars);
  }

  function handleBonk(kind: ObstacleKind): void {
    sounds.bonkSound(kind);
    const spot = rideSpot();
    fx.shake = view.lane * 0.2;
    const art = BONK_BITS[kind];
    const count = calm ? 1 : bonkBits(kind);
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      // The thing you hit goes flying off, which is the joke.
      addBit(fx, {
        x: spot.x,
        y: spot.y - view.lane * 0.3,
        vx: side * (view.lane * (1.5 + Math.random() * 2)),
        vy: -view.lane * (3 + Math.random() * 2),
        gravity: view.lane * 7,
        life: 0.95,
        size: view.lane * (count > 1 ? 0.4 : 0.8),
        art,
        spin: side * 9,
        shrink: false,
      });
    }
    if (Math.random() < BONK_LINE_CHANCE) {
      const lines = text().bonks;
      speak(lines[Math.floor(Math.random() * lines.length)] ?? lines[0]!);
    }
  }

  function handleFinish(): void {
    sounds.finishSound();
    confetti(fx, view.width, view.height, calm ? 24 : 150);
    const box = canvas.getBoundingClientRect();
    burst(box.left + box.width / 2, box.top + box.height * 0.45, 26);
    canvas.dataset.phase = 'finished';
    finishTimer = setTimeout(() => {
      atTrophy = true;
      redrawTrophy = showTrophy(stage, {
        earned: race.stars,
        before: options.stars,
        after: options.stars + race.stars,
        onAgain: options.onAgain,
        onPick: options.onPick,
      });
    }, FINISH_PAUSE_MS);
  }

  function handle(event: RaceEvent): void {
    switch (event.type) {
      case 'go':
        sounds.revSound();
        sounds.lightSound(true);
        canvas.dataset.phase = 'racing';
        if (!hintSpoken) {
          hintSpoken = true;
          void say(text().hint, { queue: true });
        }
        break;
      case 'star':
        sounds.starSound();
        collected('⭐', event.lane, view.lane * 0.5);
        break;
      case 'treat':
        sounds.treatSound();
        collected(event.art, event.lane, view.lane * 0.55);
        break;
      case 'bonk':
        handleBonk(event.kind);
        break;
      case 'giant': {
        sounds.giantSound();
        fx.counterPop = 1;
        const spot = rideSpot();
        sparkle(fx, spot.x, spot.y, '🌟', calm ? 4 : 14, view.lane * 2);
        for (let i = 0; i < Math.min(GIANT_STARS, 10); i++) flyTo(fx, { x: spot.x + i * 8, y: spot.y - i * 12 }, counterSpot(view), '⭐', view.lane * 0.5);
        options.onStars(race.stars);
        canvas.dataset.stars = String(race.stars);
        break;
      }
      case 'ramp':
        sounds.rampSound();
        speak(text().flying);
        canvas.dataset.flew = '1';
        break;
      case 'land':
        sounds.landSound();
        break;
      case 'ufo':
        sounds.ufoSound();
        speak(text().ufo);
        canvas.dataset.ufo = '1';
        break;
      case 'drop':
        sounds.dropSound();
        void say(text().giant, { queue: true });
        break;
      case 'finish':
        handleFinish();
        break;
    }
  }

  function dropTrail(seconds: number): void {
    if (calm || race.phase === 'countdown') return;
    trail -= seconds;
    if (trail > 0) return;
    trail = race.flight > 0 ? 0.05 : 0.14;
    const spot = rideSpot();
    addBit(fx, {
      x: spot.x + (Math.random() - 0.5) * view.lane * 0.3,
      y: spot.y + view.lane * 0.42,
      vx: (Math.random() - 0.5) * 20,
      vy: race.speed * view.lane * 0.8,
      life: 0.55,
      size: view.lane * 0.3,
      art: race.flight > 0 ? '⭐' : ride.trail,
    });
  }

  function beepLights(): void {
    if (race.phase !== 'countdown') return;
    const light = race.countdown > COUNTDOWN / 2 ? 0 : 1;
    if (light === lastLight) return;
    lastLight = light;
    sounds.lightSound(false);
  }

  function frame(now: number): void {
    const seconds = Math.min(LONGEST_FRAME, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    beepLights();
    for (const event of advance(race, seconds)) handle(event);
    dropTrail(seconds);
    if (race.phase !== 'countdown') arrowsLeft -= seconds;
    if (triedSides.size === 2) arrowsLeft = Math.min(arrowsLeft, 0.5);
    updateFx(fx, seconds);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawFrame({
      ctx,
      view,
      race,
      scene,
      ride,
      fx,
      time: now / 1000,
      arrows: Math.max(0, Math.min(1, arrowsLeft * 2)),
      calm,
    });
    frameId = requestAnimationFrame(frame);
  }

  function steerTo(direction: -1 | 1): void {
    fx.flashSide = direction;
    fx.flash = 1;
    triedSides.add(direction);
    if (steer(race, direction) === 'moved') {
      fx.lean = direction * 0.35;
      sounds.laneSound(ride.pitch);
      canvas.dataset.lane = String(race.lane);
    } else {
      // The road's edge bounces you back with a little wiggle.
      fx.lean = -direction * 0.3;
      sounds.edgeSound();
    }
    const spot = rideSpot();
    if (!calm) sparkle(fx, spot.x, spot.y + view.lane * 0.3, '💨', 3, view.lane * 0.6);
  }

  function onPointer(event: PointerEvent): void {
    event.preventDefault();
    const box = canvas.getBoundingClientRect();
    steerTo(event.clientX - box.left < box.width / 2 ? -1 : 1);
  }

  function onKey(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (event.key === 'ArrowLeft') steerTo(-1);
    if (event.key === 'ArrowRight') steerTo(1);
  }

  const ignore = (event: Event): void => event.preventDefault();
  const resize = new ResizeObserver(fit);

  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('contextmenu', ignore);
  window.addEventListener('keydown', onKey);
  resize.observe(canvas);
  fit();
  canvas.dataset.lane = '1';
  canvas.dataset.stars = '0';
  canvas.dataset.phase = 'countdown';
  canvas.dataset.scene = scene.id;

  void say(text().rides[ride.id]);
  void say(text().start, { queue: true });
  frameId = requestAnimationFrame(frame);

  return {
    stop(): void {
      cancelAnimationFrame(frameId);
      clearTimeout(finishTimer);
      resize.disconnect();
      window.removeEventListener('keydown', onKey);
      stopSpeaking();
      stage.remove();
    },
    line: () => (atTrophy ? text().cheers[0]! : text().hint),
    redraw: () => redrawTrophy?.(),
  };
}
