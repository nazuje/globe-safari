import { stamp } from './sprites.ts';
import type { World } from './worlds.ts';

const TILE_WIDTH = 1024;
const TILE_HEIGHT = 260;
const FAR_DRIFT = 0.12;
const NEAR_DRIFT = 0.3;
const CLOUD_DRIFT = 0.06;
const CLOUD_WIND = 6;
const CLOUD_COUNT = 5;

interface Strip {
  image: HTMLCanvasElement;
  drift: number;
}

export interface Backdrop {
  world: World;
  far: Strip;
  near: Strip;
  sky: CanvasGradient | null;
  skyHeight: number;
}

function ridge(color: string, base: number, bumps: readonly (readonly [number, number])[], shape: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_WIDTH;
  canvas.height = TILE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  shape(ctx);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, TILE_HEIGHT);
  for (let x = 0; x <= TILE_WIDTH; x += 8) {
    let height = base;
    // Whole numbers of waves, so the strip joins up with itself.
    for (const [waves, size] of bumps) height += Math.sin((x / TILE_WIDTH) * Math.PI * 2 * waves) * size;
    ctx.lineTo(x, TILE_HEIGHT - height);
  }
  ctx.lineTo(TILE_WIDTH, TILE_HEIGHT);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

function farShapes(world: World): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    if (world.id === 'candy') {
      for (const x of [140, 420, 720, 930]) {
        ctx.fillStyle = '#ffffffaa';
        ctx.fillRect(x - 3, 90, 6, 150);
        ctx.fillStyle = x % 3 ? '#ffd23c' : '#7fd8ff';
        ctx.beginPath();
        ctx.arc(x, 86, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (world.id === 'ice') {
      ctx.fillStyle = '#d6f3ff';
      for (let x = 30; x < TILE_WIDTH; x += 150) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 26, 0);
        ctx.lineTo(x + 13, 70 + (x % 3) * 24);
        ctx.closePath();
        ctx.fill();
      }
    }
  };
}

export function makeBackdrop(world: World): Backdrop {
  return {
    world,
    far: {
      image: ridge(world.far, 130, [[2, 34], [5, 12]], farShapes(world)),
      drift: FAR_DRIFT,
    },
    near: { image: ridge(world.near, 72, [[3, 24], [7, 9]], () => undefined), drift: NEAR_DRIFT },
    sky: null,
    skyHeight: 0,
  };
}

function drawStrip(ctx: CanvasRenderingContext2D, strip: Strip, width: number, foot: number, camX: number, scale: number): void {
  const drawnWidth = TILE_WIDTH * scale;
  const drawnHeight = TILE_HEIGHT * scale;
  const offset = -(((camX * strip.drift * scale) % drawnWidth) + drawnWidth) % drawnWidth;
  for (let x = offset; x < width; x += drawnWidth) ctx.drawImage(strip.image, x, foot - drawnHeight, drawnWidth + 1, drawnHeight);
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  for (const [dx, dy, r] of [[-0.8, 0.1, 0.42], [-0.25, -0.2, 0.6], [0.4, -0.05, 0.5], [0.95, 0.15, 0.34]] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * size, y + dy * size, r * size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSkyThings(ctx: CanvasRenderingContext2D, backdrop: Backdrop, width: number, height: number, dpr: number, camX: number, time: number): void {
  const { world } = backdrop;
  const span = width + 240;
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const seed = i * 137.5;
    const x = ((seed * 3.3 - camX * CLOUD_DRIFT - time * CLOUD_WIND) % span + span) % span - 120;
    const y = height * (0.05 + ((seed * 0.013) % 0.32));
    if (world.drift.length === 0) drawCloud(ctx, x, y, 36 + (i % 3) * 12);
    else stamp(ctx, dpr, world.drift[i % world.drift.length]!, x, y, 26 + (i % 3) * 10);
  }
}

function drawLight(ctx: CanvasRenderingContext2D, backdrop: Backdrop, width: number, height: number): void {
  const { world } = backdrop;
  const x = width * 0.8;
  const y = Math.min(height * 0.16, 110);
  const r = Math.min(width, height) * 0.075;
  ctx.fillStyle = world.dark ? '#fff4c9' : '#fff1a6';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTinyStars(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#ffffffcc';
  for (let i = 0; i < 40; i++) {
    const x = (i * 197.3) % width;
    const y = (i * 83.7) % (height * 0.6);
    ctx.fillRect(x, y, i % 3 ? 2 : 3, i % 3 ? 2 : 3);
  }
}

/** Paints the sky and the far scenery. `groundY` is where height zero is on screen. */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  backdrop: Backdrop,
  width: number,
  height: number,
  dpr: number,
  groundY: number,
  camX: number,
  scale: number,
  time: number,
): void {
  const { world } = backdrop;
  if (!backdrop.sky || backdrop.skyHeight !== height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, world.sky[0]);
    gradient.addColorStop(0.75, world.sky[1]);
    backdrop.sky = gradient;
    backdrop.skyHeight = height;
  }
  ctx.fillStyle = backdrop.sky;
  ctx.fillRect(0, 0, width, height);
  if (world.dark) drawTinyStars(ctx, width, height);
  drawLight(ctx, backdrop, width, height);
  drawSkyThings(ctx, backdrop, width, height, dpr, camX, time);
  const hills = Math.max(0.8, scale * 0.8);
  const foot = groundY + 30 * scale;
  drawStrip(ctx, backdrop.far, width, foot, camX, hills);
  drawStrip(ctx, backdrop.near, width, foot, camX, hills);
}
