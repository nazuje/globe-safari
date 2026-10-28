import type { OceanId } from '../data/types.ts';
import { normalizeLng } from './shapes.ts';

/**
 * A line through the Americas, as [lat, lng] steps. Sea west of it is Pacific,
 * east of it is Atlantic. It runs over land, so only its sea-side behaviour matters.
 */
const AMERICAS_DIVIDE: ReadonlyArray<readonly [number, number]> = [
  [8, -77.5],
  [10, -84],
  [13, -88],
  [15, -90],
  [16, -94],
  [18, -96],
  [20, -100],
  [90, -100],
];

function interpolateDivide(lat: number): number {
  const steps = AMERICAS_DIVIDE;
  if (lat <= steps[0][0]) return steps[0][1];
  for (let i = 1; i < steps.length; i++) {
    const [lat1, lng1] = steps[i - 1];
    const [lat2, lng2] = steps[i];
    if (lat <= lat2) return lng1 + ((lat - lat1) / (lat2 - lat1)) * (lng2 - lng1);
  }
  return steps[steps.length - 1][1];
}

function isCaspianOrAral(lat: number, lng: number): boolean {
  return lat > 35 && lat < 48 && lng > 46 && lng < 62;
}

function isIndian(lat: number, lng: number): boolean {
  if (lng >= 20 && lng < 100) return lat < 30;
  if (lng >= 100 && lng < 129) return lat < -8;
  if (lng >= 129 && lng < 147) return lat < -25;
  return false;
}

function isAtlantic(lat: number, lng: number): boolean {
  if (lat < 8) return lng >= -70 && lng < 20;
  if (lng <= interpolateDivide(lat)) return false;
  return lng < 20 || (lat >= 30 && lng < 45);
}

/**
 * Which ocean a sea point belongs to, by coordinates alone. Returns null for
 * landlocked seas (the Caspian and Aral), which belong to no ocean.
 */
export function oceanAt(lat: number, rawLng: number): OceanId | null {
  const lng = normalizeLng(rawLng);
  if (lat >= 66) return 'arctic';
  if (lat <= -58) return 'southern';
  if (isCaspianOrAral(lat, lng)) return null;
  if (isIndian(lat, lng)) return 'indian';
  if (isAtlantic(lat, lng)) return 'atlantic';
  return 'pacific';
}
