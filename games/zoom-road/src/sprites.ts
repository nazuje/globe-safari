import type { Ride } from './rides.ts';

/**
 * Art is drawn once into a small hidden canvas and then stamped, because drawing
 * emoji text every frame is slow on a tablet. Most art is emoji; the things emoji
 * don't have, like a rubber duck or a flying carpet, are painted here.
 */

type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const SNAP = 4;
const PADDING = 1.3;

function paintDuck(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.ellipse(s * 0.02, s * 0.16, s * 0.4, s * 0.27, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.34, s * 0.12);
  ctx.quadraticCurveTo(s * 0.52, s * 0.02, s * 0.46, s * -0.1);
  ctx.quadraticCurveTo(s * 0.38, s * 0.02, s * 0.22, s * 0.0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * -0.14, s * -0.17, s * 0.23, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff8c2e';
  ctx.beginPath();
  ctx.ellipse(s * -0.38, s * -0.14, s * 0.13, s * 0.07, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b2140';
  ctx.beginPath();
  ctx.arc(s * -0.2, s * -0.22, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f2b90f';
  ctx.lineWidth = s * 0.04;
  ctx.beginPath();
  ctx.arc(s * 0.08, s * 0.14, s * 0.15, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function paintCone(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#e8590c';
  ctx.beginPath();
  ctx.roundRect(s * -0.4, s * 0.3, s * 0.8, s * 0.13, s * 0.05);
  ctx.fill();
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(s * -0.07, s * -0.45);
  ctx.quadraticCurveTo(0, s * -0.5, s * 0.07, s * -0.45);
  ctx.lineTo(s * 0.3, s * 0.32);
  ctx.lineTo(s * -0.3, s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(s * -0.15, s * -0.14);
  ctx.lineTo(s * 0.15, s * -0.14);
  ctx.lineTo(s * 0.2, s * 0.04);
  ctx.lineTo(s * -0.2, s * 0.04);
  ctx.closePath();
  ctx.fill();
}

function paintHay(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#e9b949';
  ctx.beginPath();
  ctx.roundRect(s * -0.44, s * -0.3, s * 0.88, s * 0.6, s * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#c98f1e';
  ctx.lineWidth = s * 0.025;
  for (let i = 0; i < 7; i++) {
    const y = s * (-0.24 + i * 0.08);
    ctx.beginPath();
    ctx.moveTo(s * -0.38, y);
    ctx.quadraticCurveTo(0, y + s * (i % 2 ? 0.05 : -0.05), s * 0.38, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#9c5a1a';
  for (const x of [-0.2, 0.2]) ctx.fillRect(s * (x - 0.03), s * -0.3, s * 0.06, s * 0.6);
}

function paintPuddle(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#4cb8ff';
  ctx.beginPath();
  ctx.ellipse(s * -0.08, 0, s * 0.42, s * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.2, s * 0.08, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(s * -0.16, s * -0.08, s * 0.16, s * 0.06, -0.2, 0, Math.PI * 2);
  ctx.ellipse(s * 0.22, s * 0.1, s * 0.09, s * 0.04, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function paintCarpet(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.fillStyle = '#ffc93c';
  for (let i = 0; i < 7; i++) {
    const x = s * (-0.3 + i * 0.1);
    ctx.fillRect(x - s * 0.015, s * -0.5, s * 0.03, s * 0.08);
    ctx.fillRect(x - s * 0.015, s * 0.42, s * 0.03, s * 0.08);
  }
  ctx.fillStyle = '#c2255c';
  ctx.beginPath();
  ctx.roundRect(s * -0.34, s * -0.44, s * 0.68, s * 0.88, s * 0.05);
  ctx.fill();
  ctx.strokeStyle = '#ffc93c';
  ctx.lineWidth = s * 0.035;
  ctx.strokeRect(s * -0.27, s * -0.37, s * 0.54, s * 0.74);
  ctx.fillStyle = '#20c997';
  ctx.beginPath();
  ctx.moveTo(0, s * -0.3);
  ctx.lineTo(s * 0.2, 0);
  ctx.lineTo(0, s * 0.3);
  ctx.lineTo(s * -0.2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.font = `${s * 0.44}px ${EMOJI_FONT}`;
  ctx.fillText('🧸', 0, s * 0.02);
}

const PAINTERS: Record<string, Painter> = {
  duck: paintDuck,
  cone: paintCone,
  hay: paintHay,
  puddle: paintPuddle,
  carpet: paintCarpet,
};

const cache = new Map<string, HTMLCanvasElement>();

function paint(art: string, size: number, turn: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.ceil(size * PADDING);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turn * Math.PI) / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const painter = PAINTERS[art];
  if (painter) {
    painter(ctx, size);
  } else {
    ctx.font = `${size * 0.9}px ${EMOJI_FONT}`;
    ctx.fillText(art, 0, size * 0.05);
  }
  return canvas;
}

/** The canvas for a piece of art at a device-pixel size. Near sizes share one, to keep the cache small. */
export function sprite(art: string, size: number, turn = 0): HTMLCanvasElement {
  const snapped = Math.max(SNAP, Math.ceil(size / SNAP) * SNAP);
  const key = `${art}|${snapped}|${turn}`;
  let found = cache.get(key);
  if (!found) {
    found = paint(art, snapped, turn);
    cache.set(key, found);
  }
  return found;
}

/** Stamps art centered on a point, at a size in the context's own units. */
export function stamp(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  art: string,
  x: number,
  y: number,
  size: number,
  angle = 0,
  turn = 0,
): void {
  const image = sprite(art, size * dpr, turn);
  const box = size * PADDING;
  if (angle === 0) {
    ctx.drawImage(image, x - box / 2, y - box / 2, box, box);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(image, -box / 2, -box / 2, box, box);
  ctx.restore();
}

/** A ride's picture as an element, for the garage. */
export function rideIcon(ride: Ride, size: number): HTMLCanvasElement {
  const canvas = paint(ride.art, size * 2, 0);
  canvas.className = 'ride-art';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}
