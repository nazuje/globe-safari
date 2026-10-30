import { describe, expect, it } from 'vitest';
import { cleanStars, isUnlocked, newlyUnlocked, nextRide, nextRideProgress } from './garage.ts';
import { RIDES, rideById } from './rides.ts';

describe('the garage', () => {
  it('starts with a wide mix open, so nobody has to earn a favorite', () => {
    const open = RIDES.filter((ride) => isUnlocked(ride, 0)).map((ride) => ride.id);
    expect(open).toEqual(['car', 'unicorn', 'tractor', 'rocket', 'dragon', 'bicycle', 'fireEngine', 'carpet']);
  });

  it('lists locked rides cheapest first, and they all differ', () => {
    const costs = RIDES.map((ride) => ride.stars).filter((stars) => stars > 0);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
    expect(new Set(costs).size).toBe(costs.length);
  });

  it('reports what opened in a race, once', () => {
    expect(newlyUnlocked(10, 45).map((ride) => ride.id)).toEqual(['snail', 'dinosaur']);
    expect(newlyUnlocked(45, 50)).toEqual([]);
  });

  it('opens a ride at exactly its star count', () => {
    expect(newlyUnlocked(14, 15).map((ride) => ride.id)).toEqual(['snail']);
    expect(isUnlocked(rideById('snail')!, 14)).toBe(false);
  });

  it('points at the next ride, then at nothing', () => {
    expect(nextRide(0)?.id).toBe('snail');
    expect(nextRide(15)?.id).toBe('dinosaur');
    expect(nextRide(100000)).toBeNull();
  });

  it('fills up towards the next ride', () => {
    expect(nextRideProgress(0)).toBe(0);
    expect(nextRideProgress(15)).toBe(0);
    expect(nextRideProgress(40 - 5)).toBeCloseTo(0.8);
    expect(nextRideProgress(100000)).toBe(1);
  });

  it('shrugs off a broken saved total', () => {
    expect(cleanStars('lots')).toBe(0);
    expect(cleanStars(-3)).toBe(0);
    expect(cleanStars(Number.NaN)).toBe(0);
    expect(cleanStars(12.5)).toBe(12);
    expect(cleanStars(40)).toBe(40);
  });
});
