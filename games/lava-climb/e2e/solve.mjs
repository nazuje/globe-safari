// Finds a route up each level by searching the game's own rules, and records it to routes.json.
// node e2e/solve.mjs [level numbers...]
//
// The search walks forward in time from the start and keeps the first arrival in each small box of
// position and speed, so what it finds is close to the fastest way up. It plays by stricter rules than a
// child does: no coyote time or jump buffer, feet must land well inside a ledge and spikes count
// as bigger. So a route never leans on the kindnesses, and has room to spare when replayed by hand.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLevel, cell } from '../src/level.ts';
import { PIECES_OF, PLANS } from '../src/levels.ts';
import { STAMPS, TOP } from '../src/stamps.ts';
import { copyRun, newRun, step } from '../src/sim.ts';
import { COLS, HERO_H, HERO_W, RULES, TILE } from '../src/tuning.ts';
import { isSolid } from '../src/tiles.ts';

const ROUTES = fileURLToPath(new URL('routes.json', import.meta.url));
const STEP = 6;
const HARD = { ...RULES, feetPad: Number(process.env.FEET ?? 7), hazardPad: Number(process.env.HAZARD ?? 6), lavaPad: 14 };
/** A change of buttons costs this many ticks of searching, so a route has few of them, like a hand. */
const CHANGE_COST = Number(process.env.CHANGE_COST ?? 14);
const MAX_STATES = Number(process.env.MAX_STATES ?? 2_500_000);

/** Ticks of searching each unit of distance to go is worth. More is quicker to find, less is a quicker route. */
const GREED = Number(process.env.GREED ?? 3);

function actions(level, run) {
  const list = [];
  const dashing = level.dash && run.dashReady && !run.ground;
  // A press in plain air does nothing but set up a jump on landing, so it's only tried where it counts.
  const canPress = run.jumpWas || run.ground || run.coyote > 0 || (level.walls && (run.wall !== 0 || run.wallGrace > 0)) || run.y + HERO_H + 40 > 0 && run.vy > 150;
  for (const dir of [1, -1, 0]) {
    for (const jump of canPress ? [false, true] : [false]) {
      list.push({ dir, jump, dash: false });
      if (dashing && dir !== 0) list.push({ dir, jump, dash: true });
    }
  }
  return list;
}

/** Steps from every open tile to a goal, around rock. A guide for which arrivals to keep looking at. */
function distanceField(level, goalX, goalY) {
  const field = new Int32Array(level.rows * COLS).fill(-1);
  const queue = [Math.floor(goalY / TILE) * COLS + Math.floor(goalX / TILE)];
  field[queue[0]] = 0;
  for (let at = 0; at < queue.length; at += 1) {
    const here = queue[at];
    const row = Math.floor(here / COLS);
    const col = here % COLS;
    for (const [c, r] of [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]]) {
      if (c < 0 || c >= COLS || r < 0 || r >= level.rows) continue;
      const next = r * COLS + c;
      if (field[next] !== -1 || isSolid(cell(level, c, r))) continue;
      field[next] = field[here] + 1;
      queue.push(next);
    }
  }
  return field;
}

const guide = (level, field, run) => {
  const row = Math.floor((run.y + HERO_H / 2) / TILE);
  const col = Math.floor((run.x + HERO_W / 2) / TILE);
  const value = field[row * COLS + col] ?? -1;
  return value < 0 ? 1e6 : value * TILE + (run.ground ? 0 : 6);
};

const same = (a, b) => a.dir === b.dir && a.jump === b.jump && a.dash === b.dash;

const timed = (level) => level.movers.length > 0 || level.droppers.length > 0;

function boxOf(level, run, time) {
  const x = Math.round(run.x / 4);
  const y = Math.round(run.y / 4);
  const vy = run.ground ? 0 : Math.round(run.vy / 70) + 8;
  const vx = Math.round(run.vx / 60) + 6;
  const flags = (run.ground ? 1 : 0) | (run.dashReady ? 2 : 0) | (run.lastWall === 0 ? 0 : run.lastWall > 0 ? 4 : 8) | (run.dashLeft > 0 ? 16 : 0) | (run.lock > 0 ? 32 : 0) | (run.jumpWas ? 64 : 0) | (run.rising ? 128 : 0);
  const clock = timed(level) && time ? Math.floor(run.tick / 60) % 8 : 0;
  return `${x},${y},${vy},${vx},${flags},${clock},${run.mover}`;
}

function advance(level, run, action) {
  const next = copyRun(run);
  for (let tick = 0; tick < STEP; tick += 1) {
    const input = tick === 0 ? action : { ...action, dash: action.dash };
    step(level, next, input, HARD);
    if (next.phase !== 'climbing' || next.risky) break;
  }
  return next;
}

/** A small binary heap: the arrival that looks closest to the goal comes out first. */
class Queue {
  items = [];

  push(item) {
    const { items } = this;
    items.push(item);
    let at = items.length - 1;
    while (at > 0) {
      const up = (at - 1) >> 1;
      if (items[up].rank <= items[at].rank) break;
      [items[up], items[at]] = [items[at], items[up]];
      at = up;
    }
  }

