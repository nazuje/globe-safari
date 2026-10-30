import type { RunnerId } from './runners.ts';

export interface Pose {
  /** Where the legs are in their stride, in radians. */
  stride: number;
  air: boolean;
  /** Going up, as opposed to coming down. */
  rising: boolean;
  /** Squash and stretch: 1 is normal. */
  scaleX: number;
  scaleY: number;
  angle: number;
  cheer: boolean;
}

export const STANDING: Pose = { stride: 0, air: false, rising: false, scaleX: 1, scaleY: 1, angle: 0, cheer: false };

interface Colors {
  body: string;
  belly: string;
  limb: string;
  arm: string;
  ink: string;
}

const COLORS: Record<RunnerId, Colors> = {
  bunny: { body: '#fbf3e8', belly: '#ffd9e6', limb: '#efe0cf', arm: '#efe0cf', ink: '#4a3a4a' },
  fox: { body: '#ff8c3a', belly: '#fff3e2', limb: '#4a3030', arm: '#e8732a', ink: '#3a2420' },
  robot: { body: '#a7bccf', belly: '#5fd9ff', limb: '#7f93a8', arm: '#7f93a8', ink: '#2c3a4a' },
  kitten: { body: '#bfa6e8', belly: '#f3ebff', limb: '#a488d6', arm: '#a488d6', ink: '#3a2c55' },
  dino: { body: '#5fd068', belly: '#d9f7a8', limb: '#43b04f', arm: '#43b04f', ink: '#20502a' },
  penguin: { body: '#2f3f6e', belly: '#ffffff', limb: '#ff9d3c', arm: '#1f2c52', ink: '#1a2340' },
};

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, angle = 0): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

function triangle(ctx: CanvasRenderingContext2D, points: readonly number[], fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0]!, points[1]!);
  ctx.lineTo(points[2]!, points[3]!);
  ctx.lineTo(points[4]!, points[5]!);
  ctx.closePath();
  ctx.fill();
}

function legs(ctx: CanvasRenderingContext2D, pose: Pose, color: string): void {
  for (const side of [0, 1]) {
    const swing = pose.stride + side * Math.PI;
    let footX = Math.sin(swing) * 11;
    let footY = -5 - Math.max(0, Math.cos(swing)) * 7;
    if (pose.air) {
      footX = (side ? 9 : -7) * (pose.rising ? 1 : 0.7);
      footY = pose.rising ? -9 + side * 3 : -3;
    }
    if (pose.cheer) {
      footX = side ? 8 : -8;
      footY = -4;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(side ? 4 : -4, -15);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    blob(ctx, footX + 2, footY + 1, 6, 4, color);
  }
}

function arm(ctx: CanvasRenderingContext2D, pose: Pose, color: string, side: 0 | 1): void {
  const swing = pose.stride + (side ? 0 : Math.PI);
  const up = pose.cheer || (pose.air && pose.rising);
  const x = up ? (side ? 13 : -11) : Math.sin(swing) * 10;
  const y = up ? -40 - Math.sin(pose.stride * 2) * 2 : -18 + Math.abs(Math.cos(swing)) * 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(side ? 6 : -6, -27);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function eyes(ctx: CanvasRenderingContext2D, colors: Colors, cx: number, cy: number, spread = 6.5): void {
  for (const side of [-1, 1]) {
    const x = cx + side * spread;
    blob(ctx, x, cy, 4.6, 5.4, '#fff');
    blob(ctx, x + 1.1, cy + 0.6, 3, 3.6, colors.ink);
    blob(ctx, x + 2, cy - 1, 1.1, 1.1, '#fff');
  }
}

function smile(ctx: CanvasRenderingContext2D, colors: Colors, cx: number, cy: number, open: boolean): void {
  ctx.strokeStyle = colors.ink;
  ctx.fillStyle = '#e85a70';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0.15, Math.PI - 0.15);
  if (open) {
    ctx.closePath();
    ctx.fill();
  }
  ctx.stroke();
}

function cheeks(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  for (const side of [-1, 1]) blob(ctx, cx + side * 10.5, cy, 3, 2, 'rgba(255,120,140,0.55)');
}

function behind(ctx: CanvasRenderingContext2D, id: RunnerId, colors: Colors, pose: Pose): void {
  const wag = Math.sin(pose.stride * 0.5) * 3;
  switch (id) {
    case 'bunny':
      blob(ctx, -12, -18, 5.5, 5.5, '#fff');
      return;
    case 'fox':
      blob(ctx, -17, -21 + wag, 12, 6, colors.body, -0.6 + wag * 0.05);
      blob(ctx, -25, -27 + wag, 5, 3.6, '#fff3e2', -0.6);
      return;
    case 'kitten':
      ctx.strokeStyle = colors.body;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, -17);
      ctx.quadraticCurveTo(-22, -20, -20, -32 + wag);
      ctx.stroke();
      return;
    case 'dino':
      triangle(ctx, [-6, -24, -6, -11, -26, -12 + wag], colors.body);
      for (const [x, y] of [[-3, -49], [-11, -36], [-16, -26]] as const) triangle(ctx, [x - 4, y + 5, x + 3, y + 4, x - 2, y - 4], '#ff9d3c');
      return;
    case 'robot':
      blob(ctx, -11, -19, 3.5, 6, '#ffb03c');
      return;
    case 'penguin':
      return;
  }
}

