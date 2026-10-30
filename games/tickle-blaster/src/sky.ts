import type { Painter } from './art.ts';
import type { LevelId } from './levels.ts';

/** Each planet's look: the sky, and the big slow things drifting past behind the action. */
export interface Scenery {
  art: string;
  /** Across, as a part of the screen. */
  u: number;
  /** Where it starts, as a part of the screen, and how many screens it drifts a minute. */
  v: number;
  drift: number;
  /** Size as a part of the screen's longer side. */
  size: number;
}

export interface Theme {
  sky: [string, string, string];
  starTint: string;
  scenery: Scenery[];
}

const TAU = Math.PI * 2;

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function ball(ctx: CanvasRenderingContext2D, r: number, light: string, dark: string): void {
  const fill = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  fill.addColorStop(0, light);
  fill.addColorStop(1, dark);
  ctx.fillStyle = fill;
  dot(ctx, 0, 0, r);
}

const paintMoon: Painter = (ctx, s) => {
  const r = s * 0.46;
  ball(ctx, r, '#e9e6f5', '#8d89ad');
  ctx.fillStyle = 'rgba(90, 84, 125, 0.45)';
  for (const [x, y, size] of [
    [-0.45, -0.3, 0.2],
    [0.3, -0.5, 0.14],
    [0.42, 0.2, 0.25],
    [-0.2, 0.42, 0.17],
    [-0.62, 0.22, 0.1],
    [0.05, -0.02, 0.1],
  ] as const) {
    dot(ctx, r * x, r * y, r * size);
  }
};

const paintBase: Painter = (ctx, s) => {
  ctx.fillStyle = '#a7a3c4';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.3, s * 0.48, s * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(150, 225, 255, 0.75)';
  for (const [x, r] of [
    [-0.18, 0.15],
    [0.1, 0.21],
    [0.32, 0.1],
  ] as const) {
    ctx.beginPath();
    ctx.arc(s * x, s * 0.26, s * r, Math.PI, 0);
    ctx.fill();
  }
  ctx.strokeStyle = '#e9e6f5';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 0.05);
  ctx.lineTo(s * 0.1, s * -0.2);
  ctx.stroke();
  ctx.fillStyle = '#ff6b6b';
  dot(ctx, s * 0.1, s * -0.22, s * 0.03);
};

const paintRinged: Painter = (ctx, s) => {
  const r = s * 0.28;
  ctx.save();
  ctx.rotate(-0.35);
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.8)';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.46, s * 0.12, 0, Math.PI, TAU);
  ctx.stroke();
  ball(ctx, r, '#ffc07a', '#b4507e');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = s * 0.03;
  for (const y of [-0.45, 0.05, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(-Math.sqrt(1 - y * y) * r, y * r);
    ctx.quadraticCurveTo(0, y * r + s * 0.04, Math.sqrt(1 - y * y) * r, y * r);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.9)';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.46, s * 0.12, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
};

const paintLilac: Painter = (ctx, s) => ball(ctx, s * 0.44, '#b9a6ff', '#5140a8');

const paintLollipop: Painter = (ctx, s) => {
  const r = s * 0.42;
  ball(ctx, r, '#ffb3d9', '#e0408f');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const t = i / 90;
    const angle = t * TAU * 3;
    ctx.lineTo(Math.cos(angle) * r * t * 0.92, Math.sin(angle) * r * t * 0.92);
  }
  ctx.stroke();
};

const paintCandyComet: Painter = (ctx, s) => {
  const tail = ctx.createLinearGradient(s * 0.48, s * -0.48, 0, 0);
  tail.addColorStop(0, 'rgba(255, 180, 230, 0)');
  tail.addColorStop(1, 'rgba(255, 215, 120, 0.85)');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(s * 0.48, s * -0.48);
  ctx.lineTo(s * -0.08, s * -0.12);
  ctx.lineTo(s * 0.12, s * 0.08);
  ctx.closePath();
  ctx.fill();
  ball(ctx, s * 0.15, '#fff1a8', '#ff9d5c');
  ctx.fillStyle = '#ff7ab8';
  dot(ctx, s * -0.02, s * 0.03, s * 0.04);
  ctx.fillStyle = '#7de0ff';
  dot(ctx, s * 0.05, s * -0.05, s * 0.03);
};

const paintWrapped: Painter = (ctx, s) => {
  ctx.fillStyle = '#7de0ff';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.15, 0);
    ctx.lineTo(side * s * 0.46, s * -0.2);
    ctx.lineTo(side * s * 0.46, s * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ball(ctx, s * 0.24, '#d6f6ff', '#31a7e0');
};

const paintNebula: Painter = (ctx, s) => {
  for (const [x, y, r, color] of [
    [-0.18, 0, 0.3, 'rgba(90, 200, 255, 0.2)'],
    [0.18, -0.1, 0.26, 'rgba(160, 130, 255, 0.2)'],
    [0.08, 0.18, 0.26, 'rgba(130, 240, 230, 0.16)'],
  ] as const) {
    const glow = ctx.createRadialGradient(s * x, s * y, 0, s * x, s * y, s * r);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(90, 200, 255, 0)');
    ctx.fillStyle = glow;
    dot(ctx, s * x, s * y, s * r);
  }
};

const paintIcePlanet: Painter = (ctx, s) => {
  const r = s * 0.42;
  ball(ctx, r, '#e8fbff', '#4c9bd6');
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = s * 0.02;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(r * -0.8, r * -0.1);
  ctx.lineTo(r * -0.3, r * -0.2);
  ctx.lineTo(r * -0.05, r * 0.25);
  ctx.lineTo(r * 0.45, r * 0.1);
  ctx.lineTo(r * 0.8, r * 0.4);
  ctx.moveTo(r * -0.05, r * 0.25);
  ctx.lineTo(r * -0.2, r * 0.75);
  ctx.stroke();
};

