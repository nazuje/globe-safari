import { COUNTDOWN, SPIN_SECONDS, type Race } from './race.ts';
import type { Item } from './course.ts';
import { drawFx, type Fx } from './fx.ts';
import type { Ride } from './rides.ts';
import { hash, thingAt, type Scene } from './scenery.ts';
import { stamp } from './sprites.ts';

/** Where everything sits on this screen. One lane width is the unit the race thinks in. */
export interface View {
  width: number;
  height: number;
  dpr: number;
  lane: number;
  roadLeft: number;
  roadRight: number;
  rideY: number;
}

export function makeView(width: number, height: number, dpr: number): View {
  const lane = Math.min(width * 0.25, height / 6);
  const road = lane * 3;
  const roadLeft = (width - road) / 2;
  return { width, height, dpr, lane, roadLeft, roadRight: roadLeft + road, rideY: height - lane * 1.35 };
}

export function laneX(view: View, lane: number): number {
  return view.roadLeft + view.lane * (lane + 0.5);
}

export function roadY(view: View, race: Race, at: number): number {
  return view.rideY - (at - race.position) * view.lane;
}

export function counterSpot(view: View): { x: number; y: number } {
  return { x: 16 + view.lane * 0.3, y: 34 };
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  view: View;
  race: Race;
  scene: Scene;
  ride: Ride;
  fx: Fx;
  /** Seconds since the page opened, for bobbing and pulsing. */
  time: number;
  /** How visible the left and right arrows are, 0 to 1. */
  arrows: number;
  calm: boolean;
}

const BAND = 1.5;
const KERB = 0.13;
const RAINBOW = ['#ff5a5f', '#ff9f43', '#ffd93b', '#3ecf8e', '#4cb8ff', '#6c63ff', '#b15cff'];

function firstRow(race: Race, span: number): number {
  return Math.floor((race.position - 3) / span);
}

function lastRow(view: View, race: Race, span: number): number {
  return Math.ceil((race.position + (view.rideY + view.lane) / view.lane) / span);
}

function drawGroundSide(frame: Frame, left: number, right: number, tones: [string, string]): void {
  const { ctx, view, race } = frame;
  for (let row = firstRow(race, BAND); row <= lastRow(view, race, BAND); row++) {
    ctx.fillStyle = tones[Math.abs(row) % 2]!;
    const y = roadY(view, race, (row + 1) * BAND);
    ctx.fillRect(left, y, right - left, BAND * view.lane + 1);
  }
}

function drawSpecks(frame: Frame, left: number, right: number, side: number): void {
  const { ctx, view, race, scene } = frame;
  const span = 0.5;
  ctx.fillStyle = scene.speck;
  const size = Math.max(2, view.lane * 0.04);
  for (let row = firstRow(race, span); row <= lastRow(view, race, span); row++) {
    if (hash(row, side) < 0.3) continue;
    const x = left + hash(row, side + 7) * (right - left);
    ctx.fillRect(x, roadY(view, race, row * span), size, size);
  }
}

function drawThings(frame: Frame, things: readonly string[], edge: number, room: number, side: -1 | 1): void {
  const { ctx, view, race } = frame;
  if (room < 18) return;
  const columns = Math.max(1, Math.floor(room / (view.lane * 1.7)));
  const width = room / columns;
  const size = Math.min(width * 0.92, view.lane * 0.95);
  const span = Math.max(1.5, (size / view.lane) * 1.7);
  for (let column = 0; column < columns; column++) {
    const x = edge + side * (column + 0.5) * width;
    for (let row = firstRow(race, span); row <= lastRow(view, race, span); row++) {
      const thing = thingAt(things, row, column * 2 + (side > 0 ? 1 : 0));
      if (!thing) continue;
      const jiggle = (hash(row, column + 3) - 0.5) * span * 0.5;
      const big = size * (0.8 + hash(row, column + 9) * 0.25);
      stamp(ctx, view.dpr, thing, x, roadY(view, race, row * span + jiggle), big);
    }
  }
}

function drawGround(frame: Frame): void {
  const { view, scene } = frame;
  const margin = 12;
  drawGroundSide(frame, -margin, view.roadLeft, scene.left);
  drawGroundSide(frame, view.roadRight, view.width + margin, scene.right);
  drawSpecks(frame, 0, view.roadLeft, 1);
  drawSpecks(frame, view.roadRight, view.width, 2);
  // Measured from outside the kerb, so nothing gets cut off by it.
  const kerb = view.lane * KERB;
  const room = view.roadLeft - kerb;
  drawThings(frame, scene.thingsLeft, view.roadLeft - kerb, room, -1);
  drawThings(frame, scene.thingsRight, view.roadRight + kerb, room, 1);
}

