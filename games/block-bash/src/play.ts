import { playNote, playSound, say, speak, stopSpeaking, store } from '@playroom/kit';
import type { Stage } from '@playroom/stage3d';
import { Raycaster, Vector2, Vector3 } from 'three';
import { add as addPoint, type Point } from './aim.ts';
import { BALL_IDS, cleanBall, type BallId } from './balls.ts';
import { createBallsView } from './ballsView.ts';
import { createBlocksView } from './blocksView.ts';
import { createCard, type CardChoice, type CardContent } from './card.ts';
import { createFx } from './fx.ts';
import { createHud } from './hud.ts';
import { text } from './lang/index.ts';
import { LEVELS, topPlainBlock, type Level } from './levels.ts';
import { createMouse } from './mouse.ts';
import type { WorldEvent } from './physics.ts';
import { createPicker, type PickerState } from './picker.ts';
import { ballsLeft, canThrow } from './round.ts';
import {
  bonusUnlocked,
  cleanBest,
  cleanCount,
  DIFFICULTIES,
  recordBest,
  starGoals,
  starsFor,
  type Difficulty,
} from './scoring.ts';
import {
  playBallHit,
  playGiggle,
  playHits,
  playPop,
  playSlowMotion,
  playSoftTap,
  playSqueak,
  playThrow,
  playWaveComing,
  playWaveThump,
  playWhoa,
  stopSounds,
  type Hit,
} from './sounds.ts';
import { createStepper, FIXED_STEP_S } from './stepper.ts';
import { mouseVisits, SLOW_MOTION_S, startsSlowMotion, timeScale } from './surprises.ts';
import { createTurn, type Turn, type TurnEvent } from './turn.ts';
import { bothHaveGone, newTally, nextLevel as tallyNextLevel, turnFinished } from './tally.ts';
import { frameStructure, swayAngle } from './view.ts';
import { buildWorld } from './world3d.ts';

const LEVEL_KEY = 'block-bash:level';
const BALL_KEY = 'block-bash:ball';
const DIFFICULTY_KEY = 'block-bash:difficulty';
const BEST_KEY = 'block-bash:best';
const CRASHES_KEY = 'block-bash:crashes';

const FLYING_SPEED = 5;
const HINT_AFTER_S = 1.2;
const BUMP_DECAY = 7;
const KEY_AIM_STEP = 0.07;
const HIT_LOOK_FOR_S = 1.8;
const LAUGH_WOBBLE = 0.45;

export interface Controls {
  /** Opens the level screen, or closes it if it's open. */
  togglePicker(): void;
  retry(): void;
  /** Says whatever the child most needs to hear right now. */
  sayLine(): void;
  redraw(): void;
  stop(): void;
}

export interface DevHooks {
  state(): Record<string, unknown>;
  forceMouse(): void;
  go(index: number): void;
  /** Plays this much game time at once, whatever speed the machine draws at. */
  run(seconds: number): void;
  throwAtMiddle(): void;
  settleCount(): number;
}

function savedLevel(): number {
  const saved = cleanCount(store.get<unknown>(LEVEL_KEY, 0));
  return saved < LEVELS.length && !(LEVELS[saved] as Level).bonus ? saved : 0;
}

function savedDifficulty(): Difficulty {
  const saved = store.get<unknown>(DIFFICULTY_KEY, 'easy');
  return DIFFICULTIES.find((difficulty) => difficulty === saved) ?? 'easy';
}

const point = (v: Vector3): Point => ({ x: v.x, y: v.y, z: v.z });