const paintCrystal: Painter = (ctx, s) => {
  ctx.fillStyle = 'rgba(190, 240, 255, 0.85)';
  ctx.beginPath();
  ctx.moveTo(0, s * -0.46);
  ctx.lineTo(s * 0.18, 0);
  ctx.lineTo(0, s * 0.46);
  ctx.lineTo(s * -0.18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(0, s * -0.46);
  ctx.lineTo(s * 0.18, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
};

const paintSleepyStar: Painter = (ctx, s) => {
  const glow = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s * 0.5);
  glow.addColorStop(0, 'rgba(255, 210, 110, 0.5)');
  glow.addColorStop(1, 'rgba(255, 210, 110, 0)');
  ctx.fillStyle = glow;
  dot(ctx, 0, 0, s * 0.5);
  ball(ctx, s * 0.3, '#fff0b3', '#ffae3c');
  ctx.strokeStyle = '#7a4a10';
  ctx.lineWidth = s * 0.018;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * s * 0.11, s * -0.03, s * 0.055, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a10';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.03, s * 0.04, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff7a7a';
  ctx.beginPath();
  ctx.moveTo(s * -0.24, s * -0.17);
  ctx.quadraticCurveTo(0, s * -0.5, s * 0.3, s * -0.36);
  ctx.quadraticCurveTo(s * 0.14, s * -0.32, s * 0.24, s * -0.17);
  ctx.quadraticCurveTo(0, s * -0.24, s * -0.24, s * -0.17);
  ctx.fill();
  ctx.fillStyle = '#fff';
  dot(ctx, s * 0.31, s * -0.34, s * 0.04);
};

const paintCrescent: Painter = (ctx, s) => {
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.42, Math.PI * 0.35, Math.PI * 1.65);
  ctx.quadraticCurveTo(s * -0.18, 0, s * 0.14, s * 0.38);
  ctx.fill();
};

export const SCENERY_PAINTERS: Record<string, Painter> = {
  'sky:moon': paintMoon,
  'sky:base': paintBase,
  'sky:rings': paintRinged,
  'sky:lilac': paintLilac,
  'sky:lollipop': paintLollipop,
  'sky:comet': paintCandyComet,
  'sky:wrapped': paintWrapped,
  'sky:nebula': paintNebula,
  'sky:ice': paintIcePlanet,
  'sky:crystal': paintCrystal,
  'sky:sleepy': paintSleepyStar,
  'sky:crescent': paintCrescent,
};

export const THEMES: Record<LevelId, Theme> = {
  moon: {
    sky: ['#0d1033', '#1c1a55', '#3a2a78'],
    starTint: '#ffffff',
    scenery: [
      { art: 'sky:moon', u: 0.82, v: 0.1, drift: 0.16, size: 0.3 },
      { art: 'sky:base', u: 0.2, v: 0.55, drift: 0.16, size: 0.22 },
      { art: 'sky:lilac', u: 0.12, v: -0.25, drift: 0.26, size: 0.07 },
    ],
  },
  ring: {
    sky: ['#1b0f3f', '#3c1760', '#7a2a6e'],
    starTint: '#ffe3f0',
    scenery: [
      { art: 'sky:rings', u: 0.22, v: 0.16, drift: 0.14, size: 0.42 },
      { art: 'sky:lilac', u: 0.86, v: 0.5, drift: 0.22, size: 0.1 },
      { art: 'sky:lilac', u: 0.7, v: -0.3, drift: 0.3, size: 0.05 },
    ],
  },
  candy: {
    sky: ['#2a1050', '#6b1f7c', '#d0508f'],
    starTint: '#fff3b0',
    scenery: [
      { art: 'sky:lollipop', u: 0.8, v: 0.3, drift: 0.16, size: 0.2 },
      { art: 'sky:comet', u: 0.2, v: 0.1, drift: 0.2, size: 0.34 },
      { art: 'sky:wrapped', u: 0.42, v: -0.3, drift: 0.28, size: 0.1 },
      { art: 'sky:wrapped', u: 0.92, v: 0.75, drift: 0.24, size: 0.08 },
    ],
  },
  ice: {
    sky: ['#04163a', '#0c3a6b', '#1c7a9c'],
    starTint: '#c8f4ff',
    scenery: [
      { art: 'sky:nebula', u: 0.5, v: 0.3, drift: 0.05, size: 0.95 },
      { art: 'sky:ice', u: 0.15, v: 0.28, drift: 0.14, size: 0.24 },
      { art: 'sky:crystal', u: 0.86, v: 0.2, drift: 0.26, size: 0.11 },
      { art: 'sky:crystal', u: 0.7, v: 0.72, drift: 0.2, size: 0.07 },
    ],
  },
  sleepy: {
    sky: ['#0a0a2a', '#1a1648', '#4a2a5e'],
    starTint: '#ffe9b0',
    scenery: [
      { art: 'sky:sleepy', u: 0.76, v: 0.14, drift: 0.12, size: 0.36 },
      { art: 'sky:crescent', u: 0.16, v: 0.5, drift: 0.2, size: 0.1 },
      { art: 'sky:lilac', u: 0.34, v: -0.2, drift: 0.26, size: 0.05 },
    ],
  },
};

/** The one picture that stands for a planet on its card. */
export const LEVEL_ART: Record<LevelId, string> = {
  moon: 'sky:moon',
  ring: 'sky:rings',
  candy: 'sky:lollipop',
  ice: 'sky:ice',
  sleepy: 'sky:sleepy',
};
