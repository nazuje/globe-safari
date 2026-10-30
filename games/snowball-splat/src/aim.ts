export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vec3;
  /** Length 1. */
  dir: Vec3;
}

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface Aimable {
  id: number;
  center: Vec3;
  radius: number;
  /** How much more forgiving this target is than the usual assist. */
  pull: number;
}

export interface Assist {
  /** Extra forgiveness as a share of the target's own size. */
  size: number;
  /** Extra forgiveness per unit of distance, so a far target stays as easy to tap on screen. */
  angle: number;
}

export function pointOnRay(ray: Ray, distance: number): Vec3 {
  return {
    x: ray.origin.x + ray.dir.x * distance,
    y: ray.origin.y + ray.dir.y * distance,
    z: ray.origin.z + ray.dir.z * distance,
  };
}

/** How far along the ray it first meets the box, or null if it never does. */
export function rayMeetsBox(ray: Ray, box: Box): number | null {
  let near = 0;
  let far = Infinity;
  for (const [origin, dir, low, high] of [
    [ray.origin.x, ray.dir.x, box.x0, box.x1],
    [ray.origin.y, ray.dir.y, box.y0, box.y1],
    [ray.origin.z, ray.dir.z, box.z0, box.z1],
  ] as const) {
    if (Math.abs(dir) < 1e-9) {
      if (origin < low || origin > high) return null;
      continue;
    }
    const a = (low - origin) / dir;
    const b = (high - origin) / dir;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}

/** The exact spot a tap points at: the ground, something standing on it, or the hills at the back. */
export function landingPoint(ray: Ray, boxes: readonly Box[], backZ: number): Vec3 {
  let best = ray.dir.z < -1e-9 ? (backZ - ray.origin.z) / ray.dir.z : Infinity;
  if (ray.dir.y < -1e-9) best = Math.min(best, -ray.origin.y / ray.dir.y);
  for (const box of boxes) {
    const distance = rayMeetsBox(ray, box);
    if (distance !== null) best = Math.min(best, distance);
  }
  return pointOnRay(ray, Number.isFinite(best) ? best : 60);
}

/** How close the ray passes to a point, and how far along it that happens. */
export function rayGap(ray: Ray, point: Vec3): { gap: number; along: number } {
  const px = point.x - ray.origin.x;
  const py = point.y - ray.origin.y;
  const pz = point.z - ray.origin.z;
  const along = px * ray.dir.x + py * ray.dir.y + pz * ray.dir.z;
  const gx = px - ray.dir.x * along;
  const gy = py - ray.dir.y * along;
  const gz = pz - ray.dir.z * along;
  return { gap: Math.hypot(gx, gy, gz), along };
}

/** The target this tap was meant for, or null. Near-misses count, by as much as the assist allows. */
export function pickTarget(ray: Ray, targets: readonly Aimable[], assist: Assist): number | null {
  let best: number | null = null;
  let bestShare = 1;
  for (const target of targets) {
    const { gap, along } = rayGap(ray, target.center);
    if (along <= 0) continue;
    const reach = (target.radius * (1 + assist.size) + assist.angle * along) * target.pull;
    const share = gap / reach;
    if (share <= bestShare) {
      bestShare = share;
      best = target.id;
    }
  }
  return best;
}
