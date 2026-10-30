import type { Point } from './aim.ts';
import { BALL_IDS, type BallId } from './balls.ts';
import type { Level } from './levels.ts';
import { starsFor, type Difficulty } from './scoring.ts';
import { FIXED_STEP_S } from './stepper.ts';
import { createTurn } from './turn.ts';

/** Seconds a child takes to throw again once the crash is over. */
const THINKING_S = 1.2;
const LONGEST_TURN_S = 200;

export interface TurnResult {
  stars: number;
  fallen: number;
  seconds: number;
  /** Blocks each ball brought down. */
  perBall: number[];
  waves: number;
}

const unit = (from: Point, to: Point): Point => {
  const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length, z: (to.z - from.z) / length };
};

/** A small repeatable random source, so a failing test fails the same way twice. */
function randomFrom(seed: number): () => number {
  let state = seed * 2654435761 + 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Plays a whole turn the way a small child does: taps somewhere around the
 * structure, often off to one side, with whichever ball comes to hand.
 */
export function playLoosely(level: Level, difficulty: Difficulty, seed: number, ball?: BallId): TurnResult {
  const random = randomFrom(seed);
  const turn = createTurn(level, difficulty);
  const { width, height, middleX } = turn.bounds;
  const eye = { x: middleX + 3, y: height * 0.6 + 5, z: 11 + height + turn.half };
  const perBall: number[] = [];
  let waitUntil = 0;
  let clock = 0;

  while (!turn.finished() && clock < LONGEST_TURN_S) {
    for (const event of turn.step(FIXED_STEP_S)) {
      if (event.type === 'down' && perBall.length > 0) perBall[perBall.length - 1] = (perBall.at(-1) ?? 0) + 1;
      if (event.type === 'ready') waitUntil = clock + THINKING_S;
    }
    clock += FIXED_STEP_S;
    const { ready, thrown } = turn.round();
    if (!ready || clock < waitUntil || thrown >= 6) continue;
    const spot = {
      x: middleX + (random() - 0.5) * (width + 3),
      y: random() * (height + 1.5),
      z: 0,
    };
    const from = { x: eye.x, y: eye.y - 1, z: eye.z - 2 };
    const chosen = ball ?? BALL_IDS[Math.floor(random() * BALL_IDS.length)] ?? 'bowling';
    turn.throwBall(chosen, from, turn.aim(eye, unit(eye, spot)));
    perBall.push(0);
    waitUntil = Infinity;
  }
  const { fallen, base, waves } = turn.round();
  return { stars: starsFor(fallen, base, difficulty, level.sturdy), fallen, seconds: clock, perBall, waves };
}
