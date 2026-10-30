import { drawBackdrop, makeBackdrop } from './backdrop.ts';
import type { World } from './worlds.ts';

const GROUND_SHARE = 0.86;
const HILL_SCALE = 1.2;

/** Dresses the page in a world's own colors, so the menus are part of the game. */
export function wearWorld(world: World): void {
  const { style } = document.documentElement;
  style.setProperty('--sky-top', world.sky[0]);
  style.setProperty('--grass', world.grass);
  style.setProperty('--soil', world.soil);
  style.setProperty('--soil-deep', world.soilDeep);
  style.setProperty('--on-sky', world.dark ? '#ffffff' : 'var(--ink)');
}

/** Paints the world's sky, hills and ground behind the menus: the same art as the game. */
export function paintLandscape(canvas: HTMLCanvasElement, world: World): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const groundY = height * GROUND_SHARE;
  drawBackdrop(ctx, makeBackdrop(world), width, height, dpr, groundY, 0, HILL_SCALE, 0);
  ctx.fillStyle = world.soil;
  ctx.fillRect(0, groundY, width, height - groundY);
  ctx.fillStyle = world.grass;
  ctx.fillRect(0, groundY - 6, width, 14);
}
