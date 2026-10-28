import type { BoxShape, PolygonShape, Shape } from '../data/types.ts';

const EARTH_RADIUS_KM = 6371;
const DEG = Math.PI / 180;

/** Wraps any longitude into the range [-180, 180). */
export function normalizeLng(lng: number): number {
  const wrapped = (((lng + 180) % 360) + 360) % 360;
  return wrapped - 180;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function boxSpansLng(box: BoxShape, lng: number): boolean {
  if (box.west <= box.east) return lng >= box.west && lng <= box.east;
  return lng >= box.west || lng <= box.east;
}

function boxContains(box: BoxShape, lat: number, lng: number): boolean {
  return lat >= box.south && lat <= box.north && boxSpansLng(box, lng);
}

/** Classic even-odd ray casting, treating lng/lat as flat x/y (fine for small shapes). */
function polygonContains(shape: PolygonShape, lat: number, lng: number): boolean {
  const pts = shape.points;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const crosses = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function shapeContains(shape: Shape, lat: number, lng: number): boolean {
  const x = normalizeLng(lng);
  return shape.kind === 'box' ? boxContains(shape, lat, x) : polygonContains(shape, lat, x);
}

function polygonBounds(shape: PolygonShape): BoxShape {
  const lngs = shape.points.map(([x]) => x);
  const lats = shape.points.map(([, y]) => y);
  return {
    kind: 'box',
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
    surface: shape.surface,
  };
}

function boundsOf(shape: Shape): BoxShape {
  return shape.kind === 'box' ? shape : polygonBounds(shape);
}

/** Rough size in square degrees, used to prefer the more specific of two equal-priority shapes. */
export function shapeArea(shape: Shape): number {
  const b = boundsOf(shape);
  const width = b.west <= b.east ? b.east - b.west : 360 - (b.west - b.east);
  return (b.north - b.south) * width;
}

function clampLngToBox(box: BoxShape, lng: number): number {
  if (boxSpansLng(box, lng)) return lng;
  const toWest = Math.abs(normalizeLng(lng - box.west));
  const toEast = Math.abs(normalizeLng(lng - box.east));
  return toWest < toEast ? box.west : box.east;
}

function distanceToBoxKm(box: BoxShape, lat: number, lng: number): number {
  const nearestLat = Math.min(box.north, Math.max(box.south, lat));
  return distanceKm(lat, lng, nearestLat, clampLngToBox(box, lng));
}

/**
 * Distance to one polygon edge. Finds the closest point on the edge in a flat
 * map squashed by cos(latitude), then measures the real distance to it.
 */
function distanceToEdgeKm(
  a: readonly [number, number],
  b: readonly [number, number],
  lat: number,
  lng: number,
): number {
  const squash = Math.cos(lat * DEG);
  const ax = (a[0] - lng) * squash;
  const ay = a[1] - lat;
  const dx = (b[0] - a[0]) * squash;
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSq));
  return distanceKm(lat, lng, a[1] + t * dy, a[0] + t * (b[0] - a[0]));
}

function distanceToPolygonKm(shape: PolygonShape, lat: number, lng: number): number {
  const pts = shape.points;
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    best = Math.min(best, distanceToEdgeKm(pts[j], pts[i], lat, lng));
  }
  return best;
}

/** Approximate distance from a point to the nearest edge of a shape (0 when inside). */
export function distanceToShapeKm(shape: Shape, lat: number, lng: number): number {
  if (shapeContains(shape, lat, lng)) return 0;
  const x = normalizeLng(lng);
  return shape.kind === 'box' ? distanceToBoxKm(shape, lat, x) : distanceToPolygonKm(shape, lat, x);
}
