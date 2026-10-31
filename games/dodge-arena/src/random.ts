/** A small seeded generator, so a run can be replayed in tests. The state lives on the run. */
export interface Dice {
  seed: number;
}

export function roll(dice: Dice): number {
  dice.seed = (dice.seed + 0x6d2b79f5) | 0;
  let mixed = Math.imul(dice.seed ^ (dice.seed >>> 15), 1 | dice.seed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
}

export const between = (dice: Dice, low: number, high: number): number => low + roll(dice) * (high - low);

export function pick<T>(dice: Dice, options: readonly T[]): T {
  return options[Math.floor(roll(dice) * options.length)] as T;
}
