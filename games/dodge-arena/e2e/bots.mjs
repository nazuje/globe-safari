// Plays the real built game with real touches: a skilled bot, a careless bot and an idle bot.
//   npx vite build && node e2e/bots.mjs                     everything
//   node e2e/bots.mjs --endless skilled,careless,idle --runs 3
//   node e2e/bots.mjs --stages 1-12 --bots skilled,careless --runs 2
// The bots know only what is in #readout's data attributes, which every build publishes, and they move only by touching the screen.
import { readDangers } from '../src/readout.ts';
import { carelessMove, skilledChoice } from '../src/bots.ts';
import { launch, openPage, readSight, startServer, tapElement, toScreen } from './lib.mjs';

const MOVE_FINGER = 1;
const LEAP_FINGER = 2;
const STEER_REACH = 3.2;
const SAFE_TOP = 180;
const END_WAIT_MS = 120;
const THINK_GAP_MS = 20;
const LONGEST_RUN_S = 480;

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

function parseRange(value) {
  const [from, to = from] = value.split('-').map(Number);
  return Array.from({ length: to - from + 1 }, (_, at) => from + at);
}

const parsePlayer = (value) => {
  const [x, z, height, air] = value.split(',').map(Number);
  return { x, z, height, air };
};

/** Finds a point in the wanted direction that a finger can actually rest on. */
function fingerPoint(sight, player, worldX, worldZ) {
  for (let share = 1; share > 0.1; share -= 0.15) {
    const x = player.x + (worldX - player.x) * share;
    const z = player.z + (worldZ - player.z) * share;
    const point = toScreen(sight.camera, x, z, sight.width, sight.height);
    const box = sight.fingerBox;
    const onLeap = box && point.x > box.x - 12 && point.y > box.y - 12;
    if (point.x > 6 && point.x < sight.width - 6 && point.y > SAFE_TOP && point.y < sight.height - 6 && !onLeap) return point;
  }
  return toScreen(sight.camera, player.x, player.z, sight.width, sight.height);
}

async function steer(fingers, point) {
  if (fingers.isDown(MOVE_FINGER)) await fingers.move(MOVE_FINGER, point.x, point.y);
  else await fingers.down(MOVE_FINGER, point.x, point.y);
}

async function leap(fingers, sight) {
  const box = sight.fingerBox;
  await fingers.down(LEAP_FINGER, box.x + box.width / 2, box.y + box.height / 2);
  await fingers.up(LEAP_FINGER);
}

const THINKERS = {
  async skilled(state, fingers, sight, player) {
    const dangers = readDangers(sight.dangers);
    const pickups = sight.pickups ? sight.pickups.split(',').map((item) => ({ x: Number(item.split(':')[1]), z: Number(item.split(':')[2]) })) : [];
    const ready = sight.leapReady === 'true';
    const choice = skilledChoice({ x: player.x, z: player.z, air: player.air, ready, dangers, pickups }, state.last);
    state.last = choice;
    await steer(fingers, fingerPoint(sight, player, player.x + choice.moveX * STEER_REACH, player.z + choice.moveZ * STEER_REACH));
    if (choice.leap && ready) await leap(fingers, sight);
  },
  async careless(_state, fingers, sight, player) {
    const move = carelessMove(Number(sight.clock), player);
    await steer(fingers, fingerPoint(sight, player, player.x + move.moveX * STEER_REACH, player.z + move.moveZ * STEER_REACH));
  },
  async idle() {},
};

/** Plays until the run ends. Returns what the game itself says happened. */
async function playRun(page, fingers, botName) {
  const state = { last: { moveX: 0, moveZ: 0 } };
  await page.waitForFunction(() => document.getElementById('readout').dataset.phase === 'play' && document.body.dataset.screen === 'play');
  const started = Date.now();
  let sight = await readSight(page);
  let ticks = 0;
  let busiest = 0;
  while (sight.phase === 'play' && (Date.now() - started) / 1000 < LONGEST_RUN_S) {
    await THINKERS[botName](state, fingers, sight, parsePlayer(sight.player));
    // A think per frame or so: asking any faster starves the page it is playing.
    await new Promise((resolve) => setTimeout(resolve, THINK_GAP_MS));
    sight = await readSight(page);
    busiest = Math.max(busiest, Number(sight.dangerCount));
    ticks += 1;
  }
  if (fingers.isDown(MOVE_FINGER)) await fingers.up(MOVE_FINGER);
  await page.waitForTimeout(END_WAIT_MS);
  sight = await readSight(page);
  const wall = (Date.now() - started - END_WAIT_MS) / 1000;
  return {
    bot: botName,
    survived: Number(sight.clock),
    phase: sight.phase,
    hits: Number(sight.hits),
    bonks: sight.bonks,
    hearts: Number(sight.hearts),
    peakDraws: Number(sight.drawsPeak),
    busiest,
    frames: Number(sight.frames),
    wall,
    ticks,
  };
}

