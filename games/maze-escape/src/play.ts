import { burst, say, speak } from '@playroom/kit';
import { trailTiles, updateGuide } from './guide.ts';
import type { Controls } from './input.ts';
import { laserCharge, sensorState } from './hazards.ts';
import type { Level } from './level.ts';
import { text } from './lang/index.ts';
import { TREASURES, showLost, showResult } from './screens.ts';
import { newRun, retryRun, runStars, stepRun, type Cause, type Run, type RunEvent } from './run.ts';
import { distance, tileCentre, type Point } from './grid.ts';
import { alertSound, boxSound, chargeSound, discoSound, goSound, lostHimSound, plateSound, pressSound, safeSound, seenSound, shotSound, treasureSound, waitSound, winSound, zapSound } from './sounds.ts';
import { element } from './ui.ts';
import { BOX_S, VIEW_RADIUS } from './tuning.ts';
import type { View } from './view.ts';

/** Time for the door to burst and the confetti to fly before the card comes up. */
const RESULT_AFTER_S = 1.25;
/** Time to enjoy the zap and puff before the button comes up. */
const LOST_AFTER_S = 0.45;
const HINT_DONE_S = 1.4;
const HINT_REST_S = 5;
const HINT_REACH_PX = 96;
const GO_SHOWN_S = 1.2;

export interface PlayOptions {
  host: HTMLElement;
  view: View;
  controls: Controls;
  level: Level;
  calm: () => boolean;
  /** The level to play next, with any help it has earned. */
  levelNow: () => Level;
  /** Draws a level that has changed. */
  rebuild: (level: Level) => void;
  onLoss: () => void;
  onWin: (stars: number) => void;
  /** Says whether this treasure is a new find. */
  onTreasure: () => boolean;
  onNext: () => void;
}

export interface PlayScreen {
  frame(seconds: number, clock: number): void;
  run(): Run;
  /** The line the 🔊 button repeats. */
  line(): string;
  redraw(): void;
  stop(): void;
}

interface Hud {
  root: HTMLElement;
  flash: HTMLElement;
  meter: HTMLElement;
  meterFill: HTMLElement;
  hint: HTMLElement;
  dot: HTMLElement;
  sign: HTMLElement;
}

function buildHud(): Hud {
  const root = element('div', 'hud');
  const flash = element('div', 'seen-flash');
  const meter = element('div', 'box-meter');
  meter.textContent = '📦';
  const meterFill = element('span', 'box-fill');
  meter.append(meterFill);
  meter.hidden = true;
  const hint = element('div', 'hint');
  const hand = element('span', 'hint-hand');
  hand.textContent = '👆';
  hint.append(element('span', 'hint-ripple'), hand);
  hint.hidden = true;
  const dot = element('div', 'finger-dot');
  dot.hidden = true;
  const sign = element('div', 'wait-badge');
  sign.hidden = true;
  root.append(flash, meter, hint, dot, sign);
  return { root, flash, meter, meterFill, hint, dot, sign };
}

