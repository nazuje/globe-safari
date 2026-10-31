import { canSee, distance, inView, stepDownhill, stepsFrom, tileCentre, tileOf, turnBetween, type Point } from './grid.ts';
import type { Level, RobotPlan } from './level.ts';
import { CATCH_RANGE, CHASE_SIGHT, CONFUSED_S, DISCO_RANGE, ROBOT_TURN_PER_S, WAYPOINT_PAUSE_S } from './tuning.ts';

export type RobotMode = 'patrol' | 'alert' | 'chase' | 'confused' | 'return' | 'dance';

export interface Robot {
  plan: RobotPlan;
  x: number;
  y: number;
  facing: number;
  mode: RobotMode;
  /** The place in the patrol loop it's heading to. */
  step: number;
  /** Seconds left of the current pause, "!" or head-scratch. */
  wait: number;
  /** Seconds since it last saw the player while chasing. */
  lostFor: number;
  /** The tile centre it's walking to. */
  goal: Point;
  /** The player's tile when last seen. */
  lastSeen: number;
}

export interface RobotNews {
  noticed: boolean;
  gaveUp: boolean;
  caught: boolean;
}

/** What a robot can use from the rest of the run. */
export interface Surroundings {
  level: Level;
  player: Point;
  still: boolean;
  /** Dressed as a box: robots look straight past. */
  boxed: boolean;
  discoOn: boolean;
}

export function newRobot(plan: RobotPlan, level: Level): Robot {
  const first = tileCentre(level.grid, plan.loop[0] ?? 0);
  const second = tileCentre(level.grid, plan.loop[1] ?? plan.loop[0] ?? 0);
  return {
    plan,
    x: first.x,
    y: first.y,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    mode: 'patrol',
    step: 0,
    wait: 0,
    lostFor: 0,
    goal: first,
    lastSeen: 0,
  };
}

function routeTo(level: Level, tile: number): Int16Array {
  const known = level.routes.get(tile);
  if (known) return known;
  const made = stepsFrom(level.grid, tile, false);
  level.routes.set(tile, made);
  return made;
}

function turnTo(robot: Robot, angle: number, seconds: number): void {
  const turn = turnBetween(robot.facing, angle);
  const most = ROBOT_TURN_PER_S * seconds;
  robot.facing += Math.max(-most, Math.min(most, turn));
}

/** Walks towards the goal and turns to face the way it's going. True on arrival. */
function walk(robot: Robot, speed: number, seconds: number): boolean {
  const gap = distance(robot, robot.goal);
  const stride = speed * seconds;
  if (gap > 0.001) turnTo(robot, Math.atan2(robot.goal.y - robot.y, robot.goal.x - robot.x), seconds);
  if (gap <= stride) {
    robot.x = robot.goal.x;
    robot.y = robot.goal.y;
    return true;
  }
  robot.x += ((robot.goal.x - robot.x) / gap) * stride;
  robot.y += ((robot.goal.y - robot.y) / gap) * stride;
  return false;
}

export function robotCone(robot: Robot, level: Level, still: boolean): { from: Point; facing: number; half: number; range: number } {
  const { noticeHalf, noticeRange, stillRange } = level.tuning;
  return { from: robot, facing: robot.facing, half: noticeHalf, range: still ? stillRange : noticeRange };
}

function notices(robot: Robot, world: Surroundings): boolean {
  if (world.boxed) return false;
  return inView(world.level.grid, robotCone(robot, world.level, world.still), world.player);
}

function patrol(robot: Robot, world: Surroundings, seconds: number): void {
  const { grid, tuning } = world.level;
  const { loop, pauses } = robot.plan;
  if (robot.wait > 0) {
    robot.wait -= seconds;
    turnTo(robot, Math.atan2(robot.goal.y - robot.y, robot.goal.x - robot.x), seconds);
    return;
  }
  if (!walk(robot, tuning.patrol, seconds)) return;
  robot.step = (robot.step + 1) % loop.length;
  const tile = loop[robot.step] ?? 0;
  robot.goal = tileCentre(grid, tile);
  if (pauses.has(loop[(robot.step + loop.length - 1) % loop.length] ?? -1)) robot.wait = WAYPOINT_PAUSE_S;
}

function backToPatrol(robot: Robot, world: Surroundings): void {
  const { level } = world;
  const here = routeTo(level, tileOf(level.grid, robot));
  let best = 0;
  let bestSteps = Infinity;
  robot.plan.loop.forEach((tile, index) => {
    const steps = here[tile] ?? -1;
    if (steps >= 0 && steps < bestSteps) {
      best = index;
      bestSteps = steps;
    }
  });
  robot.step = best;
  robot.mode = 'return';
}

