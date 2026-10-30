import { stamp } from './sprites.ts';

/** One flying bit of sparkle or dust. Positions are world units, or screen pixels for a bit flying to the score. */
interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  spin: number;
  angle: number;
  art?: string;
  color?: string;
  screen: boolean;
  grow: boolean;
}

export type NewBit = Partial<Bit> & Pick<Bit, 'x' | 'y' | 'life' | 'size'>;

export interface Fx {
  bits: Bit[];
  /** Spring-driven squash and stretch: above zero is tall and thin. */
  stretch: number;
  stretchSpeed: number;
  shake: number;
  scorePop: number;
  /** Ring from a double jump, in world units. */
  ringX: number;
  ringY: number;
  ring: number;
  dustIn: number;
  stride: number;
}

const MOST_BITS = 160;
const SPRING = 340;
const DAMPING = 20;

export function makeFx(): Fx {
  return { bits: [], stretch: 0, stretchSpeed: 0, shake: 0, scorePop: 0, ringX: 0, ringY: 0, ring: 0, dustIn: 0, stride: 0 };
}

export function addBit(fx: Fx, bit: NewBit): void {
  if (fx.bits.length >= MOST_BITS) fx.bits.shift();
  fx.bits.push({ vx: 0, vy: 0, gravity: 0, age: 0, spin: 0, angle: 0, screen: false, grow: false, ...bit });
}

export function dust(fx: Fx, x: number, y: number, color: string, count: number, spread: number): void {
  for (let i = 0; i < count; i++) {
    addBit(fx, {
      x: x + (Math.random() - 0.5) * 10,
      y: y + 3,
      vx: (Math.random() - 0.6) * spread,
      vy: 16 + Math.random() * 36,
      life: 0.35 + Math.random() * 0.2,
      size: 7 + Math.random() * 7,
      color,
      grow: true,
    });
  }
}

export function sparkle(fx: Fx, x: number, y: number, art: string, count: number, reach: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random();
    const speed = reach * (0.7 + Math.random() * 0.6);
    addBit(fx, { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5, size: 16, art, spin: 4 });
  }
}

export function kick(fx: Fx, amount: number): void {
  fx.stretchSpeed += amount;
}

export function updateFx(fx: Fx, seconds: number): void {
  for (const bit of fx.bits) {
    bit.age += seconds;
    bit.vy -= bit.gravity * seconds;
    bit.x += bit.vx * seconds;
    bit.y += bit.vy * seconds;
    bit.angle += bit.spin * seconds;
  }
  fx.bits = fx.bits.filter((bit) => bit.age < bit.life);
  fx.stretchSpeed += (-SPRING * fx.stretch - DAMPING * fx.stretchSpeed) * seconds;
  fx.stretch += fx.stretchSpeed * seconds;
  fx.stretch = Math.max(-0.5, Math.min(0.5, fx.stretch));
  const fade = Math.exp(-8 * seconds);
  fx.shake *= fade;
  fx.scorePop *= fade;
  fx.ring = Math.max(0, fx.ring - seconds * 2.6);
}

function drawDust(ctx: CanvasRenderingContext2D, bit: Bit, x: number, y: number, size: number): void {
  ctx.globalAlpha = Math.max(0, 1 - bit.age / bit.life) * 0.75;
  ctx.fillStyle = bit.color ?? '#fff';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Draws everything flying about. `toX` and `toY` turn world units into screen pixels. */
export function drawFx(
  fx: Fx,
  ctx: CanvasRenderingContext2D,
  dpr: number,
  scale: number,
  toX: (x: number) => number,
  toY: (y: number) => number,
): void {
  for (const bit of fx.bits) {
    const left = 1 - bit.age / bit.life;
    const x = bit.screen ? bit.x : toX(bit.x);
    const y = bit.screen ? bit.y : toY(bit.y);
    const unit = bit.screen ? 1 : scale;
    const size = bit.size * unit * (bit.grow ? 1 + (1 - left) : 0.5 + left * 0.5);
    if (bit.art) stamp(ctx, dpr, bit.art, x, y, size, bit.angle);
    else drawDust(ctx, bit, x, y, size);
  }
}