const line = (run) => `${run.survived.toFixed(1).padStart(6)}s ${run.phase.padEnd(4)} hits ${run.hits} draws ${run.peakDraws} with up to ${run.busiest} dangers, fps ${(run.frames / run.wall).toFixed(0)} game speed ${(run.survived / run.wall).toFixed(2)} [${run.bonks}]`;

async function playEndless(botName, runs) {
  const browser = await launch();
  const { page, context, fingers, problems } = await openPage(browser);
  await tapElement(page, fingers, '[data-mode=endless]');
  const results = [];
  for (let run = 0; run < runs; run += 1) {
    results.push(await playRun(page, fingers, botName));
    console.log(`endless ${botName} #${run + 1}: ${line(results.at(-1))}`);
    if (run < runs - 1) await tapElement(page, fingers, '[data-action=retry]');
  }
  await context.close();
  await browser.close();
  return { results, problems };
}

async function playStage(botName, id, tries) {
  const browser = await launch();
  const { page, context, fingers, problems } = await openPage(browser, { stages: id - 1 });
  await tapElement(page, fingers, '[data-mode=challenge]');
  await tapElement(page, fingers, `[data-stage="${id}"]`);
  const results = [];
  for (let run = 0; run < tries; run += 1) {
    results.push(await playRun(page, fingers, botName));
    console.log(`stage ${id} ${botName} #${run + 1}: ${line(results.at(-1))}`);
    if (run < tries - 1) await tapElement(page, fingers, '[data-action=retry]');
  }
  await context.close();
  await browser.close();
  return { results, problems };
}

/** Runs jobs a few at a time, since each one is a real browser playing in real time. */
async function inParallel(jobs, limit) {
  const results = [];
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const at = next;
      next += 1;
      results[at] = await jobs[at]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const median = (values) => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

async function main() {
  const runs = Number(option('runs', 3));
  const bots = option('bots', 'skilled,careless').split(',');
  const endless = option('endless', option('stages', null) ? '' : 'skilled,careless,idle').split(',').filter(Boolean);
  const stages = parseRange(option('stages', '1-12'));
  const onlyEndless = process.argv.includes('--endless') && !process.argv.includes('--stages');
  const server = await startServer();
  const jobs = [];
  for (const name of endless) jobs.push(() => playEndless(name, runs).then((out) => ({ kind: 'endless', name, ...out })));
  if (!onlyEndless) {
    for (const id of stages) for (const name of bots) jobs.push(() => playStage(name, id, runs).then((out) => ({ kind: 'stage', id, name, ...out })));
  }
  const finished = await inParallel(jobs, Number(option('parallel', 4)));
  server.kill();
  console.log('\n=== real results ===');
  for (const job of finished) {
    const label = job.kind === 'endless' ? `endless ${job.name}` : `stage ${job.id} ${job.name}`;
    const times = job.results.map((run) => run.survived);
    const wins = job.results.filter((run) => run.phase === 'won').length;
    const detail = job.kind === 'endless' ? `median ${median(times).toFixed(1)}s (${times.map((time) => time.toFixed(1)).join(', ')})` : `won ${wins}/${job.results.length} (hits ${job.results.map((run) => run.hits).join(',')})`;
    console.log(`${label.padEnd(24)} ${detail}${job.problems.length ? ` PROBLEMS: ${job.problems.join('; ')}` : ''}`);
  }
  const all = finished.flatMap((job) => job.results);
  console.log(`peak draw calls: ${Math.max(...all.map((run) => run.peakDraws))}, with up to ${Math.max(...all.map((run) => run.busiest))} dangers on screen`);
}

await main();
