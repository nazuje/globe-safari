import { LOOKS, type Body, type KindId, type Look, type Top } from './kinds.ts';

/**
 * All the pictures, painted with canvas shapes so nothing depends on which emoji a
 * tablet has. A painter draws around (0, 0) in a box `s` wide. sprites.ts paints each
 * one once and stamps the result, because shapes are slow to redraw every frame.
 */
export type Painter = (ctx: CanvasRenderingContext2D, s: number) => void;
export type Mood = 'grumpy' | 'smirk' | 'laugh';

const INK = '#2b2140';
const TAU = Math.PI * 2;

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, turn = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, turn, 0, TAU);
  ctx.fill();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points = 5): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const angle = -Math.PI / 2 + (i * Math.PI) / points;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
}

function bodyPath(ctx: CanvasRenderingContext2D, body: Body, s: number): void {
  ctx.beginPath();
  switch (body) {
    case 'round':
      ctx.ellipse(0, s * 0.03, s * 0.4, s * 0.38, 0, 0, TAU);
      break;
    case 'bean':
      ctx.ellipse(0, s * 0.03, s * 0.34, s * 0.42, 0, 0, TAU);
      break;
    case 'cloud':
      for (const [x, y, r] of [
        [-0.2, 0.1, 0.23],
        [0.2, 0.1, 0.23],
        [-0.14, -0.12, 0.23],
        [0.14, -0.12, 0.23],
        [0, 0.17, 0.25],
      ] as const) {
        ctx.moveTo(s * (x + r), s * y);
        ctx.arc(s * x, s * y, s * r, 0, TAU);
      }
      break;
    case 'cube':
      ctx.roundRect(s * -0.36, s * -0.33, s * 0.72, s * 0.72, s * 0.17);
      break;
    case 'pear':
      ctx.moveTo(0, s * -0.38);
      ctx.bezierCurveTo(s * 0.2, s * -0.38, s * 0.2, s * -0.14, s * 0.3, s * 0.02);
      ctx.bezierCurveTo(s * 0.46, s * 0.3, s * 0.26, s * 0.42, 0, s * 0.42);
      ctx.bezierCurveTo(s * -0.26, s * 0.42, s * -0.46, s * 0.3, s * -0.3, s * 0.02);
      ctx.bezierCurveTo(s * -0.2, s * -0.14, s * -0.2, s * -0.38, 0, s * -0.38);
      break;
    case 'star':
      starPath(ctx, 0, s * 0.04, s * 0.47, s * 0.3);
      break;
    case 'squid':
      ctx.moveTo(s * -0.36, s * 0.3);
      ctx.bezierCurveTo(s * -0.44, s * -0.5, s * 0.44, s * -0.5, s * 0.36, s * 0.3);
      for (let i = 0; i < 4; i++) {
        const x = s * (0.36 - i * 0.18);
        ctx.quadraticCurveTo(x - s * 0.09, s * 0.52, x - s * 0.18, s * 0.3);
      }
      break;
  }
  ctx.closePath();
}

