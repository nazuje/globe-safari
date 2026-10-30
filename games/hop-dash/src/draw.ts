import { drawBackdrop, type Backdrop } from './backdrop.ts';
import { drawFx, type Fx } from './fx.ts';
import { groundAt } from './level.ts';
import type { Run } from './run.ts';
import { drawRunner, STANDING, type Pose } from './runnerArt.ts';
import type { RunnerId } from './runners.ts';
import { stamp } from './sprites.ts';
import { drawClues, drawHelper, drawItems, drawWorld, type Lens } from './things.ts';
import { SCOOP_SWOOP, SPIN_SECONDS, TUMBLE_SECONDS } from './tuning.ts';
import { WORLDS } from './worlds.ts';

const LEAST_WIDE = 370;
const LEAST_TALL = 330;
const MOST_SCALE = 2.3;
const LEAST_SCALE = 0.8;
const RUNNER_SPOT = 0.2;
const GROUND_FROM_BOTTOM = 0.25;
/** The runner stays below this share of the view, and the camera rises with a big bounce. */
const HIGHEST_SHARE = 0.68;
const CAMERA_EASE = 5;
const RUNNER_SIZE = 62;
const SCOOP_FROM_RIGHT = 500;
const SCOOP_FROM_UP = 340;

export interface View {
  width: number;
  height: number;
  dpr: number;
  scale: number;
  camX: number;
  /** The height at the bottom of the screen. */
  camY: number;
}

export function makeView(width: number, height: number, dpr: number): View {
  const scale = Math.max(LEAST_SCALE, Math.min(MOST_SCALE, Math.min(height / LEAST_TALL, width / LEAST_WIDE)));
  return { width, height, dpr, scale, camX: 0, camY: 0 };
}

function wantedCamY(view: View, run: Run): number {
  const tall = view.height / view.scale;
  const ground = groundAt(run.level, run.x + 60) ?? groundAt(run.level, run.x) ?? 0;
  const below = ground - tall * GROUND_FROM_BOTTOM;
  return Math.max(below, run.y - tall * HIGHEST_SHARE);
}

export function aimCamera(view: View, run: Run, seconds: number, snap: boolean): void {
  view.camX = run.x - (view.width / view.scale) * RUNNER_SPOT;
  const wanted = wantedCamY(view, run);
  view.camY = snap ? wanted : view.camY + (wanted - view.camY) * (1 - Math.exp(-CAMERA_EASE * seconds));
}

function lensFor(view: View, ctx: CanvasRenderingContext2D, run: Run, time: number, calm: boolean, shakeX: number): Lens {
  const { scale, camX, camY, height, width } = view;
  return {
    ctx,
    dpr: view.dpr,
    scale,
    x: (x) => (x - camX) * scale + shakeX,
    y: (y) => height - (y - camY) * scale,
    left: camX,
    right: camX + width / scale,
    time,
    world: WORLDS[run.level.world],
    calm,
  };
}

function poseOf(run: Run, fx: Fx, calm: boolean): Pose {
  let angle = 0;
  if (run.spin > 0 && !calm) angle = (1 - run.spin / SPIN_SECONDS) * Math.PI * 2;
  if (run.tumble > 0) angle = (1 - run.tumble / TUMBLE_SECONDS) * Math.PI * (calm ? 0.3 : 4);
  const stretch = fx.stretch;
  const air = run.on === -1;
  return {
    stride: fx.stride,
    air,
    rising: run.vy > 0,
    scaleX: 1 - stretch * 0.8,
    scaleY: 1 + stretch,
    angle,
    cheer: run.finished,
  };
}