function drawRoad(frame: Frame): void {
  const { ctx, view, race, scene } = frame;
  const { lane, roadLeft, roadRight, height } = view;
  ctx.fillStyle = scene.road;
  ctx.fillRect(roadLeft, -12, lane * 3, height + 24);
  ctx.fillStyle = scene.roadEdge;
  ctx.fillRect(roadLeft, -12, lane * 0.12, height + 24);
  ctx.fillRect(roadRight - lane * 0.12, -12, lane * 0.12, height + 24);

  const dashSpan = 1;
  ctx.fillStyle = scene.dash;
  const dashWidth = lane * 0.07;
  for (let row = firstRow(race, dashSpan); row <= lastRow(view, race, dashSpan); row++) {
    const y = roadY(view, race, row * dashSpan);
    for (const line of [1, 2]) ctx.fillRect(roadLeft + lane * line - dashWidth / 2, y, dashWidth, lane * 0.52);
  }

  const kerb = lane * KERB;
  const kerbSpan = 0.5;
  for (let row = firstRow(race, kerbSpan); row <= lastRow(view, race, kerbSpan); row++) {
    ctx.fillStyle = scene.kerb[Math.abs(row) % 2]!;
    const y = roadY(view, race, (row + 1) * kerbSpan);
    ctx.fillRect(roadLeft - kerb, y, kerb, kerbSpan * lane + 1);
    ctx.fillRect(roadRight, y, kerb, kerbSpan * lane + 1);
  }
}

function drawCheckerLine(frame: Frame, at: number): void {
  const { ctx, view, race } = frame;
  const { lane, roadLeft } = view;
  const squares = 12;
  const size = (lane * 3) / squares;
  const y = roadY(view, race, at);
  if (y < -size * 3 || y > view.height + size) return;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < squares; i++) {
      ctx.fillStyle = (i + row) % 2 ? '#fff' : '#2b2140';
      ctx.fillRect(roadLeft + i * size, y + (row - 3) * size, size + 0.5, size + 0.5);
    }
  }
}

function drawFinish(frame: Frame): void {
  const { ctx, view, race, time, calm } = frame;
  const y = roadY(view, race, race.length);
  if (y < -view.lane * 2 || y > view.height + view.lane) return;
  drawCheckerLine(frame, race.length);
  const wave = calm ? 0 : Math.sin(time * 6) * 0.1;
  const size = view.lane * 0.95;
  stamp(ctx, view.dpr, '🏁', view.roadLeft - size * 0.1, y - view.lane * 0.5, size, -wave);
  stamp(ctx, view.dpr, '🏁', view.roadRight + size * 0.1, y - view.lane * 0.5, size, wave);
}

function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
  ctx.fillStyle = 'rgba(20, 10, 40, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRamp(frame: Frame, y: number): void {
  const { ctx, view, time, calm } = frame;
  const { lane, roadLeft } = view;
  const stripe = lane * 0.2;
  RAINBOW.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(roadLeft, y - (i + 1) * stripe, lane * 3, stripe + 0.5);
  });
  const pulse = calm ? 0.85 : 0.7 + 0.3 * Math.sin(time * 9);
  ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
  ctx.lineWidth = lane * 0.09;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const x = view.roadLeft + lane * (i + 0.5);
    for (const up of [0.45, 0.95]) {
      ctx.beginPath();
      ctx.moveTo(x - lane * 0.22, y - lane * (up - 0.05));
      ctx.lineTo(x, y - lane * (up + 0.2));
      ctx.lineTo(x + lane * 0.22, y - lane * (up - 0.05));
      ctx.stroke();
    }
  }
}

function drawGiant(frame: Frame, y: number): void {
  const { ctx, view, time, calm } = frame;
  const x = laneX(view, 1);
  const size = view.lane * (calm ? 1.5 : 1.5 + 0.12 * Math.sin(time * 8));
  ctx.fillStyle = 'rgba(255, 233, 120, 0.45)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
  stamp(ctx, view.dpr, '🌟', x, y, size, calm ? 0 : time * 1.5);
}

function drawItem(frame: Frame, item: Item): void {
  const { ctx, view, race, time, calm } = frame;
  const y = roadY(view, race, item.at);
  if (y < -view.lane * 1.5 || y > view.height + view.lane) return;
  const x = laneX(view, item.lane);
  const { lane, dpr } = view;
  const bob = calm ? 0 : Math.sin(time * 5 + item.at) * lane * 0.05;
  switch (item.kind) {
    case 'star':
      drawShadow(ctx, x, y + lane * 0.28, lane * 0.4);
      stamp(ctx, dpr, '⭐', x, y + bob, lane * 0.62);
      return;
    case 'treat':
      drawShadow(ctx, x, y + lane * 0.3, lane * 0.46);
      stamp(ctx, dpr, item.art, x, y + bob, lane * 0.66);
      return;
    case 'obstacle':
      if (item.art !== 'puddle') drawShadow(ctx, x, y + lane * 0.34, lane * 0.7);
      stamp(ctx, dpr, item.art === 'cow' ? '🐄' : item.art, x, y, lane * 0.86);
      return;
    case 'ramp':
      drawRamp(frame, y);
      return;
    case 'giant':
      drawGiant(frame, y);
      return;
    case 'ufo':
      return;
  }
}