function paintTop(ctx: CanvasRenderingContext2D, top: Top, color: string, accent: string, s: number): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.035;
  switch (top) {
    case 'antenna':
      ctx.strokeStyle = color;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.1, s * -0.3);
        ctx.quadraticCurveTo(side * s * 0.14, s * -0.44, side * s * 0.23, s * -0.48);
        ctx.stroke();
        ctx.fillStyle = accent;
        dot(ctx, side * s * 0.24, s * -0.49, s * 0.055);
      }
      break;
    case 'horns':
      ctx.fillStyle = accent;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.09, s * -0.28);
        ctx.quadraticCurveTo(side * s * 0.3, s * -0.36, side * s * 0.3, s * -0.5);
        ctx.quadraticCurveTo(side * s * 0.4, s * -0.3, side * s * 0.27, s * -0.17);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'ears':
      ctx.fillStyle = color;
      for (const side of [-1, 1]) {
        oval(ctx, side * s * 0.28, s * -0.3, s * 0.11, s * 0.17, side * 0.5);
      }
      ctx.fillStyle = accent;
      for (const side of [-1, 1]) {
        oval(ctx, side * s * 0.28, s * -0.3, s * 0.055, s * 0.1, side * 0.5);
      }
      break;
    case 'tuft':
      ctx.fillStyle = accent;
      for (const lean of [-0.3, 0, 0.3]) {
        oval(ctx, lean * s * 0.45, s * -0.4, s * 0.05, s * 0.13, lean);
      }
      break;
    case 'cap':
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(s * -0.24, s * -0.26);
      ctx.quadraticCurveTo(0, s * -0.68, s * 0.32, s * -0.44);
      ctx.quadraticCurveTo(s * 0.12, s * -0.44, s * 0.24, s * -0.26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      dot(ctx, s * 0.33, s * -0.42, s * 0.06);
      oval(ctx, 0, s * -0.27, s * 0.26, s * 0.05);
      break;
    case 'none':
      break;
  }
}

function paintEyeGrumpy(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frown: number): void {
  ctx.fillStyle = '#fff';
  dot(ctx, x, y, r);
  ctx.fillStyle = INK;
  dot(ctx, x, y + r * 0.2, r * 0.52);
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 1.15, y - r * 1.05 - frown * r * 0.5);
  ctx.lineTo(x + r * 1.15, y - r * 1.05 + frown * r * 0.5);
  ctx.stroke();
}

function paintEyeClosed(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.35, r * 0.85, Math.PI * 1.1, Math.PI * 1.9);
  ctx.stroke();
}

function eyeSpots(count: number, s: number): number[] {
  if (count === 1) return [0];
  if (count === 2) return [-s * 0.15, s * 0.15];
  return [-s * 0.2, 0, s * 0.2];
}