function ears(ctx: CanvasRenderingContext2D, id: RunnerId, colors: Colors, pose: Pose): void {
  const flop = pose.air ? (pose.rising ? 0.45 : -0.2) : Math.sin(pose.stride) * 0.1;
  switch (id) {
    case 'bunny':
      for (const side of [-1, 1]) {
        const angle = side * 0.16 - flop;
        blob(ctx, 2 + side * 6, -60, 4.6, 13, colors.body, angle);
        blob(ctx, 2 + side * 6, -60, 2.3, 9, colors.belly, angle);
      }
      return;
    case 'fox':
      for (const side of [-1, 1]) {
        triangle(ctx, [2 + side * 4, -48, 2 + side * 14, -44, 2 + side * 11, -60], colors.body);
        triangle(ctx, [2 + side * 8.5, -55, 2 + side * 12, -54, 2 + side * 11, -60], colors.ink);
      }
      return;
    case 'kitten':
      for (const side of [-1, 1]) {
        triangle(ctx, [2 + side * 4, -48, 2 + side * 14, -44, 2 + side * 12, -58], colors.body);
        triangle(ctx, [2 + side * 7, -48, 2 + side * 12, -46, 2 + side * 11.5, -54], '#ffc6dc');
      }
      return;
    default:
      return;
  }
}

function face(ctx: CanvasRenderingContext2D, id: RunnerId, colors: Colors, pose: Pose): void {
  const open = pose.air || pose.cheer;
  const cx = 2;
  const cy = -38;
  if (id === 'robot') {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(cx - 15, cy - 13, 30, 26, 7);
    ctx.fill();
    ctx.strokeStyle = colors.limb;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 13);
    ctx.lineTo(cx, cy - 20);
    ctx.stroke();
    blob(ctx, cx, cy - 22, 3.2, 3.2, '#ff6b6b');
    ctx.fillStyle = '#20324a';
    ctx.beginPath();
    ctx.roundRect(cx - 12, cy - 8, 24, 11, 5);
    ctx.fill();
    for (const side of [-1, 1]) blob(ctx, cx + side * 5.5, cy - 2.5, 3, 3, colors.belly);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 8);
    ctx.lineTo(cx + 5, cy + 8);
    ctx.stroke();
    return;
  }
  blob(ctx, cx, cy, 16, 14.5, colors.body);
  if (id === 'fox') {
    triangle(ctx, [cx - 15, cy + 1, cx + 15, cy + 1, cx, cy + 14], colors.belly);
    blob(ctx, cx, cy + 5, 2.6, 2, colors.ink);
  }
  if (id === 'penguin') {
    blob(ctx, cx - 5.5, cy, 8, 9, colors.belly);
    blob(ctx, cx + 5.5, cy, 8, 9, colors.belly);
    blob(ctx, cx, cy + 6, 9, 6, colors.belly);
  }
  if (id === 'kitten') {
    for (const side of [-1, 1]) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + side * 10, cy + 4);
      ctx.lineTo(cx + side * 18, cy + 2);
      ctx.moveTo(cx + side * 10, cy + 6);
      ctx.lineTo(cx + side * 18, cy + 7);
      ctx.stroke();
    }
    blob(ctx, cx, cy + 3.4, 1.8, 1.3, '#e85a70');
  }
  if (id === 'dino') for (const side of [-1, 1]) blob(ctx, cx + side * 3.6, cy + 2.6, 1, 0.8, colors.ink);
  if (id === 'bunny') blob(ctx, cx, cy + 3.6, 2, 1.4, '#ff8fa8');
  eyes(ctx, colors, cx, cy - 2.5);
  if (id === 'penguin') triangle(ctx, [cx - 5, cy + 3, cx + 5, cy + 3, cx, cy + 9], colors.limb);
  else smile(ctx, colors, cx, cy + 5.5, open);
  cheeks(ctx, cx, cy + 3.5);
}

/** Draws a runner standing on (x, y), facing right, about `size` tall. */
export function drawRunner(ctx: CanvasRenderingContext2D, id: RunnerId, x: number, y: number, size: number, pose: Pose): void {
  const colors = COLORS[id];
  const scale = size / 60;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * pose.scaleX, scale * pose.scaleY);
  if (pose.angle !== 0) {
    ctx.translate(0, -28);
    ctx.rotate(pose.angle);
    ctx.translate(0, 28);
  }
  behind(ctx, id, colors, pose);
  arm(ctx, pose, colors.arm, 0);
  legs(ctx, pose, colors.limb);
  if (id === 'robot') {
    ctx.fillStyle = colors.body;
    ctx.beginPath();
    ctx.roundRect(-11, -31, 22, 21, 6);
    ctx.fill();
    blob(ctx, 0, -21, 5, 5, colors.belly);
  } else {
    blob(ctx, 0, -20, 12, 13, colors.body);
    blob(ctx, 1.5, -18, 7.5, 9, colors.belly);
  }
  ears(ctx, id, colors, pose);
  face(ctx, id, colors, pose);
  arm(ctx, pose, colors.arm, 1);
  ctx.restore();
}