function drawItems(frame: Frame): void {
  const { race } = frame;
  // Flat things first, so a star or a cow never hides under a ramp.
  for (const item of race.items) if (item.kind === 'ramp') drawItem(frame, item);
  for (const item of race.items) if (item.kind !== 'ramp') drawItem(frame, item);
}

function drawRainbowTail(frame: Frame, x: number, y: number): void {
  const { ctx, view, time, calm } = frame;
  const width = view.lane * 0.09;
  RAINBOW.forEach((color, i) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width + 0.5;
    ctx.beginPath();
    const offset = (i - 3) * width;
    for (let dy = 0; dy <= view.height - y + 20; dy += 16) {
      const wave = calm ? 0 : Math.sin(dy * 0.018 - time * 7) * view.lane * 0.14 * Math.min(1, dy / 80);
      ctx.lineTo(x + offset + wave, y + dy);
    }
    ctx.stroke();
  });
}

function rideLift(frame: Frame): number {
  const { race, ride, time, calm } = frame;
  if (calm) return 0;
  const going = race.phase === 'countdown' ? 0.4 : 1;
  if (ride.gait === 'hop') return Math.abs(Math.sin(time * 7)) * 0.13 * going;
  if (ride.gait === 'hover') return (0.08 + Math.sin(time * 3.5) * 0.05) * going;
  return Math.abs(Math.sin(time * 13)) * 0.04 * going;
}

function spinAngle(frame: Frame): number {
  const { race, calm } = frame;
  if (race.spin <= 0) return 0;
  const done = 1 - race.spin / SPIN_SECONDS;
  if (calm) return Math.sin(done * Math.PI * 4) * 0.2;
  // Fast at first, then wobbling to a stop like a coin.
  return (1 - (1 - done) ** 3) * Math.PI * 4;
}

function drawDizzyStars(frame: Frame, x: number, y: number, size: number): void {
  const { ctx, view, time } = frame;
  for (let i = 0; i < 3; i++) {
    const angle = time * 7 + (i * Math.PI * 2) / 3;
    stamp(ctx, view.dpr, '💫', x + Math.cos(angle) * size * 0.55, y - size * 0.62 + Math.sin(angle) * size * 0.16, size * 0.34);
  }
}

function drawRide(frame: Frame): void {
  const { ctx, view, race, ride, fx } = frame;
  const { lane, dpr, rideY } = view;
  const x = laneX(view, race.x);
  const flying = race.flight > 0;
  // Takes off and lands smoothly rather than popping up.
  const height = Math.min(1, race.flight * 2, (4 - race.flight) * 2.5) * (flying ? 1 : 0);
  const scale = 1 + height * 0.3;
  const y = rideY - lane * (rideLift(frame) + height * 0.35);
  const size = lane * 0.98 * scale;

  drawShadow(ctx, x, rideY + lane * 0.4 + height * lane * 0.25, lane * (0.8 - height * 0.25));
  if (flying) drawRainbowTail(frame, x, y + size * 0.3);
  stamp(ctx, dpr, ride.art, x, y, size, fx.lean + spinAngle(frame), ride.turn);
  if (race.spin > 0) drawDizzyStars(frame, x, y, size);
}

function drawUfo(frame: Frame): void {
  const { ctx, view, race, time, calm } = frame;
  const ufo = race.ufo;
  if (!ufo) return;
  const across = laneX(view, 1);
  const y = view.lane * 1.9;
  const sway = calm ? 0 : Math.sin(time * 3) * view.lane * 0.45;
  const flyIn = Math.min(1, ufo.age / 0.7);
  const flyOut = Math.max(0, (ufo.age - 2.6) / 0.6);
  const x = across + sway + (1 - flyIn) * (view.width * 0.75) - flyOut * view.width * 0.8;
  if (!ufo.dropped || ufo.age < 1.9) {
    ctx.fillStyle = 'rgba(160, 255, 200, 0.28)';
    ctx.beginPath();
    ctx.moveTo(x - view.lane * 0.15, y);
    ctx.lineTo(x + view.lane * 0.15, y);
    ctx.lineTo(x + view.lane * 0.7, y + view.lane * 1.8);
    ctx.lineTo(x - view.lane * 0.7, y + view.lane * 1.8);
    ctx.closePath();
    ctx.fill();
  }
  stamp(ctx, view.dpr, '🛸', x, y, view.lane * 1.25, calm ? 0 : Math.sin(time * 4) * 0.12);
}

