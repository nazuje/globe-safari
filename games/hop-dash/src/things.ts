import { groundAt, jellyX, platformX, platformY, type Jelly, type Level, type Pad, type Platform } from './level.ts';
import type { Helper } from './run.ts';
import { stamp } from './sprites.ts';
import { JELLY_HEIGHT, JELLY_WIDTH } from './tuning.ts';
import type { World } from './worlds.ts';

/** The world-to-screen sums the drawing code shares. */
export interface Lens {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  scale: number;
  x: (x: number) => number;
  y: (y: number) => number;
  left: number;
  right: number;
  time: number;
  world: World;
  calm: boolean;
}

function ground(lens: Lens, level: Level): void {
  const { ctx, world, scale } = lens;
  const bottom = ctx.canvas.height / lens.dpr + 40;
  const gradient = ctx.createLinearGradient(0, lens.y(30), 0, lens.y(-220));
  gradient.addColorStop(0, world.soil);
  gradient.addColorStop(1, world.soilDeep);
  for (const land of level.lands) {
    if (land.to < lens.left - 40 || land.from > lens.right + 40) continue;
    ctx.beginPath();
    ctx.moveTo(lens.x(land.from), bottom);
    for (let i = 0; i < land.xs.length; i++) ctx.lineTo(lens.x(land.xs[i]!), lens.y(land.hs[i]!));
    ctx.lineTo(lens.x(land.to), bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < land.xs.length; i++) ctx.lineTo(lens.x(land.xs[i]!), lens.y(land.hs[i]! - 4));
    ctx.strokeStyle = world.grass;
    ctx.lineWidth = 12 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function pit(lens: Lens, level: Level): void {
  const { ctx, world, scale, time } = lens;
  const top = lens.y(level.pitY + 110);
  const width = ctx.canvas.width / lens.dpr;
  const height = ctx.canvas.height / lens.dpr;
  ctx.fillStyle = world.pit;
  ctx.fillRect(0, top, width, Math.max(0, height - top));
  ctx.strokeStyle = world.pitShine;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -60; x < width + 60; x += 90) {
    const wave = lens.calm ? 0 : Math.sin(time * 2 + x * 0.02) * 4;
    ctx.moveTo(x + wave, top + 9 * scale);
    ctx.lineTo(x + 34 + wave, top + 9 * scale);
  }
  ctx.stroke();
}

function scenery(lens: Lens, level: Level): void {
  for (const bit of level.decor) {
    if (bit.x < lens.left - 40) continue;
    if (bit.x > lens.right + 40) break;
    const size = bit.size * lens.scale;
    stamp(lens.ctx, lens.dpr, bit.art, lens.x(bit.x), lens.y(bit.y) - size * 0.42, size);
  }
}

function cloudPlatform(lens: Lens, x: number, y: number, w: number): void {
  const { ctx, scale } = lens;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffd23c';
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.roundRect(x - (w / 2) * scale, y - 2 * scale, w * scale, 22 * scale, 11 * scale);
  ctx.fill();
  ctx.stroke();
  for (let at = -w / 2 + 34; at < w / 2 - 20; at += 64) {
    ctx.beginPath();
    ctx.arc(x + at * scale, y + 19 * scale, 17 * scale, 0, Math.PI);
    ctx.fill();
  }
}

function solidPlatform(lens: Lens, x: number, y: number, platform: Platform): void {
  const { ctx, world, scale } = lens;
  const w = platform.w * scale;
  ctx.fillStyle = world.platform;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, 26 * scale, 12 * scale);
  ctx.fill();
  ctx.fillStyle = world.platformTop;
  ctx.beginPath();
  ctx.roundRect(x - w / 2 - 3 * scale, y - 3 * scale, w + 6 * scale, 11 * scale, 6 * scale);
  ctx.fill();
  if (platform.kind !== 'mover') return;
  const flying = lens.calm ? 0 : Math.sin(lens.time * 9) * 3 * scale;
  ctx.fillStyle = '#ffffffd0';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * w * 0.3, y + 28 * scale, 16 * scale, (5 + flying * 0.2) * scale, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function platforms(lens: Lens, level: Level): void {
  for (const platform of level.platforms) {
    const at = platformX(platform, lens.time);
    if (at + platform.w / 2 < lens.left || at - platform.w / 2 > lens.right) continue;
    const x = lens.x(at);
    const y = lens.y(platformY(platform, lens.time));
    if (platform.kind === 'cloud') cloudPlatform(lens, x, y, platform.w);
    else solidPlatform(lens, x, y, platform);
  }
}

function pad(lens: Lens, one: Pad, age: number): void {
  const { ctx, world, scale } = lens;
  const x = lens.x(one.x);
  const y = lens.y(one.y);
  const squeeze = age < 0.28 ? Math.sin((age / 0.28) * Math.PI) : 0;
  const tall = (1 - squeeze * 0.45) * scale;
  const wide = (1 + squeeze * 0.28) * scale;
  if (one.golden) {
    const glow = lens.calm ? 0 : (Math.sin(lens.time * 5) + 1) * 5;
    ctx.fillStyle = '#ffe89a99';
    ctx.beginPath();
    ctx.arc(x, y - 22 * scale, (44 + glow) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.roundRect(x - 13 * wide, y - 22 * tall, 26 * wide, 24 * tall, 8 * scale);
  ctx.fill();
  ctx.fillStyle = one.golden ? '#ffc21f' : world.cap;
  ctx.beginPath();
  ctx.ellipse(x, y - 24 * tall, 32 * wide, 20 * tall, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffffd9';
  for (const [dx, dy, r] of [[-15, -30, 5], [2, -36, 6], [17, -29, 4.5]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * wide, y + dy * tall, r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#4a3a2a';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * 6 * wide, y - 13 * tall, 2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function jelly(lens: Lens, one: Jelly, squish: number): void {
  const { ctx, world, scale, time } = lens;
  const x = lens.x(jellyX(one, time));
  const y = lens.y(one.y);
  const wobble = lens.calm ? 0 : Math.sin(time * 7 + one.x) * 0.07;
  const press = Math.sin(Math.min(1, squish / 0.55) * Math.PI) * 0.5;
  const w = (JELLY_WIDTH / 2 + 4) * (1 + wobble + press * 0.8) * scale;
  const h = (JELLY_HEIGHT + 2) * (1 - wobble - press) * scale;
  ctx.fillStyle = world.jelly;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 1.05, y - h * 1.3, x + w * 1.05, y - h * 1.3, x + w, y);
  ctx.quadraticCurveTo(x, y + 5 * scale, x - w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = world.jellyShine;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.42, y - h * 0.68, w * 0.2, h * 0.14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  const eyeY = y - h * 0.52;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + side * w * 0.3, eyeY, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2140';
    ctx.beginPath();
    ctx.arc(x + side * w * 0.3 - 1.5 * scale, eyeY + 0.5 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#2b2140';
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  if (press > 0.05) ctx.arc(x, y - h * 0.26, 4.5 * scale, 0, Math.PI * 2);
  else ctx.arc(x, y - h * 0.32, 5 * scale, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

/** The way to a hidden path: sparkles climbing from the golden mushroom, and a ring where the second tap goes. */
export function drawClues(lens: Lens, level: Level): void {
  const { ctx, dpr, scale, time, calm } = lens;
  for (const clue of level.clues) {
    if (clue.path.at(-1)!.x < lens.left - 40 || clue.path[0]!.x > lens.right + 40) continue;
    clue.path.forEach((point, i) => {
      const wave = calm ? 0.7 : (Math.sin(time * 5 - i * 0.7) + 1) / 2;
      const x = lens.x(point.x);
      const y = lens.y(point.y + 23);
      // A soft gold dot behind each sparkle keeps the trail easy to see against a bright sky.
      ctx.globalAlpha = 0.35 + wave * 0.4;
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(x, y, (7 + wave * 5) * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55 + wave * 0.45;
      stamp(ctx, dpr, '✨', x, y, (18 + wave * 12) * scale);
    });
    ctx.globalAlpha = 1;
    const pulse = calm ? 0.5 : (Math.sin(time * 6) + 1) / 2;
    ctx.strokeStyle = '#ffd23c';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.arc(lens.x(clue.tapX), lens.y(clue.tapY + 23), (30 + pulse * 12) * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function flag(lens: Lens, level: Level): void {
  const { ctx, scale, time } = lens;
  if (level.flagX < lens.left - 90 || level.flagX > lens.right + 90) return;
  const x = lens.x(level.flagX);
  const y = lens.y(groundAt(level, level.flagX) ?? 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 3 * scale, y - 150 * scale, 6 * scale, 150 * scale);
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.arc(x, y - 152 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
  const rows = 3;
  const columns = 5;
  const box = 14 * scale;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const wave = lens.calm ? 0 : Math.sin(time * 6 + column * 0.9) * column * 1.2 * scale;
      ctx.fillStyle = (row + column) % 2 ? '#2b2140' : '#fff';
      ctx.fillRect(x + 3 * scale + column * box, y - 146 * scale + row * box + wave, box + 1, box + 1);
    }
  }
}

const CASTLE_WALL = 140;
const CASTLE_TOWER = 205;
const CASTLE_TOWER_WIDTH = 84;
const CASTLE_TOWER_SPACING = 300;
const CASTLE_COLORS = ['#8b5cf6', '#4cb8ff', '#3ecf8e', '#ff8a3c'];

function castleTower(lens: Lens, x: number, y: number, puff: number, color: string): void {
  const { ctx, scale } = lens;
  const w = CASTLE_TOWER_WIDTH * scale;
  const h = CASTLE_TOWER * scale + puff;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h, w, h, 20 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff55';
  ctx.beginPath();
  ctx.roundRect(x - w * 0.3, y - h + 24 * scale, w * 0.16, h - 40 * scale, 8 * scale);
  ctx.fill();
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.66, y - h + 12 * scale);
  ctx.quadraticCurveTo(x, y - h - w * 1.5, x + w * 0.66, y - h + 12 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.arc(x, y - h - w * 0.52, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function castle(lens: Lens, level: Level): void {
  const span = level.bouncy[0];
  if (!span || span.to < lens.left - 200 || span.from > lens.right + 200) return;
  const { ctx, scale, time } = lens;
  const y = lens.y(groundAt(level, span.from) ?? 0);
  const left = lens.x(span.from);
  const width = (span.to - span.from) * scale;
  const puff = lens.calm ? 0 : Math.sin(time * 3) * 4 * scale;
  const wall = CASTLE_WALL * scale + puff;
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.roundRect(left, y - wall, width, wall, 26 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff44';
  for (let at = 40 * scale; at < width; at += 80 * scale) {
    ctx.beginPath();
    ctx.roundRect(left + at, y - wall + 14 * scale, 34 * scale, wall - 40 * scale, 16 * scale);
    ctx.fill();
  }
  const count = Math.round(span.to - span.from) / CASTLE_TOWER_SPACING;
  for (let i = 0; i <= count; i++) {
    const x = left + i * CASTLE_TOWER_SPACING * scale;
    if (x < -120 * scale || x > ctx.canvas.width / lens.dpr + 120 * scale) continue;
    castleTower(lens, x, y, puff, CASTLE_COLORS[i % CASTLE_COLORS.length]!);
  }
  ctx.fillStyle = '#ff8fd0';
  ctx.beginPath();
  ctx.roundRect(left - 12 * scale, y - 22 * scale, width + 24 * scale, 34 * scale, 17 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffffff99';
  for (let at = 0; at < width; at += 110 * scale) {
    ctx.beginPath();
    ctx.ellipse(left + at + 40 * scale, y - 12 * scale, 26 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The runner's friend: a stork when it's the bird's turn, a puffy cloud when it isn't. */
export function drawHelper(lens: Lens, helper: Helper, x: number, y: number): void {
  const { ctx, scale } = lens;
  if (helper === 'cloud') {
    ctx.fillStyle = '#fff';
    for (const [dx, dy, r] of [[-30, 2, 20], [-8, -8, 28], [18, -2, 23], [38, 6, 15]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2b2140';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + (4 + side * 10) * scale, y - 8 * scale, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#2b2140';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(x + 4 * scale, y - 4 * scale, 5 * scale, 0.2, Math.PI - 0.2);
    ctx.stroke();
    return;
  }
  const flap = lens.calm ? 0.4 : Math.sin(lens.time * 16) * 0.75;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#d9d2e6';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 30 * scale, 15 * scale, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 34 * scale, y - 14 * scale, 10 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 24 * scale, y - 4 * scale);
  ctx.lineTo(x + 32 * scale, y - 13 * scale);
  ctx.stroke();
  ctx.fillStyle = '#ff9d3c';
  ctx.beginPath();
  ctx.moveTo(x + 41 * scale, y - 18 * scale);
  ctx.lineTo(x + 66 * scale, y - 8 * scale);
  ctx.lineTo(x + 41 * scale, y - 9 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b2140';
  ctx.beginPath();
  ctx.arc(x + 38 * scale, y - 17 * scale, 2.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x - 4 * scale, y - 8 * scale);
  ctx.rotate(-flap);
  ctx.fillStyle = '#f4f0fa';
  ctx.beginPath();
  ctx.ellipse(-20 * scale, 0, 28 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2140';
  ctx.beginPath();
  ctx.ellipse(-40 * scale, 0, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Everything in the level except the runner, back to front. */
export function drawWorld(lens: Lens, level: Level, squish: readonly number[], padAge: readonly number[]): void {
  pit(lens, level);
  castle(lens, level);
  ground(lens, level);
  scenery(lens, level);
  flag(lens, level);
  platforms(lens, level);
  level.pads.forEach((one, i) => {
    if (one.x > lens.left - 50 && one.x < lens.right + 50) pad(lens, one, padAge[i]!);
  });
  level.jellies.forEach((one, i) => {
    if (one.x > lens.left - 90 && one.x < lens.right + 90) jelly(lens, one, squish[i]!);
  });
}

const ITEM_ART: Record<'star' | 'carrot', string> = { star: 'star', carrot: '🥕' };
const ITEM_SIZE: Record<'star' | 'carrot', number> = { star: 26, carrot: 28 };

export function drawItems(lens: Lens, level: Level, got: Uint8Array, first: number): void {
  const { ctx, dpr, scale, time, calm } = lens;
  const { items } = level;
  for (let i = Math.max(0, first - 12); i < items.length; i++) {
    const item = items[i]!;
    if (item.x > lens.right + 40) break;
    if (got[i] || item.x < lens.left - 40) continue;
    const bob = calm ? 0 : Math.sin(time * 3.4 + item.x * 0.03) * 3;
    const x = lens.x(item.x);
    const y = lens.y(item.y + bob);
    if (item.kind === 'chest') {
      ctx.fillStyle = '#ffe89a88';
      ctx.beginPath();
      ctx.arc(x, y, (34 + (calm ? 0 : Math.sin(time * 5) * 5)) * scale, 0, Math.PI * 2);
      ctx.fill();
      stamp(ctx, dpr, level.treasure ?? '💎', x, y, 44 * scale);
      continue;
    }
    if (item.kind === 'boots') {
      ctx.fillStyle = '#ffffffc8';
      ctx.beginPath();
      ctx.arc(x, y, (33 + (calm ? 0 : Math.sin(time * 6) * 3)) * scale, 0, Math.PI * 2);
      ctx.fill();
      stamp(ctx, dpr, '🔥', x - 12 * scale, y + 17 * scale, 22 * scale);
      stamp(ctx, dpr, '🔥', x + 12 * scale, y + 17 * scale, 22 * scale);
      stamp(ctx, dpr, '🥾', x, y - 5 * scale, 40 * scale);
      continue;
    }
    stamp(ctx, dpr, ITEM_ART[item.kind], x, y, ITEM_SIZE[item.kind] * scale);
  }
}
