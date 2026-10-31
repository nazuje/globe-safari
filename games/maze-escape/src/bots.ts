import { distance, openNeighbours, stepDownhill, tileCentre, tileOf, type Point } from './grid.ts';
import { trailTiles, updateGuide } from './guide.ts';
import { sensorState } from './hazards.ts';
import { helpFor, withHelp, type Level, type Sensor } from './level.ts';
import { copyRun, newRun, retryRun, stepRun, tick, type Run, type Steer } from './run.ts';
import { STEP_S, VIEW_RADIUS } from './tuning.ts';

// Simulated players, for tests only. The skilled one is a proof that a level is fair: it sees
// only what's on screen, the way a child does. It can't know about anything further than
// the view shows, so if it wins, nothing in the level needed knowledge from off-screen.

const LOOK_STEP_S = 0.34;
const LOOK_STEPS = 14;
const LOOK_SLICE_S = 1 / 20;
const PLAN_EVERY_S = 0.2;
const REACTION_S = 0.25;
const NOTICED_COST = 40;
const CHASED_COST = 30;
const CHASED_CLOSE = 3.5;
/** Only the most promising places are thought through further. */
const BEAM = 16;

/** A child can't time a plate to the millisecond, so the bot doesn't either: it stays clear of each end of the "on" time. */
const carefully = (sensor: Sensor): Sensor => ({ ...sensor, on: sensor.on + 2 * REACTION_S, offset: sensor.offset + REACTION_S });

/** Which hazards are on screen right now. Everything else simply doesn't exist for the bot. */
export function onScreen(run: Run): Run {
  const near = (spot: Point): boolean => distance(run, spot) <= VIEW_RADIUS;
  const level: Level = {
    ...run.level,
    cameras: run.level.cameras.filter((camera) => near(camera.from)),
    lasers: run.level.lasers.filter((laser) => near(laser.from)),
    sensors: run.level.sensors.filter(({ tiles }) => tiles.some((tile) => near(tileCentre(run.level.grid, tile)))).map(carefully),
    boxes: [],
    disco: null,
    treasure: null,
  };
  return copyRun(run, level, run.robots.filter(near));
}

export function steerToward(from: Point, to: Point): Steer {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const gap = Math.hypot(dx, dy);
  return gap < 0.06 ? null : { x: dx / gap, y: dy / gap };
}

/** Plays out one move in the bot's head. */
function imagine(from: Run, target: number | null): Run {
  const next = copyRun(from);
  const spot = target === null ? null : tileCentre(next.level.grid, target);
  for (let left = LOOK_STEP_S; left > 0 && next.phase === 'play'; left -= LOOK_SLICE_S) {
    tick(next, spot && steerToward(next, spot), LOOK_SLICE_S);
  }
  return next;
}

interface Idea {
  run: Run;
  tile: number;
  /** The first move on the way here: null means stand still. */
  first: number | null;
  score: number;
  depth: number;
}

function scoreOf(run: Run, tile: number): number {
  if (run.phase === 'won') return -1000;
  const steps = run.level.exitSteps[tile] ?? 999;
  const chased = run.robots.some((robot) => (robot.mode === 'chase' || robot.mode === 'alert') && distance(robot, run) < CHASED_CLOSE);
  return steps + (run.noticed ? NOTICED_COST : 0) + (chased ? CHASED_COST : 0);
}

function chooseMove(run: Run): number | null {
  const start = onScreen(run);
  const here = tileOf(run.level.grid, run);
  const known = run.noticed;
  let frontier: Idea[] = [{ run: { ...start, noticed: known }, tile: here, first: null, score: Infinity, depth: 0 }];
  let best: Idea | null = null;
  for (let depth = 1; depth <= LOOK_STEPS; depth += 1) {
    const reached = new Map<number, Idea>();
    for (const idea of frontier) {
      for (const target of [null, ...openNeighbours(run.level.grid, idea.tile)]) {
        const after = imagine(idea.run, target);
        if (after.phase === 'lost') continue;
        const tile = target ?? idea.tile;
        const next: Idea = { run: after, tile, first: idea.depth === 0 ? target : idea.first, score: scoreOf(after, tile), depth };
        const rival = reached.get(tile);
        if (!rival || next.score < rival.score) reached.set(tile, next);
      }
    }
    frontier = [...reached.values()].sort((a, b) => a.score - b.score).slice(0, BEAM);
    if (frontier.length === 0) break;
    for (const idea of frontier) {
      if (!best || idea.depth > best.depth || (idea.depth === best.depth && idea.score < best.score)) best = idea;
    }
  }
  return best ? best.first : null;
}

export interface BotResult {
  run: Run;
  seconds: number;
}

function play(run: Run, steerFor: (run: Run) => Steer, most: number): BotResult {
  let played = 0;
  while (played < most && run.phase === 'play') {
    stepRun(run, steerFor(run), STEP_S);
    run.events.length = 0;
    played += STEP_S;
  }
  return { run, seconds: played };
}

