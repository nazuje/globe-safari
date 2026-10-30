export interface Point {
  x: number;
  y: number;
  z: number;
}

export const add = (a: Point, b: Point, scale = 1): Point => ({
  x: a.x + b.x * scale,
  y: a.y + b.y * scale,
  z: a.z + b.z * scale,
});

const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** The closest point on a ray to `point`. The direction must be unit length. */
export function closestOnRay(origin: Point, direction: Point, point: Point): Point {
  const along = Math.max(dot({ x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z }, direction), 0);
  return add(origin, direction, along);
}

export function distanceSquared(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

/** The standing block nearest a tap that hit nothing, so a small hand can't really miss. */
export function nearestToRay(origin: Point, direction: Point, points: readonly Point[]): Point | null {
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const distance = distanceSquared(closestOnRay(origin, direction, point), point);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/** Where a tap that hit nothing lands, on an upright sheet through the structure facing the camera. */
export function pointOnFacingSheet(origin: Point, direction: Point, sheetCenter: Point): Point {
  const flat = Math.hypot(direction.x, direction.z) || 1;
  const facing = { x: direction.x / flat, y: 0, z: direction.z / flat };
  const across = dot(direction, facing);
  const distance = across > 1e-3 ? dot({ x: sheetCenter.x - origin.x, y: 0, z: sheetCenter.z - origin.z }, facing) / across : 0;
  const hit = add(origin, direction, Math.max(distance, 1));
  return { ...hit, y: Math.max(hit.y, 0.3) };
}

/** The launch speed that carries a ball from `from` to `to` in `seconds`, against gravity. */
export function launchVelocity(from: Point, to: Point, seconds: number, gravity: number): Point {
  return {
    x: (to.x - from.x) / seconds,
    y: (to.y - from.y) / seconds + (gravity * seconds) / 2,
    z: (to.z - from.z) / seconds,
  };
}

/** The standing point nearest the middle of all of them, the surest place to hit. */
export function middleOf(points: readonly Point[]): Point | null {
  if (points.length === 0) return null;
  const sum = points.reduce((total, point) => add(total, point), { x: 0, y: 0, z: 0 });
  const middle = { x: sum.x / points.length, y: sum.y / points.length, z: sum.z / points.length };
  return points.reduce((best, point) => (distanceSquared(point, middle) < distanceSquared(best, middle) ? point : best));
}
