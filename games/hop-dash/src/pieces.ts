/** The words levels are written in. A level is a list of these, in running order. */

export type Trail = 'none' | 'stars' | 'carrots' | 'mixed';

export type Piece =
  | { kind: 'run'; len: number; trail: Trail }
  | { kind: 'hill'; height: number; len: number; trail: Trail }
  | { kind: 'slope'; rise: number; len: number; trail: Trail }
  | { kind: 'gap'; len: number; easy: boolean; rise: number }
  | { kind: 'arc'; double: boolean; len: number }
  | { kind: 'jellies'; count: number; patrol: number }
  | { kind: 'mushroom'; double: boolean; len: number }
  | { kind: 'stairs'; count: number }
  | { kind: 'stones'; count: number }
  | { kind: 'mover'; axis: 'x' | 'y'; easy: boolean }
  | { kind: 'boots'; len: number }
  | { kind: 'secret' };

/** Flat ground, with a trail of things to collect along it if you like. */
export const run = (len: number, trail: Trail = 'none'): Piece => ({ kind: 'run', len, trail });
/** Up and back down to the same height. */
export const hill = (height: number, len: number, trail: Trail = 'none'): Piece => ({ kind: 'hill', height, len, trail });
/** Up or down, staying at the new height. */
export const slope = (rise: number, len: number, trail: Trail = 'none'): Piece => ({ kind: 'slope', rise, len, trail });
/** A gap. Stays on Easy only when marked, otherwise Easy gets ground there. An arc of stars shows the jump. */
export const gap = (len: number, options: { easy?: boolean; rise?: number } = {}): Piece => ({
  kind: 'gap',
  len,
  easy: options.easy ?? false,
  rise: options.rise ?? 0,
});
/** An arc of stars over flat ground, showing what one jump does. */
export const hop = (len = 300): Piece => ({ kind: 'arc', double: false, len });
/** An arc showing what the double jump does. */
export const twirl = (len = 420): Piece => ({ kind: 'arc', double: true, len });
/** Wobbly jellies. More than one sit a bounce apart, so you can chain them. */
export const jellies = (count = 1, patrol = 0): Piece => ({ kind: 'jellies', count, patrol });
/** A springy mushroom, with an arc showing where it throws you. */
export const mushroom = (options: { double?: boolean; len?: number } = {}): Piece => ({
  kind: 'mushroom',
  double: options.double ?? false,
  len: options.len ?? 560,
});
/** Floating steps going up over solid ground. */
export const stairs = (count = 3): Piece => ({ kind: 'stairs', count });
/** Floating stepping stones across a wide gap. Easy gets ground there. */
export const stones = (count = 2): Piece => ({ kind: 'stones', count });
/** A moving platform in the middle of a gap. */
export const mover = (axis: 'x' | 'y' = 'y', easy = false): Piece => ({ kind: 'mover', axis, easy });
/** Rocket boots, which zoom you along a stream of stars over whatever is below. */
export const boots = (len = 1300): Piece => ({ kind: 'boots', len });
/** A mushroom whose bounce, with a double jump at the top, reaches a hidden high path to the level's treasure. */
export const secret = (): Piece => ({ kind: 'secret' });
