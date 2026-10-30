/** Every number that shapes how the game feels, tuned by hand. Distances are world units, about a pixel at phone size. */

/** The simulation always moves in this slice of time, so a slow tablet plays the same game as a fast laptop. */
export const STEP = 1 / 120;

export const GRAVITY = 1900;
/** The speed of a jump at takeoff. */
export const JUMP_SPEED = 640;
/** The second jump is a little smaller and always the same, so it can be learned. */
export const DOUBLE_SPEED = 590;
/** Holding the finger down floats the first part of a jump. Gravity is this fraction while it lasts. */
export const FLOAT_GRAVITY = 0.45;
export const FLOAT_SECONDS = 0.16;
/** Even the quickest tap floats this long, so a child's tap always gives a proper hop. */
export const FLOAT_LEAST = 0.05;
/** Near the top of a jump gravity eases off, which gives the moment of hang that makes jumps feel good. */
export const APEX_BAND = 90;
export const APEX_GRAVITY = 0.62;
/** Coming down a little faster than going up keeps a jump snappy. */
export const FALL_GRAVITY = 1.18;
export const MOST_FALL_SPEED = 820;
/** Clipping a ledge by this much below its top still counts as landing on it. */
export const LEDGE_FORGIVENESS = 22;

export const SPRING_SPEED = 900;
export const STOMP_SPEED = 640;
export const CASTLE_SPEED = 800;

export const SPIN_SECONDS = 0.42;
export const TUMBLE_SECONDS = 0.8;
/** How much of its speed the runner keeps during a tumble. */
export const TUMBLE_SPEED = 0.42;
/** A tumble swallows jumps only for this long, so a mashing child never feels stuck. */
export const TUMBLE_LOCK = 0.32;
export const TUMBLE_SAFE = 1.7;
export const SPEED_EASE = 6;

export const ROCKET_SPEED = 2.1;
export const RAIL_HEIGHT = 112;

export const SCOOP_SWOOP = 0.4;
export const SCOOP_CARRY = 1;
export const SCOOP_LIFT = 70;
export const DROP_HEIGHT = 80;
export const DROP_SAFE = 1.4;

/** The runner is treated as this big when touching things. Its feet are its position. */
export const RUNNER_WIDTH = 30;
export const RUNNER_HEIGHT = 46;
export const JELLY_WIDTH = 46;
export const JELLY_HEIGHT = 34;
/** How close the runner's middle must come to a mushroom's middle to be thrown. */
export const PAD_REACH = 30;
export const PAD_HEIGHT = 30;

export const SCORE = { star: 10, carrot: 20, jelly: 30, chest: 200, boots: 10 } as const;

export const DIFFICULTY_IDS = ['easy', 'fast', 'turbo'] as const;
export type DifficultyId = (typeof DIFFICULTY_IDS)[number];

export interface Tuning {
  id: DifficultyId;
  /** Running speed at the start of a level. */
  speed: number;
  /** How many times faster the runner is by the flag, so the end feels thrilling. */
  ramp: number;
  /** A jump still works for this long after running off an edge. */
  coyote: number;
  /** A tap this long before landing still jumps on landing. */
  buffer: number;
  /** Hops low over gaps for a child who didn't tap in time. */
  assist: boolean;
  /** How close something must be for the runner to collect it. */
  reach: number;
  gapScale: number;
  /** The share of a level's stars and carrots that earns two and three stars. */
  stars: readonly [number, number];
}

export const DIFFICULTIES: Record<DifficultyId, Tuning> = {
  easy: { id: 'easy', speed: 172, ramp: 1.2, coyote: 0.16, buffer: 0.18, assist: true, reach: 40, gapScale: 1, stars: [0.3, 0.72] },
  fast: { id: 'fast', speed: 200, ramp: 1.24, coyote: 0.11, buffer: 0.13, assist: false, reach: 40, gapScale: 1, stars: [0.35, 0.72] },
  turbo: { id: 'turbo', speed: 226, ramp: 1.3, coyote: 0.09, buffer: 0.11, assist: false, reach: 38, gapScale: 1.12, stars: [0.4, 0.75] },
};

export interface WorldPhysics {
  /** Multiplies gravity. */
  gravity: number;
  /** Multiplies every jump and bounce. */
  jump: number;
}
