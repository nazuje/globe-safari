import { RIDES, type Ride } from './rides.ts';

export function isUnlocked(ride: Ride, stars: number): boolean {
  return stars >= ride.stars;
}

/** The rides that opened between two star totals, cheapest first. */
export function newlyUnlocked(before: number, after: number): Ride[] {
  return RIDES.filter((ride) => !isUnlocked(ride, before) && isUnlocked(ride, after));
}

/** The next ride to open, or null when the garage is full. */
export function nextRide(stars: number): Ride | null {
  return RIDES.find((ride) => !isUnlocked(ride, stars)) ?? null;
}

/** How far along the way to the next ride, from 0 to 1. A full garage stays at 1. */
export function nextRideProgress(stars: number): number {
  const next = nextRide(stars);
  if (!next) return 1;
  const previous = Math.max(0, ...RIDES.filter((ride) => isUnlocked(ride, stars)).map((ride) => ride.stars));
  return (stars - previous) / (next.stars - previous);
}

/** A saved total can be missing or mangled, and a bad one must never lock anything or break the game. */
export function cleanStars(saved: unknown): number {
  return typeof saved === 'number' && Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 0;
}