function drawLights(frame: Frame): void {
  const { ctx, view, race } = frame;
  const shown = race.phase === 'countdown' || (race.phase === 'racing' && race.clock < 0.9);
  if (!shown) return;
  const size = Math.max(52, view.lane * 0.62);
  const gap = size * 0.2;
  const x = view.width / 2 - (size * 1.5 + gap);
  const y = view.height * 0.26;
  const left = race.countdown;
  const lit = race.phase === 'racing' ? 2 : left > COUNTDOWN / 2 ? 0 : 1;
  ctx.fillStyle = 'rgba(43, 33, 64, 0.9)';
  ctx.beginPath();
  ctx.roundRect(x - gap * 1.5, y - gap * 1.5, size * 3 + gap * 5, size + gap * 3, size * 0.4);
  ctx.fill();
  ['#ff5a5f', '#ffc93c', '#3ecf8e'].forEach((color, i) => {
    ctx.fillStyle = i === lit ? color : 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.arc(x + size / 2 + i * (size + gap), y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawChevron(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, side: -1 | 1): void {
  ctx.lineWidth = size * 0.17;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2b2140';
  ctx.beginPath();
  ctx.moveTo(x - side * size * 0.12, y - size * 0.24);
  ctx.lineTo(x + side * size * 0.14, y);
  ctx.lineTo(x - side * size * 0.12, y + size * 0.24);
  ctx.stroke();
}

function drawArrows(frame: Frame): void {
  const { ctx, view, time, arrows, calm } = frame;
  if (arrows <= 0) return;
  const beat = calm ? 0.5 : (Math.sin(time * 6) + 1) / 2;
  const size = Math.max(84, view.lane * (1 + beat * 0.16));
  const y = view.height * 0.52;
  const reach = Math.min(view.width * 0.25, view.lane * 2.3);
  ctx.save();
  ctx.globalAlpha = arrows;
  for (const side of [-1, 1] as const) {
    const x = view.width / 2 + side * reach;
    ctx.fillStyle = '#ffc93c';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawChevron(ctx, x, y, size, side);
    if (!calm) {
      const point = 10 + beat * 16;
      stamp(ctx, view.dpr, '👆', x + size * 0.12, y + size * 0.62 + point, size * 0.5);
    }
  }
  ctx.restore();
}

function drawCounter(frame: Frame): void {
  const { ctx, view, race, fx } = frame;
  const spot = counterSpot(view);
  const label = String(race.stars);
  const fontSize = 26 + fx.counterPop * 9;
  ctx.font = `700 ${fontSize}px Fredoka, ui-rounded, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(label).width + 62;
  ctx.fillStyle = 'rgba(43, 33, 64, 0.82)';
  ctx.beginPath();
  ctx.roundRect(10, 10, width, 48, 24);
  ctx.fill();
  stamp(ctx, view.dpr, '⭐', 34, spot.y, 30 + fx.counterPop * 10);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, 54, spot.y + 2);
}

function drawProgress(frame: Frame): void {
  const { ctx, view, race, ride } = frame;
  const left = Math.max(view.width * 0.42, view.width - 300);
  const right = view.width - 44;
  const y = 34;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(43, 33, 64, 0.82)';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(right, y);
  ctx.stroke();
  const done = Math.min(1, race.position / race.length);
  ctx.strokeStyle = '#ffc93c';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left + (right - left) * done, y);
  ctx.stroke();
  stamp(ctx, view.dpr, '🏁', right + 16, y, 34);
  stamp(ctx, view.dpr, ride.art, left + (right - left) * done, y - 2, 34, 0, ride.turn);
}

export function drawFrame(frame: Frame): void {
  const { ctx, view, fx, calm } = frame;
  ctx.save();
  if (!calm && fx.shake > 0.4) {
    ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
  }
  drawGround(frame);
  drawRoad(frame);
  drawCheckerLine(frame, 0.75);
  drawFinish(frame);
  drawItems(frame);
  drawRide(frame);
  drawUfo(frame);
  ctx.restore();
  drawFlash(frame);
  drawLights(frame);
  drawArrows(frame);
  drawFx(fx, ctx, view.dpr);
  drawCounter(frame);
  drawProgress(frame);
}

function drawFlash(frame: Frame): void {
  const { ctx, view, fx } = frame;
  if (fx.flash < 0.02) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${fx.flash * 0.28})`;
  const half = view.width / 2;
  ctx.fillRect(fx.flashSide < 0 ? 0 : half, 0, half, view.height);
}
