// Every number a parent might ask to change, in one place.

export type Setting = 'easy' | 'hard';
export const SETTINGS: readonly Setting[] = ['easy', 'hard'];

const degrees = (value: number): number => (value * Math.PI) / 180;

/** Whatever the screen shape, this many tiles of floor always show in every direction around the player. */
export const VIEW_RADIUS = 5.5;
/** Nothing can touch or see the player from further than this, so it's always on screen first. */
export const LONGEST_REACH = 4;

export const STEP_S = 1 / 60;
export const PLAYER_SPEED = 3;
export const PLAYER_RADIUS = 0.28;
/** The robot's middle has to get this close to catch anyone. */
export const CATCH_RANGE = 0.56;
export const BOLT_HIT = 0.3;
export const BEAM_HIT = 0.2;

/** Standing in a camera's cone this long ends the run. Short, but long enough to flash a warning. */
export const SEEN_GRACE_S = 0.25;
/** A player who has stopped this long counts as standing still. */
export const STILL_AFTER_S = 0.12;
export const ROBOT_TURN_PER_S = 5;
export const WAYPOINT_PAUSE_S = 0.8;
export const CONFUSED_S = 1.3;
/** Chasing robots hear nothing: without seeing the player they give up after `loseAfter`. */
export const CHASE_SIGHT = 8;

export const BOX_S = 7;
export const DISCO_S = 7;
export const DISCO_RANGE = 7;

export const STAR_TIME_PACE = 2.1;

export interface Tuning {
  patrol: number;
  chase: number;
  /** Half the width of a robot's cone. */
  noticeHalf: number;
  noticeRange: number;
  /** How far the cone still reaches when the player stands stock still. */
  stillRange: number;
  /** The robot stands there with a "!" for this long before it runs. */
  alertS: number;
  loseAfter: number;
  cameraHalf: number;
  cameraRange: number;
  /** Over 1 is slower than the level's written rhythm. */
  cameraPace: number;
  sensorPace: number;
  sensorOn: number;
  sensorWarnS: number;
  laserPace: number;
  chargeS: number;
  boltSpeed: number;
}

export const TUNING: Record<Setting, Tuning> = {
  easy: {
    patrol: 1.05,
    chase: 2.1,
    noticeHalf: degrees(24),
    noticeRange: 3.2,
    stillRange: 1.5,
    alertS: 0.65,
    loseAfter: 1.2,
    cameraHalf: degrees(15),
    cameraRange: 3.6,
    cameraPace: 1.3,
    sensorPace: 1.25,
    sensorOn: 0.8,
    sensorWarnS: 0.8,
    laserPace: 1.3,
    chargeS: 0.9,
    boltSpeed: 4.5,
  },
  hard: {
    patrol: 1.6,
    chase: 2.7,
    noticeHalf: degrees(32),
    noticeRange: 3.8,
    stillRange: 2,
    alertS: 0.35,
    loseAfter: 2.2,
    cameraHalf: degrees(21),
    cameraRange: 3.9,
    cameraPace: 1.1,
    sensorPace: 0.85,
    sensorOn: 1,
    sensorWarnS: 0.55,
    laserPace: 0.85,
    chargeS: 0.6,
    boltSpeed: 6,
  },
};