function drawRocketFlames(lens: Lens, x: number, y: number, time: number): void {
  const { ctx, scale } = lens;
  const flicker = 0.75 + Math.sin(time * 40) * 0.25;
  ctx.fillStyle = '#ff9d3c';
  ctx.beginPath();
  ctx.moveTo(x - 16 * scale, y - 16 * scale);
  ctx.lineTo(x - 66 * scale * flicker, y - 4 * scale);
  ctx.lineTo(x - 16 * scale, y + 6 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe36b';
  ctx.beginPath();
  ctx.moveTo(x - 16 * scale, y - 10 * scale);
  ctx.lineTo(x - 42 * scale * flicker, y - 4 * scale);
  ctx.lineTo(x - 16 * scale, y + 1 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawRing(lens: Lens, fx: Fx): void {
  if (fx.ring <= 0) return;
  const { ctx, scale } = lens;
  ctx.strokeStyle = `rgba(255,255,255,${fx.ring})`;
  ctx.lineWidth = 5 * scale;
  ctx.beginPath();
  ctx.ellipse(lens.x(fx.ringX), lens.y(fx.ringY), (1 - fx.ring + 0.3) * 62 * scale, (1 - fx.ring + 0.3) * 20 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTheRunner(lens: Lens, run: Run, id: RunnerId, fx: Fx): void {
  const x = lens.x(run.x);
  const y = lens.y(run.y);
  const size = RUNNER_SIZE * lens.scale;
  // Blinks while nothing can touch it, so the child can see that.
  const blink = run.safe > 0 && run.tumble <= 0 && run.scoop === null && Math.floor(lens.time * 12) % 2 === 0;
  if (run.rocketTo !== null) drawRocketFlames(lens, x, y, lens.time);
  if (blink) lens.ctx.globalAlpha = 0.62;
  drawRunner(lens.ctx, id, x, y, size, poseOf(run, fx, lens.calm));
  lens.ctx.globalAlpha = 1;
  if (run.tumble > 0) {
    const around = lens.time * 9;
    for (let i = 0; i < 3; i++) {
      const spin = around + (i * Math.PI * 2) / 3;
      stamp(lens.ctx, lens.dpr, '💫', x + Math.cos(spin) * 24 * lens.scale, y - size - 2 * lens.scale + Math.sin(spin) * 7 * lens.scale, 16 * lens.scale);
    }
  }
}

function drawScoop(lens: Lens, run: Run): void {
  const { scoop } = run;
  if (!scoop) return;
  const share = Math.min(1, scoop.age / SCOOP_SWOOP);
  const swoop = (1 - share) ** 2;
  const x = lens.x(run.x) + swoop * SCOOP_FROM_RIGHT * lens.scale;
  const lift = scoop.helper === 'stork' ? 70 : -10;
  const y = lens.y(run.y + lift) - swoop * SCOOP_FROM_UP * lens.scale;
  drawHelper(lens, scoop.helper, x, y);
}

export interface LeavingHelper {
  helper: 'stork' | 'cloud';
  x: number;
  y: number;
  age: number;
}

function drawLeaving(lens: Lens, leaving: LeavingHelper | null): void {
  if (!leaving) return;
  drawHelper(lens, leaving.helper, lens.x(leaving.x + leaving.age * 420), lens.y(leaving.y + leaving.age * 260));
}

function drawScore(ctx: CanvasRenderingContext2D, view: View, run: Run, fx: Fx): void {
  const size = 22 * (1 + fx.scorePop * 0.3);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 118, 44, 22);
  ctx.fill();
  stamp(ctx, view.dpr, 'star', 34, 32, 24);
  ctx.fillStyle = '#2b2140';
  ctx.font = `600 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(run.score), 52, 33);
}

function drawProgress(ctx: CanvasRenderingContext2D, view: View, run: Run, id: RunnerId): void {
  const left = 146;
  const right = view.width - 28;
  const top = 32;
  const share = Math.min(1, run.x / run.level.flagX);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(right, top);
  ctx.stroke();
  ctx.strokeStyle = '#3ecf8e';
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + (right - left) * share, top);
  ctx.stroke();
  stamp(ctx, view.dpr, '🏁', right, top - 5, 24);
  drawRunner(ctx, id, left + (right - left) * share, top + 13, 32, STANDING);
}

export interface Hint {
  /** Show the big tap finger. */
  tap: boolean;
  /** Show the "again" finger next to the runner in the air. */
  again: boolean;
}

function drawHint(lens: Lens, view: View, run: Run, hint: Hint): void {
  const { ctx, dpr, scale, time } = lens;
  const pulse = (Math.sin(time * 7) + 1) / 2;
  if (hint.tap) {
    const x = view.width / 2;
    // On the ground strip, below the action, so it never covers what's coming.
    const spot = view.height * 0.88;
    const y = spot + (lens.calm ? 0 : pulse * 8);
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - pulse * 0.6})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, spot - 18, 26 + pulse * 18, 0, Math.PI * 2);
    ctx.stroke();
    stamp(ctx, dpr, '👆', x, y, 60);
  }
  if (hint.again) {
    const x = lens.x(run.x) + 58 * scale;
    const y = lens.y(run.y + 26) + (lens.calm ? 0 : pulse * 8);
    stamp(ctx, dpr, '👆', x, y, 42 * scale);
  }
}

export interface Frame {
  ctx: CanvasRenderingContext2D;
  view: View;
  backdrop: Backdrop;
  run: Run;
  fx: Fx;
  runner: RunnerId;
  time: number;
  calm: boolean;
  leaving: LeavingHelper | null;
  hint: Hint;
}

export function drawFrame({ ctx, view, backdrop, run, fx, runner, time, calm, leaving, hint }: Frame): void {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  const shakeX = calm ? 0 : Math.sin(time * 70) * fx.shake;
  const lens = lensFor(view, ctx, run, time, calm, shakeX);
  drawBackdrop(ctx, backdrop, view.width, view.height, view.dpr, lens.y(0), view.camX, view.scale, time);
  drawWorld(lens, run.level, run.squish, run.padAge);
  if (!run.foundTreasure) drawClues(lens, run.level);
  drawItems(lens, run.level, run.got, run.firstItem);
  drawRing(lens, fx);
  drawLeaving(lens, leaving);
  const carried = run.scoop?.helper === 'cloud';
  if (carried) drawScoop(lens, run);
  drawTheRunner(lens, run, runner, fx);
  if (!carried) drawScoop(lens, run);
  drawFx(fx, ctx, view.dpr, view.scale, lens.x, lens.y);
  drawScore(ctx, view, run, fx);
  drawProgress(ctx, view, run, runner);
  drawHint(lens, view, run, hint);
}

/** Where a collected thing flies to, in screen pixels. */
export const scoreSpot = { x: 34, y: 32 };