  pop() {
    const { items } = this;
    const top = items[0];
    const end = items.pop();
    if (items.length > 0) {
      items[0] = end;
      let at = 0;
      for (;;) {
        const left = at * 2 + 1;
        const right = left + 1;
        let low = at;
        if (left < items.length && items[left].rank < items[low].rank) low = left;
        if (right < items.length && items[right].rank < items[low].rank) low = right;
        if (low === at) break;
        [items[low], items[at]] = [items[at], items[low]];
        at = low;
      }
    }
    return top;
  }

  get size() {
    return this.items.length;
  }
}

/** A quick way from a state to a goal, as a list of actions. Weighted towards the goal, then towards speed. */
function search(level, from, goal, target, limit = MAX_STATES) {
  const field = distanceField(level, target.x, target.y);
  const seen = new Set();
  const queue = new Queue();
  queue.push({ run: from, parent: null, action: null, rank: 0, cost: 0 });
  let states = 0;
  let best = { y: 1e9, x: 0, t: 0 };
  while (queue.size && states < limit) {
    const node = queue.pop();
    const order = [node.action, ...actions(level, node.run)].filter((a, i, all) => a && all.findIndex((b) => b && same(a, b)) === i);
    for (const action of order) {
      const run = advance(level, node.run, action);
      if (run.phase === 'singed' || run.risky) continue;
      const child = { run, parent: node, action, rank: 0, cost: node.cost + (node.action && !same(node.action, action) ? CHANGE_COST : 0) };
      if (goal(run)) return { node: child, states };
      const box = boxOf(level, run, true);
      if (seen.has(box)) continue;
      seen.add(box);
      states += 1;
      if (run.y < best.y) best = { y: run.y, x: run.x, t: run.tick };
      child.rank = run.tick + child.cost + GREED * guide(level, field, run);
      queue.push(child);
    }
  }
  return { node: null, states, best };
}

function pathOf(node) {
  const steps = [];
  for (let at = node; at && at.action; at = at.parent) steps.push(at.action);
  return steps.reverse();
}

/** Plays a list of actions by the strict rules. Answers with where it ended. */
function play(level, steps, rules = HARD) {
  const run = newRun(level);
  let hurt = false;
  for (const action of steps) {
    for (let tick = 0; tick < STEP; tick += 1) {
      step(level, run, action, rules);
      if (run.risky) hurt = true;
    }
    if (run.phase !== 'climbing') break;
  }
  return { run, hurt };
}

/** The clock only starts with the first press, so nothing before it is part of the route. */
const withoutIdleStart = (steps) => steps.slice(steps.findIndex((action) => action.dir !== 0 || action.jump || action.dash));