/** The game itself: it owns the turn, feeds taps to the physics and turns what happens into sound and pictures. */
export function startPlay(stage: Stage, app: HTMLElement, reducedMotion: () => boolean): Controls & { dev: DevHooks } {
  const { scene, camera, canvas } = stage;
  const scenery = buildWorld(scene);
  const blocksView = createBlocksView(scene);
  const ballsView = createBallsView(scene);
  const fx = createFx(scene);
  const mouse = createMouse(scene);
  const stepper = createStepper();
  const raycaster = new Raycaster();

  let ball = cleanBall(store.get<unknown>(BALL_KEY, 'bowling'));
  let difficulty = savedDifficulty();
  let best = cleanBest(store.get<unknown>(BEST_KEY, {}));
  let crashes = cleanCount(store.get<unknown>(CRASHES_KEY, 0));
  let players: 1 | 2 = 1;
  let tally = newTally();
  let levelIndex = savedLevel();
  let level = LEVELS[levelIndex] as Level;
  let turn: Turn = createTurn(level, difficulty);

  let swayClock = 0;
  let cameraDistance = 0;
  let bump = 0;
  let idleFor = 0;
  let thrownEver = false;
  let saidWhoa = false;
  let heavyHitDone = false;
  let throwsSinceSlowMotion = 3;
  let slowMotionFor: number | null = null;
  let turnsSinceMouse = 2;
  let forceMouse = false;
  let cardContent: CardContent | null = null;
  let keyAim: { x: number; y: number } | null = null;
  let lookingForHit = 0;
  let flying = 0;

  const hud = createHud(app, chooseBall);
  const card = createCard(app, onCard, reducedMotion);
  const picker = createPicker(app, {
    onLevel(index) {
      picker.close();
      tally = tallyNextLevel(tally);
      goTo(index, true);
    },
    onDifficulty(choice) {
      difficulty = choice;
      store.set(DIFFICULTY_KEY, choice);
      goTo(levelIndex, false);
      picker.redraw(pickerState());
    },
    onPlayers(count) {
      players = count;
      tally = newTally();
      goTo(levelIndex, false);
      picker.redraw(pickerState());
    },
  });

  function pickerState(): PickerState {
    return { difficulty, players, best, bonusOpen: bonusUnlocked(crashes), current: levelIndex };
  }

  function drawMeter(): void {
    const round = turn.round();
    hud.meter({ fallen: round.fallen, goals: starGoals(round.base, difficulty, level.sturdy), ballsLeft: ballsLeft(round) });
  }

  function chooseBall(id: BallId): void {
    ball = id;
    store.set(BALL_KEY, id);
    hud.showBall(id);
    playSoftTap();
    speak(text().balls[id]);
  }

  function goTo(index: number, announce: boolean): void {
    levelIndex = index;
    level = LEVELS[index] as Level;
    turn = createTurn(level, difficulty);
    stepper.reset();
    if (!level.bonus) store.set(LEVEL_KEY, index);
    scenery.setTable(turn.half, index);
    blocksView.load(level, reducedMotion());
    blocksView.sync(turn.world.blocks, 0, turn.half);
    ballsView.clear();
    fx.clear();
    card.hide();
    cardContent = null;
    hud.tray(true);
    hud.flashSlowMotion(false);
    slowMotionFor = null;
    saidWhoa = false;
    idleFor = 0;
    lookingForHit = 0;
    drawMeter();
    hud.tally(players === 2 ? tally : null);
    if (announce) speak(players === 2 ? text().turns[tally.turn] : text().levels[level.id]);
    placeMouse();
  }

  function placeMouse(): void {
    mouse.leave();
    turnsSinceMouse += 1;
    if (!forceMouse && !mouseVisits(Math.random(), turnsSinceMouse)) return;
    const top = turn.world.blocks[topPlainBlock(level)];
    if (!top) return;
    forceMouse = false;
    turnsSinceMouse = 0;
    mouse.sitOn(top);
    playSqueak();
    void say(text().mouse, { queue: true });
  }

  function aimFrom(ndcX: number, ndcY: number): Point {
    raycaster.setFromCamera(new Vector2(ndcX, ndcY), camera);
    return turn.aim(point(raycaster.ray.origin), point(raycaster.ray.direction));
  }

  function throwAt(target: Point): void {
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    const from = addPoint(addPoint(point(camera.position), point(forward), 2.5), { x: 0, y: -1.2, z: 0 });
    turn.throwBall(ball, from, target);
    throwsSinceSlowMotion += 1;
    thrownEver = true;
    saidWhoa = false;
    heavyHitDone = false;
    lookingForHit = 0;
    idleFor = 0;
    hud.hideHint();
    hud.hideReticle();
    keyAim = null;
    playThrow();
    drawMeter();
  }

  function tryThrow(ndcX: number, ndcY: number): void {
    if (cardContent || picker.isOpen() || !canThrow(turn.round())) {
      playSoftTap();
      return;
    }
    throwAt(aimFrom(ndcX, ndcY));
  }

  function faceReacts(index: number): void {
    blocksView.scare(index);
    if (!saidWhoa) {
      saidWhoa = true;
      playWhoa();
      const lines = text().whoa;
      speak(lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '');
    } else {
      playGiggle();
    }
  }

  function onClack(event: Extract<WorldEvent, { type: 'clack' }>, hits: Hit[]): void {
    hits.push({ speed: event.speed, size: event.size, jelly: event.jelly });
    if (event.jelly) blocksView.wobble(event.index, 0.9);
    if (event.speed > 7) fx.dust(event.at, 2);
    if (event.byBall && !heavyHitDone) {
      heavyHitDone = true;
      playBallHit(event.byBall, event.speed);
      bump = reducedMotion() ? 0 : 0.1;
      lookingForHit = HIT_LOOK_FOR_S;
    }
    if (turn.world.blocks[event.index]?.spec.kind === 'face' && event.speed > 3) faceReacts(event.index);
  }

  function onDown(index: number): void {
    playNote(420 + turn.round().fallen * 16, { wave: 'sine', seconds: 0.07, gain: 0.25 });
    if (turn.world.blocks[index]?.spec.kind === 'face') playGiggle();
    drawMeter();
  }

  /** A throw that moved nothing makes the whole structure shake with laughter. */
  function onMiss(): void {
    turn.world.blocks.forEach((block, index) => {
      if (!block.down) blocksView.wobble(index, LAUGH_WOBBLE);
    });
    playGiggle();
    playSound('toot');
    speak(text().miss);
  }

  function onWave(): void {
    blocksView.wake();
    playWaveComing();
    drawMeter();
    speak(text().wave);
  }

  function onReady(lastBall: boolean): void {
    idleFor = 0;
    hud.lastBall(lastBall);
    if (lastBall) speak(text().lastBall);
  }

  function onTurnEvent(event: TurnEvent): void {
    if (event.type === 'bigCrash') bigCrash();
    else if (event.type === 'missed') onMiss();
    else if (event.type === 'wave') onWave();
    else if (event.type === 'ready') onReady(event.lastBall);
    else if (event.type === 'waveLanded') {
      playWaveThump();
      fx.dust(event.at, 8);
      bump = reducedMotion() ? 0 : 0.12;
    } else if (event.type === 'down') onDown(event.index);
    else if (event.type === 'pop') {
      playPop();
      fx.confetti(event.at, reducedMotion() ? 12 : 36);
      fx.dust(event.at, 4);
    } else if (event.type === 'stuck') playSound('dig');
  }

  function handle(events: readonly TurnEvent[]): void {
    const hits: Hit[] = [];
    for (const event of events) {
      if (event.type === 'clack') onClack(event, hits);
      else if (event.type === 'floorThud') {
        hits.push({ speed: event.speed, size: 2, jelly: false });
        if (event.speed > 6) fx.dust(event.at, 3);
      } else onTurnEvent(event);
    }
    if (hits.length > 0) playHits(hits);
  }

  function maybeSlowMotion(): void {
    if (lookingForHit <= 0 || slowMotionFor !== null || reducedMotion()) return;
    flying = turn.world.movingFast(FLYING_SPEED);
    if (!startsSlowMotion(flying, turn.round().base, throwsSinceSlowMotion)) return;
    slowMotionFor = 0;
    throwsSinceSlowMotion = 0;
    lookingForHit = 0;
    playSlowMotion();
    hud.flashSlowMotion(true);
  }

  function bigCrash(): void {
    crashes += 1;
    store.set(CRASHES_KEY, crashes);
    speak(text().bigCrash);
  }

  function bonusReady(): boolean {
    return bonusUnlocked(crashes) && !level.bonus;
  }

  function soloCard(stars: number, isNew: boolean, bestFallen: number): CardContent {
    return { kind: 'solo', fallen: turn.round().fallen, stars, best: bestFallen, isNew, bonus: bonusReady() };
  }

  function finishSolo(): void {
    const { fallen, base } = turn.round();
    const stars = starsFor(fallen, base, difficulty, level.sturdy);
    const key = `${level.id}:${difficulty}`;
    const recorded = recordBest(best, key, stars, fallen);
    best = recorded.best;
    store.set(BEST_KEY, best);
    showCard(soloCard(stars, recorded.isNew, best[key]?.fallen ?? 0));
    const words = text();
    speak(bonusReady() && bonusJustOpened() ? words.bonus : (words.cheers[stars] ?? words.cheers[0] ?? ''));
  }

  function finishTurn(): void {
    const player = tally.turn;
    const { fallen } = turn.round();
    tally = turnFinished(tally, fallen);
    hud.tally(tally);
    if (bothHaveGone(tally)) {
      showCard({ kind: 'both', tally, bonus: bonusReady() });
      speak(text().mess);
      return;
    }
    showCard({ kind: 'handover', player, fallen, next: tally.turn });
    speak(text().turns[tally.turn]);
  }

  let bonusAnnounced = bonusUnlocked(crashes);
  function bonusJustOpened(): boolean {
    const opened = !bonusAnnounced;
    bonusAnnounced = true;
    return opened;
  }

  function showCard(content: CardContent): void {
    cardContent = content;
    hud.tray(false);
    hud.hideHint();
    hud.hideReticle();
    card.show(content);
  }

  function finish(): void {
    turn.end();
    if (players === 2) finishTurn();
    else finishSolo();
  }

  function onCard(choice: CardChoice): void {
    if (choice === 'again') restart();
    else if (choice === 'turn') goTo(levelIndex, true);
    else if (choice === 'bonus') {
      tally = tallyNextLevel(tally);
      goTo(LEVELS.findIndex((candidate) => candidate.bonus), true);
    } else {
      tally = tallyNextLevel(tally);
      goTo(nextIndex(), true);
    }
  }

  function nextIndex(): number {
    const after = (levelIndex + 1) % LEVELS.length;
    return (LEVELS[after] as Level).bonus ? 0 : after;
  }

  /** After both players have gone, a restart is a fresh pair of turns, not a third one. */
  function restart(): void {
    if (bothHaveGone(tally)) tally = tallyNextLevel(tally);
    goTo(levelIndex, false);
  }

  function moveCamera(seconds: number): void {
    const busy = !turn.round().ready;
    swayClock += seconds * (busy ? 0.2 : 1);
    bump *= Math.exp(-BUMP_DECAY * seconds);
    const { bounds, half } = turn;
    const fit = frameStructure(bounds.height, half, camera.aspect, camera.fov);
    const wanted = fit.distance * (slowMotionFor === null ? 1 : 0.92);
    cameraDistance = cameraDistance === 0 ? wanted : cameraDistance + (wanted - cameraDistance) * Math.min(seconds * 3, 1);
    const angle = reducedMotion() ? 0.3 : swayAngle(swayClock);
    camera.position.set(
      bounds.middleX + Math.sin(angle) * cameraDistance,
      fit.height * (cameraDistance / fit.distance) + bump,
      Math.cos(angle) * cameraDistance,
    );
    camera.lookAt(bounds.middleX, fit.lookY, 0);
  }

  function screenOf(worldPoint: Vector3): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const seen = worldPoint.clone().project(camera);
    return { x: ((seen.x + 1) / 2) * rect.width, y: ((1 - seen.y) / 2) * rect.height };
  }

  function drawHint(seconds: number): void {
    idleFor += seconds;
    const wants = canThrow(turn.round()) && !cardContent && !picker.isOpen() && (!thrownEver || idleFor > HINT_AFTER_S);
    if (wants) {
      const spot = turn.bestSpot();
      const { x, y } = screenOf(new Vector3(spot.x, spot.y, spot.z));
      hud.hint(x, y);
    } else hud.hideHint();
    if (keyAim && !cardContent) {
      const rect = canvas.getBoundingClientRect();
      hud.reticle(((keyAim.x + 1) / 2) * rect.width, ((1 - keyAim.y) / 2) * rect.height);
    }
  }

  function advance(seconds: number): TurnEvent[] {
    const steps = stepper.stepsFor(seconds);
    const scale = slowMotionFor === null ? 1 : timeScale(slowMotionFor);
    const events: TurnEvent[] = [];
    for (let i = 0; i < steps; i += 1) events.push(...turn.step(FIXED_STEP_S * scale));
    if (slowMotionFor !== null) {
      slowMotionFor += seconds;
      if (slowMotionFor >= SLOW_MOTION_S) {
        slowMotionFor = null;
        hud.flashSlowMotion(false);
      }
    }
    return events;
  }

  function frame(seconds: number): void {
    handle(advance(seconds));
    lookingForHit = Math.max(lookingForHit - seconds, 0);
    maybeSlowMotion();
    if (turn.finished()) finish();
    if (mouse.update(seconds)) {
      playSqueak();
      void say(text().mouseRide, { queue: true });
    }
    blocksView.sync(turn.world.blocks, seconds, turn.half);
    ballsView.sync(turn.world.balls());
    fx.update(seconds * (slowMotionFor === null ? 1 : 0.4));
    moveCamera(seconds);
    drawHint(seconds);
  }

  function onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    hud.ripple(x, y);
    tryThrow((x / rect.width) * 2 - 1, 1 - (y / rect.height) * 2);
  }

  function pressAimKey(dx: number, dy: number): void {
    const start = keyAim ?? { x: 0, y: 0.1 };
    keyAim = {
      x: Math.min(Math.max(start.x + dx, -0.95), 0.95),
      y: Math.min(Math.max(start.y + dy, -0.95), 0.95),
    };
  }

  function onKey(event: KeyboardEvent): void {
    if (picker.isOpen()) {
      if (event.key === 'Escape') picker.close();
      return;
    }
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_AIM_STEP, 0],
      ArrowRight: [KEY_AIM_STEP, 0],
      ArrowUp: [0, KEY_AIM_STEP],
      ArrowDown: [0, -KEY_AIM_STEP],
    };
    const arrow = arrows[event.key];
    if (arrow) {
      event.preventDefault();
      pressAimKey(arrow[0], arrow[1]);
      return;
    }
    if (event.key === ' ' && !cardContent) {
      event.preventDefault();
      const aim = keyAim ?? { x: 0, y: 0.1 };
      tryThrow(aim.x, aim.y);
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      restart();
      return;
    }
    const numbered = BALL_IDS[Number(event.key) - 1];
    if (numbered) chooseBall(numbered);
  }

  function preventMenu(event: Event): void {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('contextmenu', preventMenu);
  document.addEventListener('keydown', onKey);
  hud.showBall(ball);
  stage.onFrame(frame);
  goTo(levelIndex, false);
  stage.start();

  return {
    togglePicker() {
      if (picker.isOpen()) picker.close();
      else {
        picker.open(pickerState());
        speak(text().pick);
      }
    },
    retry: restart,
    sayLine() {
      speak(picker.isOpen() ? text().pick : players === 2 ? text().turns[tally.turn] : text().hint);
    },
    redraw() {
      hud.redraw();
      card.redraw();
      picker.redraw(pickerState());
    },
    stop() {
      stage.stop();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('contextmenu', preventMenu);
      document.removeEventListener('keydown', onKey);
      stopSpeaking();
      stopSounds();
    },
    dev: {
      state: () => ({
        level: level.id,
        ball,
        ...turn.round(),
        card: cardContent?.kind ?? null,
        crashes,
        slowMotion: slowMotionFor !== null,
        flying,
        calls: stage.renderer.info.render.calls,
        triangles: stage.renderer.info.render.triangles,
        camera: point(camera.position),
      }),
      forceMouse() {
        forceMouse = true;
        goTo(levelIndex, false);
      },
      go: (index) => goTo(index, false),
      run(seconds) {
        for (let i = 0; i < seconds * 60; i += 1) frame(FIXED_STEP_S);
      },
      throwAtMiddle() {
        throwAt({ x: turn.bounds.middleX, y: turn.bounds.height * 0.5, z: 0 });
      },
      settleCount: () => turn.world.blocks.filter(({ body }) => body.sleepState === 2).length,
    },
  };
}
