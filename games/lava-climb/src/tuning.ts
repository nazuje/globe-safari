/** One tile, in world units. The tower is a fixed 16 tiles wide on every screen. */
export const TILE = 20;
export const COLS = 16;
export const WORLD_WIDTH = COLS * TILE;

export const TICKS_PER_SECOND = 120;
export const DT = 1 / TICKS_PER_SECOND;

export const HERO_W = 12;
export const HERO_H = 16;

/** Every number that decides how the climb feels. Speeds are units a second, windows are ticks. */
export interface Rules {
  run: number;
  groundAccel: number;
  groundBrake: number;
  airAccel: number;
  iceAccel: number;
  iceBrake: number;
  jump: number;
  gravityUp: number;
  gravityDown: number;
  /** Near the top of a held jump gravity softens, which gives a moment to aim. */
  hangSpeed: number;
  hangScale: number;
  maxFall: number;
  /** Letting go early keeps this share of the upward speed. */
  cut: number;
  coyote: number;
  buffer: number;
  wallSlide: number;
  wallKickX: number;
  wallKickY: number;
  /** After a wall kick the stick does nothing for a moment, so the kick is always the same. */
  wallLock: number;
  wallGrace: number;
  dashSpeed: number;
  dashTicks: number;
  beltSpeed: number;
  bounce: number;
  /** A bump just past the corner of a block slides round it instead of stopping the jump. */
  cornerNudge: number;
  /** A crumbling ledge holds this long, then stays away this long. */
  crumbleHold: number;
  crumbleBack: number;
  /** How far feet may dip into the lava before it counts. */
  lavaDip: number;
  /** Spikes hurt only this far inside their tile, so a near miss is a miss. */
  spikeInset: number;
  /** Planner only, always 0 in play. See Run.risky. */
  feetPad: number;
  hazardPad: number;
  lavaPad: number;
}

export const RULES: Rules = {
  run: 140,
  groundAccel: 2600,
  groundBrake: 3400,
  airAccel: 1900,
  iceAccel: 520,
  iceBrake: 170,
  jump: 372,
  gravityUp: 1000,
  gravityDown: 1300,
  hangSpeed: 50,
  hangScale: 0.6,
  maxFall: 430,
  cut: 0.45,
  coyote: 11,
  buffer: 14,
  wallSlide: 75,
  wallKickX: 185,
  wallKickY: 335,
  wallLock: 14,
  wallGrace: 9,
  dashSpeed: 340,
  dashTicks: 17,
  beltSpeed: 60,
  bounce: 560,
  cornerNudge: 5,
  crumbleHold: 54,
  crumbleBack: 300,
  lavaDip: 3,
  spikeInset: 4,
  feetPad: 0,
  hazardPad: 0,
  lavaPad: 0,
};
