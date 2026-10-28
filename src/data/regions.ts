import type { OceanId, Region } from './types.ts';
import { POLAR_REGIONS } from './regions/polar.ts';
import { NORTH_AMERICA_REGIONS } from './regions/north-america.ts';
import { SOUTH_AMERICA_REGIONS } from './regions/south-america.ts';
import { AFRICA_REGIONS } from './regions/africa.ts';
import { EUROPE_REGIONS } from './regions/europe.ts';
import { ASIA_REGIONS } from './regions/asia.ts';
import { OCEANIA_REGIONS } from './regions/oceania.ts';
import { OCEAN_REGIONS } from './regions/oceans.ts';

/** Every wild region in the game, land and sea. */
export const REGIONS: readonly Region[] = [
  ...POLAR_REGIONS,
  ...NORTH_AMERICA_REGIONS,
  ...SOUTH_AMERICA_REGIONS,
  ...AFRICA_REGIONS,
  ...EUROPE_REGIONS,
  ...ASIA_REGIONS,
  ...OCEANIA_REGIONS,
  ...OCEAN_REGIONS,
];

export function oceanRegion(ocean: OceanId, regions: readonly Region[] = REGIONS): Region {
  const found = regions.find((region) => region.ocean === ocean);
  if (!found) throw new Error(`No region for the ${ocean} ocean`);
  return found;
}
