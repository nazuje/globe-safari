import type { Region, Shape } from '../data/types.ts';
import { REGIONS, oceanRegion } from '../data/regions.ts';
import { distanceToShapeKm, shapeArea, shapeContains } from './shapes.ts';
import { oceanAt } from './oceans.ts';
import type { CountryLookup } from './countries.ts';

export interface LookupResult {
  region: Region;
  /** The country under the point, or null at sea. */
  country: string | null;
  onLand: boolean;
}

/**
 * Land further than this from every land region (say, Hawaii, Tahiti or the
 * Azores) is a small ocean island, so it takes the surrounding ocean's animals.
 */
const ISLAND_DISTANCE_KM = 350;

type Surface = 'land' | 'sea';

interface Candidate {
  region: Region;
  shape: Shape;
}

function shapeApplies(shape: Shape, surface: Surface): boolean {
  return shape.surface === 'any' || shape.surface === surface;
}

function candidatesFor(surface: Surface, regions: readonly Region[]): Candidate[] {
  return regions.flatMap((region) =>
    region.shapes.filter((shape) => shapeApplies(shape, surface)).map((shape) => ({ region, shape })),
  );
}

function priorityOf(c: Candidate): number {
  return c.shape.priority ?? c.region.priority;
}

/** Higher priority wins; on a tie, the smaller (more specific) shape wins. */
function isBetter(a: Candidate, b: Candidate): boolean {
  const byPriority = priorityOf(a) - priorityOf(b);
  if (byPriority !== 0) return byPriority > 0;
  return shapeArea(a.shape) < shapeArea(b.shape);
}

function bestMatch(candidates: Candidate[], lat: number, lng: number): Region | null {
  let best: Candidate | null = null;
  for (const c of candidates) {
    if (!shapeContains(c.shape, lat, lng)) continue;
    if (!best || isBetter(c, best)) best = c;
  }
  return best?.region ?? null;
}

function nearest(
  candidates: Candidate[],
  lat: number,
  lng: number,
): { region: Region; km: number } | null {
  let best: { region: Region; km: number } | null = null;
  for (const c of candidates) {
    const km = distanceToShapeKm(c.shape, lat, lng);
    if (!best || km < best.km) best = { region: c.region, km };
  }
  return best;
}

function oceanFor(lat: number, lng: number, regions: readonly Region[]): Region {
  return oceanRegion(oceanAt(lat, lng) ?? 'atlantic', regions);
}

function landRegion(lat: number, lng: number, regions: readonly Region[]): Region {
  const land = candidatesFor('land', regions);
  const match = bestMatch(land, lat, lng);
  if (match) return match;
  const near = nearest(land, lat, lng);
  return near && near.km <= ISLAND_DISTANCE_KM ? near.region : oceanFor(lat, lng, regions);
}

function seaRegion(lat: number, lng: number, regions: readonly Region[]): Region {
  const match = bestMatch(candidatesFor('sea', regions), lat, lng);
  if (match) return match;
  const ocean = oceanAt(lat, lng);
  // A landlocked sea such as the Caspian takes the animals of the land around it.
  return ocean ? oceanRegion(ocean, regions) : landRegion(lat, lng, regions);
}

/**
 * Finds the wild region for any point on Earth. Land points get the most
 * specific land region (or the nearest one); sea points get a coastal sea
 * region when one covers them, otherwise the ocean they are in.
 */
export function lookupRegion(
  lat: number,
  lng: number,
  countryAt: CountryLookup,
  regions: readonly Region[] = REGIONS,
): LookupResult {
  const country = countryAt(lat, lng);
  const onLand = country !== null;
  const region = onLand ? landRegion(lat, lng, regions) : seaRegion(lat, lng, regions);
  return { region, country, onLand };
}
