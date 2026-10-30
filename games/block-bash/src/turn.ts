import { nearestToRay, middleOf, pointOnFacingSheet, type Point } from './aim.ts';
import type { BallId } from './balls.ts';
import { boundsOf, type Bounds, type Level } from './levels.ts';
import { createWorld, type BlockWorld, type WorldEvent } from './physics.ts';
import {
  aimHelp,
  ballsLeft,
  ballThrown,
  blockFell,
  enoughToDrop,
  newRound,
  shouldEnd,
  tick,
  waveDropped,
  waveDue,
  waveSize,
  type Round,
} from './round.ts';
import { ballSize, tableHalf, throwPower, type Difficulty } from './scoring.ts';

export type TurnEvent =
  | WorldEvent
  | { type: 'bigCrash' }
  | { type: 'ready'; lastBall: boolean }
  | { type: 'missed'; helpNext: boolean }
  | { type: 'wave' }
  | { type: 'waveLanded'; at: Point };

const THUMP_SPEED = 5;

export interface Turn {
  world: BlockWorld;
  level: Level;
  bounds: Bounds;
  half: number;
  round(): Round;
  /** Runs one fixed step, and says everything that happened in it. */
  step(seconds: number): TurnEvent[];
  /** Where a tap along this ray should send the ball. */
  aim(origin: Point, direction: Point): Point;
  throwBall(ball: BallId, from: Point, target: Point): void;
  /** Where the next ball would go best, for the pointing finger. */
  bestSpot(): Point;
  finished(): boolean;
  end(): void;
}

/** One player's go at one structure: physics and rules together, with no drawing, so it can be played in a test. */
export function createTurn(level: Level, difficulty: Difficulty): Turn {
  const bounds = boundsOf(level);
  const half = tableHalf(bounds.reach, difficulty);
  const world = createWorld(level, half);
  const middle = { x: bounds.middleX, y: bounds.height / 2, z: 0 };
  let round = newRound(level.blocks.length);
  let landing = false;

  function applyWorld(events: readonly WorldEvent[], out: TurnEvent[]): void {
    for (const event of events) {
      out.push(event);
      if (event.type === 'down') round = blockFell(round);
      if (landing && event.type === 'clack' && !event.byBall && event.speed > THUMP_SPEED) {
        landing = false;
        out.push({ type: 'waveLanded', at: event.at });
      }
    }
  }

  function afterSettling(out: TurnEvent[]): void {
    if (round.waves > 0) world.settleWave();
    if (waveDue(round, world.standingPoints().length) && enoughToDrop(world.spareBlocks())) {
      round = waveDropped(round, world.dropWave(waveSize(round.base)));
      landing = true;
      out.push({ type: 'wave' });
      return;
    }
    out.push({ type: 'ready', lastBall: ballsLeft(round) === 1 });
  }

  return {
    world,
    level,
    bounds,
    half,
    round: () => round,
    step(seconds) {
      const out: TurnEvent[] = [];
      world.step(seconds);
      applyWorld(world.drainEvents(), out);
      const ticked = tick(round, seconds, world.calm());
      round = ticked.round;
      if (ticked.bigCrash) out.push({ type: 'bigCrash' });
      if (ticked.missed) out.push({ type: 'missed', helpNext: aimHelp(false, round.missStreak) === 2 });
      if (ticked.settled) afterSettling(out);
      return out;
    },
    aim(origin, direction) {
      const standing = world.standingPoints();
      const help = aimHelp(difficulty === 'easy', round.missStreak);
      if (help === 2) return middleOf(standing) ?? middle;
      const touched = world.firstBlockOnRay(origin, direction);
      if (touched) return touched;
      if (help === 1) return nearestToRay(origin, direction, standing) ?? middle;
      return pointOnFacingSheet(origin, direction, middle);
    },
    throwBall(ball, from, target) {
      world.throwBall(ball, from, target, throwPower(round.thrown), ballSize(round.thrown));
      round = ballThrown(round);
    },
    bestSpot: () => middleOf(world.standingPoints()) ?? middle,
    finished: () => shouldEnd(round),
    end() {
      round = { ...round, over: true };
    },
  };
}
