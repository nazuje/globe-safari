import { speak } from '@playroom/kit';
import { clamp, type Course } from './course.ts';
import { newFlight, ringNow, stepFlight, type Flight, type FlightEvent } from './flight.ts';
import type { Steering } from './input.ts';
import { text } from './lang/index.ts';
import * as sound from './sounds.ts';
import { screenFromSteer } from './steering.ts';
import { element } from './ui.ts';
import type { View } from './view.ts';

const WAIT_AFTER_LANDING_S = 0.9;
const HINT_AGAIN_AFTER_S = 8;
const QUIET_AFTER_SPEAKING_S = 3;
const SILLY_FACES = ['🙈', '🤪', '😜', '🫣'];
/** Where the hand may go, from -1 to 1: clear of the score and the very edges. */
const HINT_X = 0.8;
const HINT_TOP = -0.62;
const HINT_BOTTOM = 0.82;
const HINT_CLEAR_PX = 130;
const HINT_RADIUS_PX = 54;

export interface PlayOptions {
  host: HTMLElement;
  view: View;
  steering: Steering;
  course: Course;
  onLanded: (flight: Flight) => void;
}

export interface PlayScreen {
  flight: Flight;
  /** Moves the game on by one frame. */
  frame(seconds: number, time: number): void;
  stop(): void;
}

interface Hud {
  root: HTMLElement;
  score: HTMLElement;
  chain: HTMLElement;
  progress: HTMLElement;
  hint: HTMLElement;
  hand: HTMLElement;
  guide: HTMLElement;
  dot: HTMLElement;
}

function buildHud(host: HTMLElement): Hud {
  const root = element('div', 'hud');
  const score = element('div', 'hud-score');
  const chain = element('div', 'hud-chain');
  chain.hidden = true;
  const track = element('div', 'hud-track');
  const progress = element('div', 'hud-progress');
  const goal = element('span', 'hud-goal');
  goal.textContent = '☁️';
  track.append(progress, goal);
  const guide = element('div', 'hud-guide');
  const hint = element('div', 'hud-hint');
  const hand = element('span', 'hud-hand');
  hand.textContent = '👆';
  hint.append(hand);
  const dot = element('div', 'hud-dot');
  dot.hidden = true;
  root.append(score, track, chain, guide, hint, dot);
  host.append(root);
  return { root, score, chain, progress, hint, hand, guide, dot };
}

function bubble(host: HTMLElement, x: number, y: number, words: string): void {
  const made = element('div', 'bubble');
  made.textContent = words;
  made.style.left = `${x * 100}%`;
  made.style.top = `${y * 100}%`;
  made.addEventListener('animationend', () => made.remove());
  window.setTimeout(() => made.remove(), 1500);
  host.append(made);
}