export function startPlay(options: PlayOptions): PlayScreen {
  const { host, view, controls, calm } = options;
  let { level } = options;
  const hud = buildHud();
  host.append(hud.root);
  let run = newRun(level);
  let closeCard: () => void = () => {};
  let cardIn: number | null = null;
  let movedFor = 0;
  let idleFor = 0;
  let foundNew: string | null = null;
  let spokeNotice = false;
  let saidWait = false;
  let goShown = 0;
  let spokenGo = -1;
  let lastCharge = level.lasers.map(() => 0);
  let lastPlate = level.sensors.map(() => 'off');
  let line = text().ideas[level.data.idea];

  view.restart(run);
  void say(line, { queue: true });
  controls.onPress(pressed);

  function pressed(): void {
    if (run.phase === 'play') pressSound();
  }

  function retry(): void {
    closeCard();
    closeCard = () => {};
    cardIn = null;
    controls.release();
    const next = options.levelNow();
    if (next.help !== level.help) options.rebuild(next);
    level = next;
    run = retryRun(run, next);
    lastCharge = level.lasers.map(() => 0);
    view.restart(run);
    spokeNotice = false;
    line = text().ideas[level.data.idea];
  }

  function showCardNow(): void {
    cardIn = null;
    controls.release();
    if (run.phase === 'lost') {
      const cause: Cause = run.cause ?? 'robot';
      line = text().lost[cause];
      closeCard = showLost(host, cause, retry);
      return;
    }
    const stars = runStars(run);
    line = [text().stars1, text().stars2, text().stars3][stars - 1] ?? text().stars1;
    closeCard = showResult(host, { stars, newTreasure: foundNew, last: level.id >= 12, onNext: options.onNext });
  }

  function heard(event: RunEvent): void {
    const near = (spot: Point): boolean => distance(spot, run) <= VIEW_RADIUS + 1;
    switch (event.type) {
      case 'noticed':
        alertSound();
        if (!spokeNotice) speak(text().noticed);
        spokeNotice = true;
        break;
      case 'gave-up':
        lostHimSound();
        break;
      case 'seen':
        seenSound();
        break;
      case 'shot':
        if (near(level.lasers[event.laser]?.from ?? { x: -99, y: -99 })) shotSound();
        break;
      case 'box':
        boxSound();
        speak(text().box);
        break;
      case 'disco':
        discoSound();
        speak(text().disco);
        break;
      case 'treasure': {
        treasureSound();
        speak(text().treasure);
        const spot = view.onPage(run);
        burst(spot.x, spot.y, 24);
        if (options.onTreasure()) foundNew = TREASURES[level.id] ?? null;
        break;
      }
      case 'checkpoint':
        safeSound();
        speak(text().checkpoint);
        break;
      case 'wait':
        waitSound();
        if (!saidWait) void say(text().wait, { queue: true });
        saidWait = true;
        break;
      case 'go':
        goSound();
        if (run.leg !== spokenGo) speak(text().go);
        spokenGo = run.leg;
        goShown = GO_SHOWN_S;
        break;
      case 'won':
        winSound();
        view.won(run, calm());
        options.onWin(runStars(run));
        cardIn = RESULT_AFTER_S;
        break;
      case 'lost':
        zapSound();
        view.lost(run, calm());
        options.onLoss();
        cardIn = LOST_AFTER_S;
        break;
    }
  }

  /** A small rhythm section: nearby plates and lasers tick so the timing can be heard as well as seen. */
  function listen(): void {
    level.lasers.forEach((laser, index) => {
      const charge = laserCharge(laser, run.t);
      if (charge > 0 && (lastCharge[index] ?? 0) === 0 && distance(laser.from, run) <= VIEW_RADIUS) chargeSound();
      lastCharge[index] = charge;
    });
    level.sensors.forEach((sensor, index) => {
      const state = sensorState(sensor, run.t);
      const spot = tileCentre(level.grid, sensor.tiles[0] ?? 0);
      if (state === 'on' && lastPlate[index] !== 'on' && distance(spot, run) <= VIEW_RADIUS) plateSound();
      lastPlate[index] = state;
    });
  }

  function drawHint(seconds: number): void {
    if (level.id !== 1 || run.phase !== 'play') {
      hud.hint.hidden = true;
      return;
    }
    const moving = run.moving;
    movedFor += moving ? seconds : 0;
    idleFor = moving ? 0 : idleFor + seconds;
    const show = movedFor < HINT_DONE_S ? !moving : idleFor > HINT_REST_S;
    hud.hint.hidden = !show;
    if (!show) return;
    const next = trailTiles(run, 1)[0];
    if (next === undefined) return;
    const ahead = tileCentre(level.grid, next);
    const from = view.onPage(run);
    const to = view.onPage(ahead);
    const gap = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const x = from.x + ((to.x - from.x) / gap) * HINT_REACH_PX;
    const y = from.y + ((to.y - from.y) / gap) * HINT_REACH_PX;
    hud.hint.style.transform = `translate(${x}px, ${y}px)`;
  }

  function drawSign(seconds: number): void {
    goShown = Math.max(0, goShown - seconds);
    const waiting = run.atSign >= 0 && run.leg <= run.atSign && run.phase === 'play';
    hud.sign.hidden = !waiting && goShown === 0;
    hud.sign.textContent = waiting ? '✋' : '🏃';
    hud.sign.classList.toggle('wait-go', !waiting);
  }

  function drawHud(seconds: number): void {
    drawSign(seconds);
    const seen = run.seenFor > 0 && run.phase === 'play';
    hud.flash.classList.toggle('seen-on', seen);
    hud.meter.hidden = run.boxLeft <= 0;
    hud.meterFill.style.transform = `scaleX(${run.boxLeft / BOX_S})`;
    const finger = controls.finger();
    hud.dot.hidden = !finger;
    if (finger) hud.dot.style.transform = `translate(${finger.x}px, ${finger.y}px)`;
  }

  return {
    frame(seconds, clock) {
      if (run.phase === 'play') {
        stepRun(run, controls.read(run, view.onPage(run), view.floorAt, seconds), seconds);
        updateGuide(run, seconds);
        listen();
      }
      for (const event of run.events.splice(0)) heard(event);
      view.update(run, clock, seconds, calm());
      drawHud(seconds);
      drawHint(seconds);
      if (cardIn !== null) {
        cardIn -= seconds;
        if (cardIn <= 0) showCardNow();
      }
    },
    run: () => run,
    line: () => line,
    redraw() {
      if (run.phase === 'play') {
        line = text().ideas[level.data.idea];
      } else if (cardIn === null) {
        closeCard();
        showCardNow();
      }
    },
    stop() {
      closeCard();
      hud.root.remove();
    },
  };
}
