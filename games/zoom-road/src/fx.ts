import { stamp } from './sprites.ts';

/** One flying bit of sparkle. Positions are screen pixels. */
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
  /** Art to stamp, or a paper color for confetti. */
  art?: string;
  color?: string;
  shrink: boolean;
}

export type NewBit = Partial<Bit> & Pick<Bit, 'x' | 'y' | 'life' | 'size'>;

const MOST_BITS = 220;
const CONFETTI = ['#ff6b6b', '#ffc93c', '#3ecf8e', '#4cb8ff', '#8b5cf6', '#ff8fd0', '#ffffff'];

export interface Fx {
  bits: Bit[];
  /** How hard the view is shaking, fading to nothing. */
  shake: number;
  /** A bump that makes the star counter swell. */
  counterPop: number;
  /** How far the ride leans into a lane change. */
  lean: number;
  /** A flash on the side of the screen just tapped: -1, 1 or 0, with its strength. */
  flashSide: number;
  flash: number;
}

export function makeFx(): Fx {
  return { bits: [], shake: 0, counterPop: 0, lean: 0, flashSide: 0, flash: 0 };
}

export function addBit(fx: Fx, bit: NewBit): void {
  if (fx.bits.length >= MOST_BITS) fx.bits.shift();
  fx.bits.push({ vx: 0, vy: 0, gravity: 0, age: 0, spin: 0, angle: 0, shrink: true, ...bit });
}

export function sparkle(fx: Fx, x: number, y: number, art: string, count: number, reach: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random();
    const speed = reach * (0.6 + Math.random() * 0.6);
    addBit(fx, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5,
      size: reach * 0.3,
      art,
      spin: 4,
    });
  }
}

/** Sends a collected thing up to the star counter, so it's clear where stars go. */
export function flyTo(fx: Fx, from: { x: number; y: number }, to: { x: number; y: number }, art: string, size: number): void {
  const life = 0.42;
  addBit(fx, { x: from.x, y: from.y, vx: (to.x - from.x) / life, vy: (to.y - from.y) / life, life, size, art });
}

export function confetti(fx: Fx, width: number, height: number, count: number): void {
  for (let i = 0; i < count; i++) {
    addBit(fx, {
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.6,
      vx: (Math.random() - 0.5) * 60,
      vy: 120 + Math.random() * 160,
      gravity: 40,
      life: 3.2,
      size: 8 + Math.random() * 7,
      color: CONFETTI[i % CONFETTI.length]!,
      spin: (Math.random() - 0.5) * 12,
      angle: Math.random() * 6,
      shrink: false,
    });
  }
}

export function updateFx(fx: Fx, seconds: number): void {
  for (const bit of fx.bits) {
    bit.age += seconds;
    bit.vy += bit.gravity * seconds;
    bit.x += bit.vx * seconds;
    bit.y += bit.vy * seconds;
    bit.angle += bit.spin * seconds;
  }
  fx.bits = fx.bits.filter((bit) => bit.age < bit.life);
  const fade = Math.exp(-7 * seconds);
  fx.shake *= fade;
  fx.counterPop *= fade;
  fx.lean *= Math.exp(-9 * seconds);
  fx.flash *= Math.exp(-6 * seconds);
}

export function drawFx(fx: Fx, ctx: CanvasRenderingContext2D, dpr: number): void {
  for (const bit of fx.bits) {
    const left = 1 - bit.age / bit.life;
    const size = bit.shrink ? bit.size * (0.4 + left * 0.6) : bit.size;
    if (bit.art) {
      stamp(ctx, dpr, bit.art, bit.x, bit.y, size, bit.angle);
      continue;
    }
    ctx.save();
    ctx.translate(bit.x, bit.y);
    ctx.rotate(bit.angle);
    ctx.fillStyle = bit.color ?? '#fff';
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.restore();
  }
}
