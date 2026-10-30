/**
 * A fixed set of particles, kept in flat number arrays. Nothing is allocated while
 * playing, so old tablets get no garbage-collection stutters, and however much
 * laughing is going on the count can never grow. A new particle reuses the oldest slot.
 */
export interface Pool {
  capacity: number;
  /** Slots in use. A slow device lowers this. */
  limit: number;
  cursor: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  age: Float32Array;
  life: Float32Array;
  size: Float32Array;
  angle: Float32Array;
  spin: Float32Array;
  gravity: Float32Array;
  art: Uint8Array;
}

export function makePool(capacity: number): Pool {
  return {
    capacity,
    limit: capacity,
    cursor: 0,
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    vx: new Float32Array(capacity),
    vy: new Float32Array(capacity),
    age: new Float32Array(capacity),
    life: new Float32Array(capacity),
    size: new Float32Array(capacity),
    angle: new Float32Array(capacity),
    spin: new Float32Array(capacity),
    gravity: new Float32Array(capacity),
    art: new Uint8Array(capacity),
  };
}

export function setLimit(pool: Pool, limit: number): void {
  const next = Math.max(1, Math.min(pool.capacity, Math.floor(limit)));
  for (let i = next; i < pool.limit; i++) pool.life[i] = 0;
  pool.limit = next;
  pool.cursor %= next;
}

export function emit(
  pool: Pool,
  art: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  size: number,
  gravity = 0,
  spin = 0,
): void {
  const i = pool.cursor;
  pool.cursor = (i + 1) % pool.limit;
  pool.art[i] = art;
  pool.x[i] = x;
  pool.y[i] = y;
  pool.vx[i] = vx;
  pool.vy[i] = vy;
  pool.age[i] = 0;
  pool.life[i] = life;
  pool.size[i] = size;
  pool.angle[i] = 0;
  pool.spin[i] = spin;
  pool.gravity[i] = gravity;
}

export function stepPool(pool: Pool, seconds: number): void {
  for (let i = 0; i < pool.limit; i++) {
    if (pool.life[i] <= 0) continue;
    pool.age[i] += seconds;
    if (pool.age[i] >= pool.life[i]) {
      pool.life[i] = 0;
      continue;
    }
    pool.vy[i] += pool.gravity[i] * seconds;
    pool.x[i] += pool.vx[i] * seconds;
    pool.y[i] += pool.vy[i] * seconds;
    pool.angle[i] += pool.spin[i] * seconds;
  }
}

export function liveCount(pool: Pool): number {
  let live = 0;
  for (let i = 0; i < pool.capacity; i++) if (pool.life[i] > 0) live += 1;
  return live;
}