/** Takes out twitches the search left in: any change the route doesn't need is removed. */
function simplify(level, steps, want) {
  const out = steps.slice();
  const good = (list) => {
    const { run, hurt } = play(level, list);
    return !hurt && run.phase === 'won' && want(run);
  };
  for (let pass = 0; pass < 3; pass += 1) {
    let changed = false;
    for (let at = out.length - 2; at >= 1; at -= 1) {
      if (same(out[at], out[at - 1])) continue;
      let end = at;
      while (end + 1 < out.length && same(out[end + 1], out[at])) end += 1;
      if (end - at > 10) continue;
      const trial = out.slice();
      for (let i = at; i <= end; i += 1) trial[i] = out[at - 1];
      if (good(trial)) {
        out.splice(0, out.length, ...trial);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

/** Holds each jump a little longer wherever the route allows, so no ledge is cleared by a whisker. */
function holdLonger(level, steps, want) {
  const out = steps.map((step_) => ({ ...step_ }));
  const good = (list) => {
    const { run, hurt } = play(level, list);
    return !hurt && run.phase === 'won' && want(run);
  };
  for (let at = 1; at < out.length; at += 1) {
    if (!out[at - 1].jump || out[at].jump) continue;
    for (let more = 0; more < 5 && at + more < out.length - 1; more += 1) {
      const trial = out.map((item, index) => (index === at + more ? { ...item, jump: true } : item));
      if (!good(trial)) break;
      out.splice(0, out.length, ...trial);
    }
  }
  return out;
}

/** The plain recording: each change of buttons on its exact tick, for the test that replays it. */
function stepsOf(steps) {
  return steps.flatMap((action, index) => (index > 0 && same(action, steps[index - 1]) ? [] : [{ t: index * STEP, ...action }]));
}

const round = (value) => Math.round(value * 10) / 10;

function trackOf(level, steps) {
  const run = newRun(level);
  const track = [];
  steps.forEach((action) => {
    track.push([round(run.x), round(run.y), run.tick]);
    for (let tick = 0; tick < STEP; tick += 1) step(level, run, action, HARD);
  });
  return track;
}

/** The most the lava could speed up by while this route still stays 2 tiles clear of it. */
function fastestLava(level, track) {
  let best = Infinity;
  for (const [, y, tick] of track) {
    if (tick < 120) continue;
    best = Math.min(best, ((level.lavaStart - (y + HERO_H + 2 * TILE)) / tick) * 120);
  }
  return round(best);
}

function solveLevel(plan, keepGems) {
  const level = buildLevel(plan);
  const start = newRun(level);
  start.phase = 'ready';
  const gems = level.gems.map((gem, index) => ({ ...gem, index })).filter((gem) => keepGems && (!gem.secret || process.env.SECRETS)).sort((a, b) => b.y - a.y);
  let run = start;
  const steps = [];
  const missed = [];
  const stages = [...gems.map((gem) => ({ name: `gem${gem.index}`, target: gem, goal: (r) => r.ground && (r.gems & (1 << gem.index)) !== 0 })), { name: 'exit', target: { x: level.exit.x + 10, y: level.exit.y + 30 }, goal: (r) => r.phase === 'won' }];
  let total = 0;
  for (const stage of stages) {
    const found = search(level, run, stage.goal, stage.target);
    if (process.env.TRACE) console.log(stage.name, found.node ? `ok y ${Math.round(found.node.run.y)} x ${Math.round(found.node.run.x)} t ${found.node.run.tick / 120}` : `fail best row ${Math.round(found.best.y / 20)} col ${Math.round(found.best.x / 20)}`, found.states);
    total += found.states;
    if (!found.node) {
      if (stage.name === 'exit') return { level, failed: true, steps, run: { ...run, ...found.best, y: found.best.y }, total, missed };
      missed.push(stage.name);
      continue;
    }
    steps.push(...pathOf(found.node));
    run = found.node.run;
  }
  return { level, steps, run, total, missed, failed: false };
}

const MARGINS = [[7, 6], [5, 4], [4, 3]];

function solve(plan) {
  const started = Date.now();
  let result = null;
  for (const [feet, hazard] of MARGINS) {
    HARD.feetPad = feet;
    HARD.hazardPad = hazard;
    result = solveLevel(plan, true);
    if (!result.failed && result.missed.length === 0) break;
  }
  if (result.failed) result = solveLevel(plan, false);
  return report(plan, result, started);
}

function pieceAt(plan, row) {
  const pieces = PIECES_OF[PLANS.indexOf(plan)] ?? [];
  let top = TOP.length;
  for (let at = pieces.length - 1; at >= 0; at -= 1) {
    const name = pieces[at].replace('!', '');
    const height = STAMPS[name].rows.length;
    if (row < top + height) return `${pieces[at - 1] ?? 'floor'} > ${pieces[at]} @${Math.round(row - top)}`;
    top += height;
  }
  return 'bottom';
}

function report(plan, result, started) {
  const { level } = result;
  if (result.failed) {
    console.log(`${plan.id}: NO ROUTE near ${pieceAt(plan, result.run.y / TILE)} best row ${Math.round(result.run.y / TILE)} of ${level.rows}, col ${Math.round(result.run.x / TILE)}, t ${result.run.t / 120}, ${result.total} states, ${Date.now() - started}ms`);
    return null;
  }
  const collected = result.run.gems;
  const want = (run) => (run.gems & collected) === collected;
  const steps = holdLonger(level, simplify(level, withoutIdleStart(result.steps), want), want);
  const route = { id: plan.id, seconds: round(play(level, steps).run.tick / 120), gems: collected, margin: HARD.feetPad, track: trackOf(level, steps), steps: stepsOf(steps) };
  const fast = fastestLava(level, route.track);
  console.log(`${plan.id}: ${route.seconds}s, ${route.steps.length} changes, gems ${popcount(collected)}/${level.gems.length}${result.missed.length ? ` missed ${result.missed}` : ''}, margin ${HARD.feetPad}, lava now ${level.lavaSpeed} limit ${fast}, ${level.rows} rows, ${Date.now() - started}ms`);
  return route;
}

const popcount = (bits) => bits.toString(2).replaceAll('0', '').length;

function main() {
  const asked = process.argv.slice(2).filter((word) => /^\d+$/.test(word)).map(Number);
  const saved = existsSync(ROUTES) ? JSON.parse(readFileSync(ROUTES, 'utf8')) : {};
  const plans = PLANS.filter((_, index) => !asked.length || asked.includes(index + 1));
  for (const plan of plans) {
    const route = solve(plan);
    if (route) saved[plan.id] = route;
  }
  if (process.env.DRY) return;
  const latest = existsSync(ROUTES) ? JSON.parse(readFileSync(ROUTES, 'utf8')) : {};
  for (const plan of plans) if (saved[plan.id]) latest[plan.id] = saved[plan.id];
  Object.assign(saved, latest);
  writeFileSync(ROUTES, `{\n${Object.keys(saved).sort((a, b) => a.slice(1) - b.slice(1)).map((id) => `${JSON.stringify(id)}: ${JSON.stringify(saved[id])}`).join(',\n')}\n}\n`);
}

export { solveLevel };
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
