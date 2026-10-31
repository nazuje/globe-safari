export const AIR = 0;
export const ROCK = 1;
/** Rough rock with handholds. The only surface a wall jump works from. */
export const GRIP = 2;
export const LEDGE = 3;
export const CRUMBLE = 4;
export const ICE = 5;
export const BELT_LEFT = 6;
export const BELT_RIGHT = 7;
export const PAD = 8;
export const SPIKE_UP = 9;
export const SPIKE_DOWN = 10;
export const SPIKE_RIGHT = 11;
export const SPIKE_LEFT = 12;
/** Looks like rock and lets you through: the door of a hidden room. */
export const FAKE = 13;

export const isSolid = (tile: number): boolean => tile === ROCK || tile === GRIP;

/** Anything you can stand on. All of these but solid rock let you jump up through them. */
export const isSurface = (tile: number): boolean => tile !== AIR && tile < SPIKE_UP;

export const isSpike = (tile: number): boolean => tile >= SPIKE_UP && tile <= SPIKE_LEFT;