export function startFlight({ host, view, steering, course, onLanded }: PlayOptions): PlayScreen {
  const flight = newFlight(course);
  const hud = buildHud(host);
  let lastSpoke = -QUIET_AFTER_SPEAKING_S;
  let lastSteered = 0;
  let steered = false;
  let landedFor = 0;
  let saidBless = false;
  let saidCatch = false;
  let misses = 0;
  let ended = false;

  function talk(line: string, force = false): void {
    if (!force && flight.time - lastSpoke < QUIET_AFTER_SPEAKING_S) return;
    lastSpoke = flight.time;
    speak(line);
  }

  function chainPraise(chain: number): void {
    if (chain === 5) talk(text().chain5);
    else if (chain === 10) talk(text().chain10);
    else if (chain === 20) talk(text().chain20);
  }

  function pop(event: Extract<FlightEvent, { type: 'ring' | 'star' | 'arch' }>): void {
    const at = view.flyerOnScreen();
    if (event.type !== 'star') bubble(hud.root, at.x, at.y - 0.1, `+${event.points}`);
  }

  function laughOff(index: number, streak: number): void {
    sound.missSound();
    view.ringMissed(index, flight);
    const at = view.ringOnScreen(index, 0, 0);
    if (at) bubble(hud.root, at.x, at.y, SILLY_FACES[misses % SILLY_FACES.length] ?? '🙈');
    misses += 1;
    if (streak < 2 || saidCatch) return;
    saidCatch = true;
    talk(text().catchMe);
  }

  function react(event: FlightEvent): void {
    switch (event.type) {
      case 'ring':
        sound.ringSound(event.chain);
        view.ringTaken(event.index, flight);
        chainPraise(event.chain);
        pop(event);
        break;
      case 'star':
        sound.starSound();
        view.starTaken(event.index);
        break;
      case 'arch':
        sound.archSound();
        view.splash([0xff5a6e, 0xffd93c, 0x3ecf8e, 0x4cb8ff], 16);
        pop(event);
        break;
      case 'bump': {
        sound.sneezeSound();
        view.bumped(event.arch ? 'arch' : event.kind, event.index);
        view.sneeze();
        const at = view.flyerOnScreen();
        bubble(hud.root, at.x, at.y - 0.12, text().achoo);
        if (!saidBless) talk(text().blessYou, true);
        saidBless = true;
        break;
      }
      case 'tunnelIn':
        sound.tunnelSound();
        talk(text().tunnel, true);
        break;
      case 'tunnelOut':
        view.splash([0xff5a6e, 0xff9f43, 0xffd93c, 0x3ecf8e, 0x4cb8ff, 0xa77bff], 30);
        break;
      case 'surprise':
        if (event.kind === 'whale') {
          view.whale(flight.s);
          sound.whaleSound();
          talk(text().whale, true);
        } else {
          sound.birdSound();
          talk(text().birds, true);
        }
        break;
      case 'approach':
        talk(text().approach, true);
        break;
      case 'bounce':
        sound.bounceSound(event.hop);
        view.splash([0xffffff, 0xffe27a, 0xffc0e0], 14 - event.hop * 4);
        break;
      case 'landed':
        sound.landedSound();
        break;
      case 'miss':
        laughOff(event.index, event.streak);
        break;
    }
  }

  function drawHud(): void {
    hud.score.textContent = `⭐ ${flight.score}`;
    hud.chain.hidden = flight.chain < 2;
    hud.chain.textContent = `🎵 ${flight.chain}`;
    hud.progress.style.width = `${Math.min(flight.s / course.length, 1) * 100}%`;
    const finger = steering.touch();
    hud.dot.hidden = !finger;
    if (finger) {
      const box = hud.root.getBoundingClientRect();
      hud.dot.style.transform = `translate(${finger.x - box.left}px, ${finger.y - box.top}px)`;
    }
  }

  /** The hand sits where a finger would send the flyer to the next ring, and points at that ring. */
  function pointAtRing(): void {
    const ring = course.rings[flight.nextRing];
    if (!ring) return;
    const now = ringNow(flight, ring);
    const spot = screenFromSteer(now.u, now.v, view.span());
    const box = hud.root.getBoundingClientRect();
    const flyer = view.flyerOnScreen();
    const flyerX = flyer.x * box.width;
    const flyerY = flyer.y * box.height;
    let handX = (clamp(spot.x, -HINT_X, HINT_X) + 1) * 0.5 * box.width;
    let handY = (clamp(spot.y, HINT_TOP, HINT_BOTTOM) + 1) * 0.5 * box.height;
    const offFlyer = Math.hypot(handX - flyerX, handY - flyerY);
    if (offFlyer < HINT_CLEAR_PX) {
      // Sits beside the flyer rather than hiding it.
      const side = now.u >= flight.u ? 1 : -1;
      handX = flyerX + side * HINT_CLEAR_PX;
      handY = flyerY;
    }
    const at = view.ringOnScreen(flight.nextRing, now.u - ring.u, now.v - ring.v);
    const ringX = (at?.x ?? 0.5) * box.width;
    const ringY = (at?.y ?? 0.4) * box.height;
    const turn = Math.atan2(ringX - handX, handY - ringY);
    hud.hint.style.transform = `translate(${handX}px, ${handY}px)`;
    hud.hand.style.setProperty('--turn', `${turn}rad`);
    hud.guide.style.width = `${Math.max(Math.hypot(ringX - handX, ringY - handY) - HINT_RADIUS_PX, 0)}px`;
    hud.guide.style.transform = `translate(${handX}px, ${handY}px) rotate(${turn - Math.PI / 2}rad) translateX(${HINT_RADIUS_PX}px)`;
  }

  function watchHint(active: boolean): void {
    if (active) {
      steered = true;
      lastSteered = flight.time;
    }
    const idle = !steered || flight.time - lastSteered > HINT_AGAIN_AFTER_S;
    const show = (flight.rings === 0 || idle) && flight.phase === 'flying' && !flight.inTunnel;
    hud.hint.hidden = !show;
    hud.guide.hidden = !show;
    if (show) pointAtRing();
  }

  steering.onPress(() => {
    if (flight.phase === 'flying') sound.touchSound();
  });
  drawHud();
  talk(text().steer, true);

  return {
    flight,
    frame(seconds, time) {
      const steer = steering.read();
      for (const event of stepFlight(flight, steer, seconds)) react(event);
      watchHint(steer !== null);
      drawHud();
      view.update(flight, time, seconds);
      if (flight.phase !== 'landed' || ended) return;
      landedFor += seconds;
      if (landedFor < WAIT_AFTER_LANDING_S) return;
      ended = true;
      onLanded(flight);
    },
    stop() {
      ended = true;
      steering.onPress(() => {});
      hud.root.remove();
    },
  };
}
