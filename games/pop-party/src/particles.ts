export type ParticleLook = 'dot' | 'ring' | 'confetti' | 'puff';

export interface Particle {
  alive: boolean;
  look: ParticleLook;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  size: number;
  color: string;
  turn: number;
  spin: number;
}

const POOL_SIZE = 120;

export function particlePool(): Particle[] {
  return Array.from({ length: POOL_SIZE }, () => ({
    alive: false,
    look: 'dot' as const,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    gravity: 0,
    age: 0,
    life: 1,
    size: 1,
    color: '#fff',
    turn: 0,
    spin: 0,
  }));
}

/** The next free particle, reset to its start. Null when the screen is full, which simply means one less. */
export function takeParticle(pool: Particle[], look: ParticleLook, x: number, y: number): Particle | null {
  const particle = pool.find((candidate) => !candidate.alive);
  if (!particle) return null;
  particle.alive = true;
  particle.look = look;
  particle.x = x;
  particle.y = y;
  particle.vx = 0;
  particle.vy = 0;
  particle.gravity = 0;
  particle.age = 0;
  particle.turn = 0;
  particle.spin = 0;
  return particle;
}

export function stepParticles(pool: Particle[], dt: number): void {
  for (const particle of pool) {
    if (!particle.alive) continue;
    particle.age += dt;
    if (particle.age >= particle.life) {
      particle.alive = false;
      continue;
    }
    particle.vy += particle.gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.turn += particle.spin * dt;
  }
}
