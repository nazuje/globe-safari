import type { Mood } from './art.ts';
import { FX_ART, type Fx } from './fx.ts';
import { ALIEN_RADIUS, bossRadius, fieldFor, helperX, type Alien, type Boss, type Field, type Game } from './game.ts';
import { LOOKS } from './kinds.ts';
import type { Theme } from './sky.ts';
import { alienArt, stamp } from './sprites.ts';

const FONT = 'Fredoka, ui-rounded, system-ui, sans-serif';
const STAR_LAYERS = [
  { count: 70, size: 1.2, speed: 0.012, alpha: 0.55 },
  { count: 36, size: 2, speed: 0.03, alpha: 0.75 },
  { count: 16, size: 3, speed: 0.06, alpha: 1 },
];
const FEATHERS = ['feather:0', 'feather:1', 'feather:2'];
const POWER_ICONS = [
  ['triple', 'power:triple'],
  ['helper', 'power:helper'],
  ['magnet', 'power:magnet'],
] as const;
const RUNNING_OUT = 2;

export interface View {
  width: number;
  height: number;
  dpr: number;
  unit: number;
  field: Field;
}

export function makeView(width: number, height: number, dpr: number): View {
  const field = fieldFor(width, height);
  return { width, height, dpr, unit: width / field.w, field };
}

export interface FrameArgs {
  ctx: CanvasRenderingContext2D;
  view: View;
  game: Game;
  theme: Theme;
  layers: HTMLCanvasElement[];
  fx: Fx;
  time: number;
  /** How much of the finger hint to show, from 0 to 1. */
  hint: number;
  /** Whether to show a new player that stars are for catching. */
  starHint: boolean;
  highFive: string;
}

/** Star fields are drawn once and slid along, which is far cheaper than drawing each star. */
export function makeStarLayers(view: View, tint: string, count: number): HTMLCanvasElement[] {
  return STAR_LAYERS.slice(0, count).map((layer) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(view.width);
    canvas.height = Math.ceil(view.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.fillStyle = tint;
    ctx.globalAlpha = layer.alpha;
    const dots = Math.round((layer.count * (view.width * view.height)) / 400000) + 8;
    for (let i = 0; i < dots; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * view.width, Math.random() * view.height, layer.size * (0.7 + Math.random() * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  });
}

function drawStars(args: FrameArgs): void {
  const { ctx, view, game, layers, time, fx } = args;
  const pace = fx.calm ? 0.15 : 1;
  const rush = game.storm > 0 ? 3 : 1 + game.clock / 60;
  layers.forEach((layer, i) => {
    const { speed } = STAR_LAYERS[i];
    const y = ((time * speed * pace * rush * view.height) % view.height + view.height) % view.height;
    const x = -(game.ship.x - 0.5) * view.width * (0.02 + i * 0.03) - view.width * 0.05;
    const w = view.width * 1.1;
    ctx.drawImage(layer, x, y, w, view.height);
    ctx.drawImage(layer, x, y - view.height, w, view.height);
  });
}

function drawScenery(args: FrameArgs): void {
  const { ctx, view, game, theme, fx } = args;
  const longer = Math.max(view.width, view.height);
  const pace = fx.calm ? 0.2 : 1;
  // Kept dim, so the planets stay behind the action and the aliens stand out.
  ctx.globalAlpha = 0.6;
  for (const piece of theme.scenery) {
    const size = longer * piece.size;
    const travel = 1 + (size * 2) / view.height;
    const v = ((piece.v + (game.clock * piece.drift * pace) / 60 + size / view.height) % travel) - size / view.height;
    const sideways = -(game.ship.x - 0.5) * view.width * piece.size * 0.12;
    stamp(ctx, 1, piece.art, piece.u * view.width + sideways, v * view.height, size);
  }
  ctx.globalAlpha = 1;
}

/** During a Tickle Storm the sky itself laughs. */
function drawStormSky(args: FrameArgs): void {
  const { ctx, view, game, time, fx } = args;
  if (game.storm <= 0) return;
  const fade = Math.min(1, game.storm * 2);
  const hue = (time * 200) % 360;
  ctx.fillStyle = fx.calm ? 'rgba(255, 200, 120, 0.12)' : `hsla(${hue}, 90%, 60%, ${0.2 * fade})`;
  ctx.fillRect(0, 0, view.width, view.height);
  const size = Math.min(view.width, view.height) * 0.46;
  const bob = fx.calm ? 0 : Math.sin(time * 16) * size * 0.05;
  const x = view.width / 2;
  const y = view.height * 0.42 + bob;
  ctx.globalAlpha = 0.5 * fade;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = size * 0.1;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * size * 0.56, y - size * 0.3, size * 0.26, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40, 10, 70, 0.6)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.95, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.7, size * 0.5, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - size * 0.93, y, size * 1.86, size * 0.14);
  ctx.globalAlpha = 1;
}