/** Watches the screen, thinks a few seconds ahead and never looks past the view. */
export function playSkilled(start: Run, most = 400): BotResult {
  let target: Point = start.level.start;
  let sincePlan = PLAN_EVERY_S;
  return play(
    start,
    (run) => {
      sincePlan += STEP_S;
      if (sincePlan >= PLAN_EVERY_S) {
        sincePlan = 0;
        target = tileCentre(run.level.grid, chooseMove(run) ?? tileOf(run.level.grid, run));
      }
      return steerToward(run, target);
    },
    most,
  );
}

/** Runs along the glowing trail and looks at nothing else. */
export function playCareless(start: Run, most = 200): BotResult {
  return play(
    start,
    (run) => {
      const { grid, exitSteps } = run.level;
      return steerToward(run, tileCentre(grid, stepDownhill(grid, exitSteps, tileOf(grid, run))));
    },
    most,
  );
}

/** Never touches the screen. */
export const playHandsOff = (start: Run, most = 300): BotResult => play(start, () => null, most);

// The child-like bot. Tuned against a bot that really plays by touch and sight, whose results are the
// real measure: if this one says a level is easy and that one loses, this one is wrong. So it reacts
// late and unevenly, moves below top speed, and hesitates now and then.

const REACT_MIN_S = 0.4;
const REACT_SPREAD_S = 0.7;
const PACE = 0.85;
const HESITATE_PER_S = 0.25;
const HESITATE_S = 0.35;
const CHILD_ATTEMPT_S = 240;

/** A small repeatable dice, so a test always plays the same games. */
function dice(seed: number): () => number {
  let state = seed * 2654435761 + 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function plateAhead(run: Run, tile: number, t: number): boolean {
  return run.level.sensors.some((sensor) => sensor.tiles.includes(tile) && sensorState(sensor, t) !== 'off');
}

const slowed = (steer: Steer): Steer => steer && { x: steer.x * PACE, y: steer.y * PACE };

function childSteer(run: Run, seenLeg: number, react: number): Steer {
  const { grid } = run.level;
  const here = tileOf(grid, run);
  const next = trailTiles(run, 1)[0];
  const sign = run.level.stops[run.atSign];
  if (sign && seenLeg <= run.atSign) return steerToward(run, sign.spot);
  if (next === undefined) return steerToward(run, tileCentre(grid, here));
  const onPlate = run.level.sensors.some(({ tiles }) => tiles.includes(here));
  if (!onPlate && plateAhead(run, next, run.t - react)) return steerToward(run, tileCentre(grid, here));
  return slowed(steerToward(run, tileCentre(grid, next)));
}

/** One try: follows the trail, stops at wait signs, keeps off lit plates, and reacts late. Knows nothing else. */
function childTry(run: Run, dawdle: number, roll: () => number): Run {
  const legs: number[] = [];
  let react = REACT_MIN_S + roll() * REACT_SPREAD_S;
  let pause = 0;
  for (let played = 0; played < CHILD_ATTEMPT_S && run.phase === 'play'; played += STEP_S) {
    updateGuide(run, STEP_S);
    legs.push(run.leg);
    const memory = Math.round(react / STEP_S);
    while (legs.length > memory) legs.shift();
    if (legs.length === 1) react = REACT_MIN_S + roll() * REACT_SPREAD_S;
    if (pause <= 0 && roll() < HESITATE_PER_S * STEP_S) pause = HESITATE_S;
    pause -= STEP_S;
    const idle = played < dawdle || pause > 0;
    stepRun(run, idle ? null : childSteer(run, legs[0] ?? run.leg, react), STEP_S);
    run.events.length = 0;
  }
  return run;
}

export interface ChildResult {
  /** Attempts made and wins among them, with help and resets as the real game gives them. */
  attempts: number;
  wins: number;
  /** The attempt the first win came on, or 0. */
  firstWin: number;
  causes: string[];
}

/** Plays a level over and over the way a six-year-old might, with the same quiet help the game gives. */
export function playChild(base: Level, attempts = 10, seed = 1): ChildResult {
  const roll = dice(seed);
  const causes: string[] = [];
  let losses = 0;
  let wins = 0;
  let firstWin = 0;
  let run = newRun(base);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const ended = childTry(run, roll() * 3, roll);
    if (ended.phase === 'won') {
      wins += 1;
      firstWin ||= attempt;
      losses = 0;
      run = newRun(base);
    } else {
      causes.push(`${ended.cause ?? 'stuck'} ${ended.x.toFixed(0)},${ended.y.toFixed(0)}`);
      losses += 1;
      run = retryRun(ended, withHelp(base, helpFor(losses)));
    }
  }
  return { attempts, wins, firstWin, causes };
}
