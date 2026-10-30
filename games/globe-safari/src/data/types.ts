/** Which kind of surface a shape applies to. */
export type Surface = 'land' | 'sea' | 'any';

/**
 * A simple latitude/longitude rectangle. If `west` is greater than `east`,
 * the box wraps across the 180° meridian.
 */
export interface BoxShape {
  kind: 'box';
  south: number;
  north: number;
  west: number;
  east: number;
  surface: Surface;
  /** Overrides the region's priority for this one shape. */
  priority?: number;
}

/** A small polygon given as [lng, lat] corners. Must not cross the 180° meridian. */
export interface PolygonShape {
  kind: 'polygon';
  points: ReadonlyArray<readonly [lng: number, lat: number]>;
  surface: Surface;
  /** Overrides the region's priority for this one shape. */
  priority?: number;
}

export type Shape = BoxShape | PolygonShape;

export type OceanId = 'pacific' | 'atlantic' | 'indian' | 'southern' | 'arctic';

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  /** Exact English Wikipedia article title, used to fetch a photo. */
  wikiTitle: string;
  /** Exactly three clues, ordered from vaguest to most giveaway. */
  clues: readonly [string, string, string];
  funFact: string;
}

export interface Region {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** A point inside the region, used by "Surprise me!". */
  anchor: { lat: number; lng: number };
  /** Higher wins when shapes overlap. Small, specific places use high numbers. */
  priority: number;
  shapes: readonly Shape[];
  /** Set on the five oceans: they catch every sea point no other region claims. */
  ocean?: OceanId;
  animals: readonly Animal[];
}

export function box(
  south: number,
  north: number,
  west: number,
  east: number,
  surface: Surface = 'land',
): BoxShape {
  return { kind: 'box', south, north, west, east, surface };
}

export function polygon(
  points: ReadonlyArray<readonly [number, number]>,
  surface: Surface = 'land',
): PolygonShape {
  return { kind: 'polygon', points, surface };
}

/** Priority given to wide catch-all shapes that fill gaps between specific regions. */
export const BROAD_PRIORITY = 1;

/** Marks a shape as a wide catch-all that any specific region beats. */
export function broad<T extends Shape>(shape: T): T {
  return { ...shape, priority: BROAD_PRIORITY };
}