function towards(robot: Robot, level: Level, target: number, speed: number, seconds: number): boolean {
  if (!walk(robot, speed, seconds)) return false;
  const tile = tileOf(level.grid, robot);
  if (tile === target) return true;
  const steps = routeTo(level, target);
  if ((steps[tile] ?? -1) < 0) return true;
  robot.goal = tileCentre(level.grid, stepDownhill(level.grid, steps, tile));
  return false;
}

function giveUp(robot: Robot): void {
  robot.mode = 'confused';
  robot.wait = CONFUSED_S;
}

function chase(robot: Robot, world: Surroundings, seconds: number, news: RobotNews): void {
  const { level, player, boxed } = world;
  const { tuning, grid } = level;
  const inSight = !boxed && distance(robot, player) <= CHASE_SIGHT && canSee(grid, robot, player);
  if (inSight) {
    robot.lostFor = 0;
    robot.lastSeen = tileOf(grid, player);
  } else {
    robot.lostFor += seconds;
  }
  if (boxed || robot.lostFor >= tuning.loseAfter) {
    news.gaveUp = true;
    giveUp(robot);
    return;
  }
  const reachable = (routeTo(level, robot.lastSeen)[tileOf(grid, robot)] ?? -1) >= 0;
  if (!reachable) {
    news.gaveUp = true;
    giveUp(robot);
    return;
  }
  if (inSight && tileOf(grid, robot) === robot.lastSeen) {
    robot.goal = { x: player.x, y: player.y };
    walk(robot, tuning.chase, seconds);
    return;
  }
  towards(robot, level, robot.lastSeen, tuning.chase, seconds);
}

function alert(robot: Robot, world: Surroundings, seconds: number): void {
  const { player, level, boxed } = world;
  turnTo(robot, Math.atan2(player.y - robot.y, player.x - robot.x), seconds);
  robot.wait -= seconds;
  if (boxed) {
    giveUp(robot);
    return;
  }
  if (robot.wait > 0) return;
  robot.mode = 'chase';
  robot.lostFor = 0;
  robot.lastSeen = tileOf(level.grid, player);
  robot.goal = tileCentre(level.grid, tileOf(level.grid, robot));
}

function confused(robot: Robot, world: Surroundings, seconds: number): void {
  robot.wait -= seconds;
  robot.facing += seconds * 2.4 * Math.sin(robot.wait * 4);
  if (robot.wait <= 0) backToPatrol(robot, world);
}

function returning(robot: Robot, world: Surroundings, seconds: number): void {
  const { level } = world;
  const target = robot.plan.loop[robot.step] ?? 0;
  if (!towards(robot, level, target, level.tuning.patrol, seconds)) return;
  if (tileOf(level.grid, robot) === target) robot.mode = 'patrol';
}

function dance(robot: Robot, world: Surroundings): void {
  if (!world.discoOn) backToPatrol(robot, world);
}

const nearDisco = (robot: Robot, level: Level): boolean => level.disco !== null && distance(robot, level.disco) <= DISCO_RANGE;

function startWatching(robot: Robot, world: Surroundings, news: RobotNews): void {
  if (robot.mode !== 'patrol' && robot.mode !== 'return' && robot.mode !== 'confused') return;
  if (!notices(robot, world)) return;
  robot.mode = 'alert';
  robot.wait = world.level.tuning.alertS;
  news.noticed = true;
}

/** Moves one robot on by a small step and says what happened. */
export function stepRobot(robot: Robot, world: Surroundings, seconds: number): RobotNews {
  const news: RobotNews = { noticed: false, gaveUp: false, caught: false };
  if (world.discoOn && robot.mode !== 'dance' && nearDisco(robot, world.level)) {
    if (robot.mode === 'chase') news.gaveUp = true;
    robot.mode = 'dance';
  }
  if (robot.mode === 'patrol') patrol(robot, world, seconds);
  else if (robot.mode === 'alert') alert(robot, world, seconds);
  else if (robot.mode === 'chase') chase(robot, world, seconds, news);
  else if (robot.mode === 'confused') confused(robot, world, seconds);
  else if (robot.mode === 'return') returning(robot, world, seconds);
  else dance(robot, world);
  startWatching(robot, world, news);
  news.caught = !world.boxed && robot.mode !== 'dance' && distance(robot, world.player) <= CATCH_RANGE;
  return news;
}
