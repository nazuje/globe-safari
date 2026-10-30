import { emit, makePool, stepPool, type Pool } from './pool.ts';

/** Particle pictures, by number, because the pool only stores numbers. */
export const FX_ART = [
  'spark',
  'star',
  'feather:0',
  'feather:1',
  'feather:2',
  'ha:0',
  'ha:1',
  'ha:2',
  'bit:0',
  'bit:1',
  'bit:2',
  'bit:3',
  'bit:4',
  'bubble',
] as const;

const SPARK = 0;
const STAR = 1;
const FEATHER = 2;
const HA = 5;
const BIT = 8;
const BUBBLE = 13;

export const POOL_SIZE = 180;
export const SLOW_POOL_SIZE = 70;

export interface Fx {
  pool: Pool;
  calm: boolean;
  /** Short-lived screen effects, each counting down from 1. */
  flash: number;
  shipBump: number;
  meterPop: number;
  scorePop: number;
  starPop: number;
}

export function makeFx(calm: boolean): Fx {
  return { pool: makePool(POOL_SIZE), calm, flash: 0, shipBump: 0, meterPop: 0, scorePop: 0, starPop: 0 };
}

export function updateFx(fx: Fx, seconds: number): void {
  stepPool(fx.pool, seconds);
  fx.flash = Math.max(0, fx.flash - seconds * 2.5);
  fx.shipBump = Math.max(0, fx.shipBump - seconds * 5);
  fx.meterPop = Math.max(0, fx.meterPop - seconds * 5);
  fx.scorePop = Math.max(0, fx.scorePop - seconds * 6);
  fx.starPop = Math.max(0, fx.starPop - seconds * 6);
}

function pick(from: number, count: number): number {
  return from + Math.floor(Math.random() * count);
}

function around(spread: number): number {
  return (Math.random() - 0.5) * spread;
}

/** The little "ha ha" and feathers that fly off a laughing alien. Never an explosion: everything drifts up. */
export function laughBurst(fx: Fx, x: number, y: number, unit: number): void {
  const { pool } = fx;
  emit(pool, pick(HA, 3), x + around(unit * 3), y - unit * 3, around(unit * 3), -unit * 6, 1, Math.max(unit * 6, 34));
  if (fx.calm) return;
  for (let i = 0; i < 3; i++) {
    emit(pool, pick(FEATHER, 3), x, y, around(unit * 8), -unit * (2 + Math.random() * 3), 0.8, unit * 1.2, unit * 4, around(6));
  }
  for (let i = 0; i < 2; i++) emit(pool, SPARK, x + around(unit * 3), y + around(unit * 3), 0, -unit, 0.4, unit * 1.3, 0, around(6));
}

export function sparkle(fx: Fx, x: number, y: number, unit: number, count: number): void {
  const total = fx.calm ? Math.min(count, 2) : count;
  for (let i = 0; i < total; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = unit * (2 + Math.random() * 5);
    emit(fx.pool, SPARK, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.45, unit * 1.2, 0, around(8));
  }
}

export function starPop(fx: Fx, x: number, y: number, unit: number): void {
  emit(fx.pool, STAR, x, y, 0, -unit * 7, 0.4, unit * 1.6, 0, 6);
}

export function bubblePuff(fx: Fx, x: number, y: number, unit: number): void {
  if (fx.calm) return;
  emit(fx.pool, BUBBLE, x + around(unit * 2), y, around(unit * 3), unit * 2, 0.5, unit * 1.3);
}

export function confetti(fx: Fx, width: number, height: number, count: number): void {
  const unit = width / 70;
  const total = fx.calm ? Math.min(count, 24) : count;
  for (let i = 0; i < total; i++) {
    emit(
      fx.pool,
      pick(BIT, 5),
      Math.random() * width,
      -Math.random() * height * 0.3,
      around(unit * 6),
      height * (0.2 + Math.random() * 0.3),
      2.6,
      unit * 2.2,
      unit * 2,
      around(10),
    );
  }
}

/** Laughter raining up the whole screen during a Tickle Storm. */
export function stormRain(fx: Fx, width: number, height: number, unit: number): void {
  const x = Math.random() * width;
  const art = Math.random() < 0.45 ? pick(HA, 3) : pick(FEATHER, 3);
  emit(fx.pool, art, x, height * (0.4 + Math.random() * 0.6), around(unit * 4), -height * 0.35, 1.3, Math.max(unit * 6, 34), 0, around(3));
}