function drawWave(args: FrameArgs): void {
  const { ctx, view, game, time } = args;
  if (game.giggleWave < 0) return;
  const y = game.giggleWave * view.height;
  const step = view.width / 10;
  const trail = ctx.createLinearGradient(0, y, 0, y + view.unit * 14);
  trail.addColorStop(0, 'rgba(120, 225, 255, 0.45)');
  trail.addColorStop(1, 'rgba(120, 225, 255, 0)');
  ctx.fillStyle = trail;
  ctx.fillRect(0, y, view.width, view.unit * 14);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = view.unit * 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) ctx.lineTo(i * step, y + Math.sin(i * 1.3 + time * 14) * view.unit * 1.6);
  ctx.stroke();
  for (let i = 1; i < 10; i += 3) {
    stamp(ctx, view.dpr, `ha:${i % 3}`, i * step, y - view.unit * 3, view.unit * 5);
  }
}

function drawLaugher(args: FrameArgs, alien: Alien, x: number, y: number): void {
  const { ctx, view, time, fx } = args;
  const size = view.unit * ALIEN_RADIUS * 2.3;
  const spin = alien.laughing * (fx.calm ? 2 : 9);
  const fade = Math.min(1, (1.7 - alien.laughing) / 0.35);
  ctx.globalAlpha = fade;
  stamp(ctx, view.dpr, alienArt(alien.spawn.kind, 'laugh'), x, y, size * (1 + Math.min(0.2, alien.laughing)), spin);
  // A tiny hand waving goodbye.
  const arm = spin + 0.9 + Math.sin(time * 16) * 0.5;
  const handX = x + Math.cos(arm) * size * 0.68;
  const handY = y + Math.sin(arm) * size * 0.68;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(handX, handY, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAliens(args: FrameArgs): void {
  const { ctx, view, game, time, fx } = args;
  const size = view.unit * ALIEN_RADIUS * 2.3;
  const storming = game.storm > 0;
  for (const alien of game.aliens) {
    const x = alien.x * view.width;
    const y = alien.y * view.height;
    if (alien.laughing >= 0) {
      drawLaugher(args, alien, x, y);
      continue;
    }
    const big = alien.spawn.tickles > 1 ? 1.2 : 1;
    const squash = 1 + alien.nudge * 0.25;
    const mood: Mood = alien.spawn.kind === 'goldie' ? 'laugh' : storming || alien.nudge > 0 ? 'smirk' : 'grumpy';
    const rock = fx.calm ? 0 : Math.sin(time * (storming ? 22 : 3) + alien.x * 9) * (storming ? 0.3 : 0.1);
    stamp(ctx, view.dpr, alienArt(alien.spawn.kind, mood), x, y, size * big * squash, rock);
  }
}

function bossMood(boss: Boss): Mood {
  if (boss.laugh >= 2 / 3) return 'laugh';
  return boss.laugh >= 1 / 3 ? 'smirk' : 'grumpy';
}

function drawHand(args: FrameArgs, boss: Boss, x: number, y: number): void {
  const { ctx, view, game, highFive, time } = args;
  const out = Math.min(1, boss.fiveAge / 1.3);
  const eased = out * out * (3 - 2 * out);
  const back = boss.fiveAge > 2.5 ? Math.min(1, boss.fiveAge - 2.5) : 0;
  const reach = eased * (1 - back * 0.6);
  const shipX = game.ship.x * view.width;
  const shipY = game.ship.y * view.height - view.unit * 7;
  const handX = x + (shipX - x) * reach;
  const handY = y + (shipY - y - view.unit * 9) * reach;
  const handSize = view.unit * 26;
  ctx.strokeStyle = LOOKS[boss.kind].happy;
  ctx.lineCap = 'round';
  ctx.lineWidth = handSize * 0.3;
  ctx.beginPath();
  // The arm reaches around the side of the boss, so the laughing face stays in view.
  const shoulder = x + bossRadius(view.field) * view.unit * 0.8;
  ctx.moveTo(shoulder, y + view.unit * 4);
  ctx.quadraticCurveTo(shoulder + view.unit * 12, (y + handY) / 2 + view.unit * 8, handX, handY - view.unit * 3);
  ctx.stroke();
  stamp(ctx, view.dpr, `hand:${boss.kind}`, handX, handY, handSize, Math.sin(time * 18) * 0.03);
  if (!boss.slapped || game.phase === 'finished') return;
  const words = Math.min(view.unit * 11, view.width / 7);
  ctx.font = `700 ${words}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = words * 0.2;
  ctx.strokeStyle = '#2b2140';
  ctx.fillStyle = '#ffe066';
  ctx.strokeText(highFive, view.width / 2, view.height * 0.88);
  ctx.fillText(highFive, view.width / 2, view.height * 0.88);
}

function drawBoss(args: FrameArgs): void {
  const { ctx, view, game, time, fx } = args;
  const { boss } = game;
  if (!boss) return;
  const size = bossRadius(view.field) * 2.4 * view.unit;
  const x = boss.x * view.width;
  const y = boss.y * view.height;
  const wobble = fx.calm ? 0 : Math.sin(time * (5 + boss.laugh * 16)) * (0.02 + boss.laugh * 0.13);
  stamp(ctx, view.dpr, alienArt(boss.kind, bossMood(boss)), x, y, size * (1 + boss.nudge * 0.03), wobble);
  if (boss.fiveAge >= 0) drawHand(args, boss, x, y);
}

function drawCat(args: FrameArgs): void {
  const { ctx, view, game, time } = args;
  const { cat } = game;
  if (!cat) return;
  stamp(ctx, view.dpr, 'cat', cat.x * view.width, cat.y * view.height, view.unit * 24, Math.sin(time * 4) * 0.08);
}

function drawFalling(args: FrameArgs): void {
  const { ctx, view, game, time } = args;
  const { unit, dpr } = view;
  for (const bit of game.bits) stamp(ctx, dpr, 'star', bit.x * view.width, bit.y * view.height, unit * 5.2, bit.age * 3);
  for (const goo of game.goos) {
    stamp(ctx, dpr, 'goo', goo.x * view.width, goo.y * view.height, unit * 7, Math.sin(goo.age * 7) * 0.2);
  }
  for (const drop of game.drops) {
    const pulse = 1 + Math.sin(time * 7) * 0.08;
    stamp(ctx, dpr, `power:${drop.power}`, drop.x * view.width, drop.y * view.height, unit * 11 * pulse);
  }
}

function drawShots(args: FrameArgs): void {
  const { ctx, view, game } = args;
  const { unit, dpr } = view;
  for (const shot of game.shots) {
    const x = shot.x * view.width;
    const y = shot.y * view.height;
    if (shot.kind === 'bubble') stamp(ctx, dpr, 'bubble', x, y, unit * 5.5);
    else stamp(ctx, dpr, FEATHERS[shot.tint], x, y, unit * 7, shot.vx * 0.9 + Math.sin(shot.age * 22) * 0.3);
  }
}

function drawShip(args: FrameArgs): void {
  const { ctx, view, game, time, fx } = args;
  const { ship } = game;
  const { unit, dpr } = view;
  const size = unit * 15;
  const gooey = ship.goo > 0;
  const wobble = gooey && !fx.calm ? Math.sin(time * 20) * 0.26 : 0;
  const x = ship.x * view.width + (gooey && !fx.calm ? Math.sin(time * 15) * unit * 0.8 : 0);
  const y = ship.y * view.height + fx.shipBump * unit;
  const angle = ship.lean * 0.2 + wobble;
  if (ship.helper > 0) {
    const hx = helperX(game) * view.width;
    stamp(ctx, dpr, 'flame', hx, y + unit * 5, unit * (4 + Math.sin(time * 40)));
    stamp(ctx, dpr, 'helper', hx, y, size * 0.62, ship.lean * 0.2);
  }
  stamp(ctx, dpr, 'flame', x, y + size * 0.48, size * (0.32 + Math.sin(time * 34) * 0.05));
  stamp(ctx, dpr, 'ship', x, y, size, angle);
  if (gooey) stamp(ctx, dpr, 'goo', x + unit * 2, y - unit * 3, unit * 7, 0.4);
  if (ship.magnet > 0) {
    ctx.strokeStyle = 'rgba(190, 150, 255, 0.8)';
    ctx.lineWidth = unit * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.6 + ((time * 1.5) % 1) * 0.5), 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawParticles(args: FrameArgs): void {
  const { ctx, view, fx } = args;
  const { pool } = fx;
  for (let i = 0; i < pool.limit; i++) {
    const life = pool.life[i];
    if (life <= 0) continue;
    ctx.globalAlpha = Math.min(1, ((life - pool.age[i]) / life) * 2);
    stamp(ctx, view.dpr, FX_ART[pool.art[i]], pool.x[i], pool.y[i], pool.size[i], pool.angle[i]);
  }
  ctx.globalAlpha = 1;
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, share: number, fill: string): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  if (share <= 0) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(height, width * share), height, height / 2);
  ctx.fill();
}

function drawText(ctx: CanvasRenderingContext2D, words: string, x: number, y: number, size: number, fill: string): void {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = '#1a1238';
  ctx.strokeText(words, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(words, x, y);
}

function comboFill(combo: number): string {
  if (combo >= 10) return '#ff9ad5';
  return combo >= 5 ? '#ffe066' : '#ffffff';
}

function drawStarCount(args: FrameArgs): void {
  const { ctx, view, game, fx } = args;
  stamp(ctx, view.dpr, 'star', 26, 74, 28 + fx.starPop * 12);
  drawText(ctx, String(game.caught), 46, 75, 22 + fx.starPop * 5, '#ffe066');
}

function drawPowersHud(args: FrameArgs): void {
  const { ctx, view, game, time } = args;
  let x = 112;
  for (const [power, art] of POWER_ICONS) {
    const left = game.ship[power];
    if (left <= 0) continue;
    ctx.globalAlpha = left < RUNNING_OUT && Math.sin(time * 14) < 0 ? 0.4 : 1;
    stamp(ctx, view.dpr, art, x, 74, 32);
    x += 42;
  }
  ctx.globalAlpha = 1;
}

function drawHud(args: FrameArgs): void {
  const { ctx, view, game, fx, time } = args;
  const margin = 12;
  const scoreSize = 26 + fx.scorePop * 5;
  drawText(ctx, String(game.score), margin, 28, scoreSize, '#fff');
  if (game.combo >= 3) drawText(ctx, `${game.combo}×`, margin + 86, 28, 22 + fx.scorePop * 4, comboFill(game.combo));
  const width = Math.min(view.width * 0.46, 300);
  const left = view.width - margin - width - 16;
  const full = game.storm > 0 ? 1 : game.meter;
  const hue = (time * 240) % 360;
  const near = game.meter > 0.8 && game.storm <= 0 ? 2 + Math.sin(time * 14) * 2 : 0;
  bar(ctx, left, 18 - near / 2, width, 20 + near, full, game.storm > 0 ? `hsl(${hue}, 90%, 62%)` : '#ffc93c');
  stamp(ctx, view.dpr, alienArt('puff', 'laugh'), left + width, 28, 38 + fx.meterPop * 12);
  const { boss } = game;
  if (boss && boss.age > 1.5 && boss.fiveAge < 0) {
    const bossWidth = Math.min(view.width * 0.6, 420);
    const x = (view.width - bossWidth) / 2;
    bar(ctx, x, 52, bossWidth, 16, boss.laugh, '#ff7ab8');
    stamp(ctx, view.dpr, alienArt(boss.kind, 'laugh'), x + bossWidth, 60, 30);
  }
  drawStarCount(args);
  drawPowersHud(args);
}

/** No words: the star glows, dots lead to it from the ship, and a finger slides over to show the way. */
function drawStarHint(args: FrameArgs): void {
  const { ctx, view, game, time, starHint } = args;
  if (!starHint) return;
  let star = game.bits[0];
  for (const bit of game.bits) if (bit.y > star.y) star = bit;
  if (!star) return;
  const x = star.x * view.width;
  const y = star.y * view.height;
  const shipX = game.ship.x * view.width;
  const shipY = game.ship.y * view.height;
  const pulse = (time * 1.6) % 1;
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1 - pulse;
  ctx.beginPath();
  ctx.arc(x, y, view.unit * (4 + pulse * 8), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe066';
  ctx.globalAlpha = 0.9;
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const hop = 1 + Math.sin(time * 9 - i) * 0.35;
    ctx.beginPath();
    ctx.arc(shipX + (x - shipX) * t, shipY + (y - shipY) * t, view.unit * 0.7 * hop + 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const slide = (time * 0.9) % 1;
  ctx.globalAlpha = Math.min(1, (1 - slide) * 3);
  stamp(ctx, view.dpr, 'finger', shipX + (x - shipX) * slide, shipY + view.unit * 5, 64);
  stamp(ctx, view.dpr, 'star', x, y, view.unit * (7 + Math.sin(time * 10)), time);
  ctx.globalAlpha = 1;
}

function drawHint(args: FrameArgs): void {
  const { ctx, view, game, hint, time } = args;
  if (hint <= 0) return;
  const swing = Math.sin(time * 3);
  const y = game.ship.y * view.height + view.unit * 4;
  const spread = Math.min(view.width * 0.3, 160);
  ctx.globalAlpha = hint;
  stamp(ctx, view.dpr, 'finger', view.width / 2 + swing * spread, y, 74);
  stamp(ctx, view.dpr, 'arrow', view.width / 2 - spread - 50, y, 44, Math.PI);
  stamp(ctx, view.dpr, 'arrow', view.width / 2 + spread + 50, y, 44);
  ctx.globalAlpha = 1;
}

export function drawFrame(args: FrameArgs): void {
  const { ctx, view, game, fx, time } = args;
  ctx.clearRect(0, 0, view.width, view.height);
  drawStars(args);
  drawScenery(args);
  ctx.save();
  if (game.storm > 0 && !fx.calm) ctx.translate(Math.sin(time * 26) * view.unit * 0.5, Math.cos(time * 21) * view.unit * 0.5);
  drawStormSky(args);
  drawCat(args);
  drawWave(args);
  drawFalling(args);
  drawBoss(args);
  drawAliens(args);
  drawShots(args);
  drawShip(args);
  drawParticles(args);
  ctx.restore();
  if (fx.flash > 0 && !fx.calm) {
    ctx.fillStyle = `rgba(255, 255, 255, ${fx.flash * 0.4})`;
    ctx.fillRect(0, 0, view.width, view.height);
  }
  drawHud(args);
  drawHint(args);
  drawStarHint(args);
}