function paintFace(ctx: CanvasRenderingContext2D, look: Look, mood: Mood, s: number): void {
  const y = look.body === 'pear' ? s * -0.06 : s * -0.07;
  const r = s * (look.eyes === 1 ? 0.13 : look.eyes === 3 ? 0.075 : 0.09);
  eyeSpots(look.eyes, s).forEach((x) => {
    // Brows lean in toward the middle of the face. A single eye gets a flat, cross one.
    const frown = x === 0 ? 0 : x < 0 ? 1 : -1;
    if (mood === 'laugh') paintEyeClosed(ctx, x, y, r);
    else paintEyeGrumpy(ctx, x, y, r, mood === 'smirk' ? frown * 0.3 : frown);
  });
  const mouth = y + s * 0.25;
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.03;
  if (mood === 'grumpy') {
    ctx.beginPath();
    ctx.arc(0, mouth + s * 0.09, s * 0.1, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    return;
  }
  if (mood === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(s * -0.13, mouth);
    ctx.quadraticCurveTo(s * 0.02, mouth + s * 0.07, s * 0.14, mouth - s * 0.05);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, mouth - s * 0.03, s * 0.17, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a8a';
  oval(ctx, 0, mouth + s * 0.09, s * 0.09, s * 0.05);
  ctx.fillStyle = '#fff';
  ctx.fillRect(s * -0.1, mouth - s * 0.03, s * 0.2, s * 0.035);
  ctx.fillStyle = 'rgba(255, 110, 140, 0.55)';
  oval(ctx, s * -0.25, mouth - s * 0.05, s * 0.06, s * 0.04);
  oval(ctx, s * 0.25, mouth - s * 0.05, s * 0.06, s * 0.04);
  ctx.fillStyle = '#9be7ff';
  oval(ctx, s * -0.3, y + s * 0.06, s * 0.03, s * 0.05);
  oval(ctx, s * 0.3, y + s * 0.06, s * 0.03, s * 0.05);
}

function shine(ctx: CanvasRenderingContext2D, body: Body, s: number): void {
  ctx.save();
  bodyPath(ctx, body, s);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  oval(ctx, s * -0.12, s * -0.2, s * 0.26, s * 0.14, -0.4);
  ctx.fillStyle = 'rgba(30, 10, 60, 0.13)';
  oval(ctx, 0, s * 0.5, s * 0.5, s * 0.22);
  ctx.restore();
}

export function paintAlien(kind: KindId, mood: Mood): Painter {
  const look = LOOKS[kind];
  return (ctx, s) => {
    const color = mood === 'grumpy' ? look.grumpy : look.happy;
    paintTop(ctx, look.top, color, look.accent, s);
    ctx.fillStyle = color;
    ctx.lineJoin = 'round';
    bodyPath(ctx, look.body, s);
    ctx.fill();
    if (look.body === 'star') {
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.1;
      ctx.stroke();
    }
    shine(ctx, look.body, s);
    paintFace(ctx, look, mood, s);
  };
}

/** A boss sulks rather than scowls: big round eyes, puffed cheeks and a tiny wobbly pout. */
function paintSulk(ctx: CanvasRenderingContext2D, smirk: boolean, s: number): void {
  for (const side of [-1, 1]) {
    const x = side * s * 0.15;
    const y = s * -0.06;
    ctx.fillStyle = '#fff';
    dot(ctx, x, y, s * 0.095);
    ctx.fillStyle = INK;
    dot(ctx, x + s * 0.03, y + s * 0.02, s * 0.06);
    ctx.fillStyle = '#fff';
    dot(ctx, x + s * 0.05, y, s * 0.02);
    // Short soft brows, tipped just enough to look huffy.
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.03;
    const tip = smirk ? 0.01 : 0.035;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.07, y - s * 0.145 - side * tip);
    ctx.lineTo(x + s * 0.07, y - s * 0.145 + side * tip);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 130, 160, 0.5)';
    oval(ctx, side * s * 0.27, s * 0.09, s * 0.08, s * 0.06);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.026;
  ctx.beginPath();
  if (smirk) {
    ctx.moveTo(s * -0.08, s * 0.13);
    ctx.quadraticCurveTo(s * -0.03, s * 0.17, 0, s * 0.14);
    ctx.quadraticCurveTo(s * 0.04, s * 0.17, s * 0.09, s * 0.11);
  } else {
    ctx.arc(0, s * 0.17, s * 0.05, Math.PI * 1.15, Math.PI * 1.85);
  }
  ctx.stroke();
}

/** A boss is the same creature made huge, round and fluffy, with a soft tummy. */
export function paintBoss(kind: KindId, mood: Mood): Painter {
  const look = LOOKS[kind];
  return (ctx, s) => {
    const color = mood === 'grumpy' ? look.grumpy : look.happy;
    paintTop(ctx, look.top, color, look.accent, s);
    ctx.fillStyle = color;
    const tufts = 18;
    for (let i = 0; i < tufts; i++) {
      const angle = (i / tufts) * TAU;
      dot(ctx, Math.cos(angle) * s * 0.38, s * 0.03 + Math.sin(angle) * s * 0.37, s * 0.085);
    }
    oval(ctx, 0, s * 0.03, s * 0.41, s * 0.4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    oval(ctx, 0, s * 0.24, s * 0.22, s * 0.14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    oval(ctx, s * -0.16, s * -0.22, s * 0.15, s * 0.07, -0.4);
    // Stubby arms, folded in a huff, then flung up when it can't hold the laugh in.
    ctx.fillStyle = color;
    for (const side of [-1, 1]) {
      if (mood === 'laugh') oval(ctx, side * s * 0.44, s * -0.08, s * 0.07, s * 0.13, side * 0.5);
      else oval(ctx, side * s * 0.17, s * 0.27, s * 0.13, s * 0.065, side * -0.35);
    }
    if (mood === 'laugh') {
      ctx.save();
      ctx.translate(0, s * -0.02);
      paintFace(ctx, { ...look, eyes: 2, body: 'round' }, mood, s * 1.05);
      ctx.restore();
    } else {
      paintSulk(ctx, mood === 'smirk', s);
    }
  };
}

export const paintShip: Painter = (ctx, s) => paintRocket(ctx, s, '#fff4e0', '#ff6b6b', '#4cb8ff');
export const paintHelper: Painter = (ctx, s) => paintRocket(ctx, s, '#fff4e0', '#3ecf8e', '#ffc93c');

function paintRocket(ctx: CanvasRenderingContext2D, s: number, hull: string, trim: string, glass: string): void {
  ctx.fillStyle = trim;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.14, s * 0.02);
    ctx.quadraticCurveTo(side * s * 0.42, s * 0.14, side * s * 0.38, s * 0.42);
    ctx.quadraticCurveTo(side * s * 0.26, s * 0.3, side * s * 0.12, s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(0, s * -0.48);
  ctx.bezierCurveTo(s * 0.26, s * -0.3, s * 0.27, s * 0.14, s * 0.18, s * 0.38);
  ctx.lineTo(s * -0.18, s * 0.38);
  ctx.bezierCurveTo(s * -0.27, s * 0.14, s * -0.26, s * -0.3, 0, s * -0.48);
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(0, s * -0.48);
  ctx.bezierCurveTo(s * 0.12, s * -0.4, s * 0.18, s * -0.3, s * 0.2, s * -0.22);
  ctx.quadraticCurveTo(0, s * -0.3, s * -0.2, s * -0.22);
  ctx.bezierCurveTo(s * -0.18, s * -0.3, s * -0.12, s * -0.4, 0, s * -0.48);
  ctx.fill();
  ctx.fillRect(s * -0.17, s * 0.28, s * 0.34, s * 0.1);
  ctx.fillStyle = '#c9d3e6';
  dot(ctx, 0, s * -0.04, s * 0.15);
  ctx.fillStyle = glass;
  dot(ctx, 0, s * -0.04, s * 0.125);
  // The little pilot, delighted about everything.
  ctx.fillStyle = INK;
  dot(ctx, s * -0.045, s * -0.07, s * 0.018);
  dot(ctx, s * 0.045, s * -0.07, s * 0.018);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.016;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, s * -0.04, s * 0.055, 0.3, Math.PI - 0.3);
  ctx.stroke();
}

export const paintFlame: Painter = (ctx, s) => {
  ctx.fillStyle = '#ff9d2e';
  oval(ctx, 0, 0, s * 0.3, s * 0.48);
  ctx.fillStyle = '#ffe066';
  oval(ctx, 0, s * -0.08, s * 0.17, s * 0.3);
};

export function paintFeather(color: string): Painter {
  return (ctx, s) => {
    ctx.rotate(0.25);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, s * -0.48);
    ctx.bezierCurveTo(s * 0.3, s * -0.3, s * 0.26, s * 0.14, s * 0.02, s * 0.3);
    ctx.bezierCurveTo(s * -0.26, s * 0.14, s * -0.28, s * -0.3, 0, s * -0.48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, s * -0.38);
    ctx.lineTo(s * 0.01, s * 0.48);
    ctx.stroke();
    ctx.lineWidth = s * 0.02;
    for (let i = 0; i < 4; i++) {
      const y = s * (-0.24 + i * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, y + s * 0.06);
      ctx.lineTo(s * 0.16, y - s * 0.04);
      ctx.moveTo(0, y + s * 0.06);
      ctx.lineTo(s * -0.16, y - s * 0.04);
      ctx.stroke();
    }
  };
}

export const paintBubble: Painter = (ctx, s) => {
  ctx.fillStyle = 'rgba(140, 225, 255, 0.4)';
  dot(ctx, 0, 0, s * 0.45);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.45, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  oval(ctx, s * -0.18, s * -0.2, s * 0.09, s * 0.06, -0.6);
  ctx.fillStyle = INK;
  dot(ctx, s * -0.09, s * -0.02, s * 0.03);
  dot(ctx, s * 0.11, s * -0.02, s * 0.03);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.03;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(s * 0.01, s * 0.04, s * 0.11, 0.3, Math.PI - 0.3);
  ctx.stroke();
};

export const paintGoo: Painter = (ctx, s) => {
  ctx.fillStyle = '#7ddc3e';
  ctx.beginPath();
  ctx.moveTo(0, s * -0.46);
  ctx.bezierCurveTo(s * 0.12, s * -0.2, s * 0.4, s * -0.08, s * 0.38, s * 0.14);
  ctx.bezierCurveTo(s * 0.36, s * 0.42, s * -0.36, s * 0.42, s * -0.38, s * 0.14);
  ctx.bezierCurveTo(s * -0.4, s * -0.08, s * -0.12, s * -0.2, 0, s * -0.46);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  oval(ctx, s * -0.16, s * 0.04, s * 0.08, s * 0.12, 0.4);
  ctx.fillStyle = INK;
  dot(ctx, s * -0.04, s * 0.12, s * 0.035);
  dot(ctx, s * 0.14, s * 0.12, s * 0.035);
};

export const paintStar: Painter = (ctx, s) => {
  ctx.fillStyle = '#ffd43b';
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = s * 0.1;
  ctx.lineJoin = 'round';
  starPath(ctx, 0, s * 0.02, s * 0.42, s * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  oval(ctx, s * -0.08, s * -0.08, s * 0.08, s * 0.05, -0.5);
};

export const paintSpark: Painter = (ctx, s) => {
  ctx.fillStyle = '#fff6c9';
  starPath(ctx, 0, 0, s * 0.48, s * 0.1, 4);
  ctx.fill();
};

export function paintDot(color: string): Painter {
  return (ctx, s) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(s * -0.3, s * -0.15, s * 0.6, s * 0.3, s * 0.1);
    ctx.fill();
  };
}

export function paintWord(word: string, color: string): Painter {
  return (ctx, s) => {
    ctx.font = `700 ${s * 0.5}px Fredoka, ui-rounded, system-ui, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.1;
    ctx.strokeStyle = INK;
    ctx.fillStyle = color;
    ctx.strokeText(word, 0, 0);
    ctx.fillText(word, 0, 0);
  };
}

function badge(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  dot(ctx, 0, 0, s * 0.5);
  ctx.fillStyle = color;
  dot(ctx, 0, 0, s * 0.43);
}

export const paintPowerTriple: Painter = (ctx, s) => {
  badge(ctx, s, '#ff7ab8');
  const feather = paintFeather('#fff1a8');
  for (const lean of [-0.55, 0, 0.55]) {
    ctx.save();
    ctx.rotate(lean);
    ctx.translate(0, s * -0.05);
    feather(ctx, s * 0.62);
    ctx.restore();
  }
};

export const paintPowerWave: Painter = (ctx, s) => {
  badge(ctx, s, '#4cb8ff');
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.08;
  for (const y of [-0.2, 0, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(s * -0.3, s * y);
    ctx.bezierCurveTo(s * -0.15, s * (y - 0.14), s * -0.05, s * (y + 0.14), 0, s * y);
    ctx.bezierCurveTo(s * 0.05, s * (y - 0.14), s * 0.15, s * (y + 0.14), s * 0.3, s * y);
    ctx.stroke();
  }
};

export const paintPowerMagnet: Painter = (ctx, s) => {
  badge(ctx, s, '#8b5cf6');
  ctx.lineCap = 'butt';
  ctx.lineWidth = s * 0.15;
  ctx.strokeStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.moveTo(s * -0.17, s * -0.26);
  ctx.lineTo(s * -0.17, s * 0.02);
  ctx.arc(0, s * 0.02, s * 0.17, Math.PI, 0, true);
  ctx.lineTo(s * 0.17, s * -0.26);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.17, s * -0.3);
    ctx.lineTo(side * s * 0.17, s * -0.18);
    ctx.stroke();
  }
};

export const paintPowerHelper: Painter = (ctx, s) => {
  badge(ctx, s, '#3ecf8e');
  paintHelper(ctx, s * 0.72);
};

export const paintCat: Painter = (ctx, s) => {
  // The comet goes first, so the cat sits on it.
  const tail = ctx.createLinearGradient(s * -0.5, 0, s * 0.1, 0);
  tail.addColorStop(0, 'rgba(120, 220, 255, 0)');
  tail.addColorStop(1, 'rgba(160, 235, 255, 0.95)');
  ctx.fillStyle = tail;
  ctx.beginPath();
  ctx.moveTo(s * -0.5, s * 0.05);
  ctx.quadraticCurveTo(s * -0.1, s * 0.02, s * 0.1, s * 0.03);
  ctx.lineTo(s * 0.2, s * 0.34);
  ctx.quadraticCurveTo(s * -0.1, s * 0.34, s * -0.5, s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6f6ff';
  dot(ctx, s * 0.14, s * 0.2, s * 0.19);
  ctx.fillStyle = '#ffffff';
  dot(ctx, s * 0.09, s * 0.15, s * 0.07);
  // And now the cat.
  ctx.fillStyle = '#ffb25c';
  oval(ctx, s * 0.14, s * -0.02, s * 0.15, s * 0.11);
  dot(ctx, s * 0.24, s * -0.14, s * 0.135);
  for (const x of [0.15, 0.31]) {
    ctx.beginPath();
    ctx.moveTo(s * (x - 0.05), s * -0.21);
    ctx.lineTo(s * (x + 0.02), s * -0.33);
    ctx.lineTo(s * (x + 0.07), s * -0.21);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffb25c';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.02, s * 0);
  ctx.quadraticCurveTo(s * -0.14, s * -0.02, s * -0.1, s * -0.18);
  ctx.stroke();
  ctx.fillStyle = INK;
  dot(ctx, s * 0.2, s * -0.16, s * 0.018);
  dot(ctx, s * 0.29, s * -0.16, s * 0.018);
  ctx.fillStyle = '#ff7a8a';
  dot(ctx, s * 0.245, s * -0.115, s * 0.014);
};

function handShape(ctx: CanvasRenderingContext2D, s: number, grow: number): void {
  for (const [x, length, lean] of [
    [-0.27, 0.26, 0.28],
    [-0.09, 0.33, 0.08],
    [0.09, 0.33, -0.08],
    [0.27, 0.26, -0.28],
  ] as const) {
    oval(ctx, s * x, s * (0.12 + length * 0.5), s * 0.09 + grow, s * length * 0.64 + grow, lean);
  }
  oval(ctx, 0, s * -0.02, s * 0.38 + grow, s * 0.3 + grow);
  oval(ctx, s * 0.42, s * -0.08, s * 0.08 + grow, s * 0.2 + grow, -0.7);
}

/** A big soft hand with its fingers pointing down at the ship. The white edge lifts it off the boss. */
export function paintHandIn(color: string): Painter {
  return (ctx, s) => {
    ctx.fillStyle = '#fff';
    handShape(ctx, s, s * 0.03);
    ctx.fillStyle = color;
    handShape(ctx, s, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    oval(ctx, 0, s * 0.02, s * 0.22, s * 0.17);
  };
}

export const paintFinger: Painter = (ctx, s) => {
  ctx.font = `${s * 0.9}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText('👆', 0, s * 0.05);
};

export const paintArrow: Painter = (ctx, s) => {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = s * 0.08;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.32, 0);
  ctx.lineTo(s * -0.14, s * -0.3);
  ctx.lineTo(s * -0.14, s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};
