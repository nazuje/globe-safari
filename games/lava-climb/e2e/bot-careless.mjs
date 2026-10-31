// The careless bot: a child in a hurry. It roughly knows the way up, because it can see it, but it looks
// only every so often, jumps whenever it feels like it, never plans a wall kick and never dashes on
// purpose. It plays the real built game by touch, at real speed, with up to 8 tries on each level.
// node e2e/bot-careless.mjs [level numbers...]   Results land in e2e/careless.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildLevel } from '../src/level.ts';
import { PLANS } from '../src/levels.ts';
import { newRun, step } from '../src/sim.ts';
import { allOpen, buildGame, enterLevel, Fingers, openBrowser, openPhone, serveGame } from './harness.mjs';

const routes = JSON.parse(readFileSync(fileURLToPath(new URL('routes.json', import.meta.url)), 'utf8'));
const OUT = fileURLToPath(new URL('careless.json', import.meta.url));
const MAX_TRIES = 8;
const LANES = Number(process.env.LANES ?? 4);
const LOOK_EVERY_MS = 120;
/** A try that makes no height for this long ends itself: the map button is one tap, as for any child. */
const GIVE_UP_MS = 45000;
/** Stuck for this long, it tries anything: a child wanders about and jumps at things. */
const WANDER_AFTER_MS = 3500;

let seed = 12345;
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/** The places the route lands on, in order: what a child sees as the ledges to reach, one after the other. */
function ledgesOf(number, route) {
  const level = buildLevel(PLANS[number - 1]);
  const run = newRun(level);
  const ledges = [];
  let input = { dir: 0, jump: false, dash: false };
  let at = 0;
  while (run.phase !== 'won' && run.phase !== 'singed') {
    while (at < route.steps.length && route.steps[at].t <= run.tick) {
      input = route.steps[at];
      at += 1;
    }
    step(level, run, input);
    if (!run.ground) continue;
    const last = ledges.at(-1);
    if (last && Math.abs(last.y - run.y) < 1) last.x = run.x;
    else ledges.push({ x: run.x, y: run.y });
  }
  return ledges;
}

async function oneTry(fingers, ledges, tryNumber) {
  let along = 0;
  let nextLook = 0;
  let jumpUntil = 0;
  let wanderUntil = 0;
  let wanderDir = 1;
  let wanted = { dir: 1, jump: false, dash: false };
  let highest = Infinity;
  let highestAt = Date.now();
  for (;;) {
    const state = await fingers.state();
    const now = Date.now();
    if (state.phase !== 'climbing' && state.phase !== 'ready') {
      await fingers.lift();
      return { won: state.phase === 'won' || state.phase === 'result', state, highest };
    }
    if (state.tryNumber !== tryNumber) tryNumber = state.tryNumber;
    if (state.y < highest - 10) {
      highest = state.y;
      highestAt = now;
    }
    if (now - highestAt > GIVE_UP_MS) {
      await fingers.lift();
      return { won: false, state, gaveUp: true };
    }
    if (now >= nextLook) {
      nextLook = now + LOOK_EVERY_MS * (0.7 + random() * 0.9);
      // Standing somewhere it knows? Then the next ledge in order is the one to reach, even after a fall.
      if (state.ground) {
        let closest = 90;
        for (let at = Math.max(0, along - 12); at < Math.min(ledges.length, along + 3); at += 1) {
          const off = Math.abs(ledges[at].x - state.x);
          if (Math.abs(ledges[at].y - state.y) < 3 && off < closest) {
            closest = off;
            along = Math.min(ledges.length - 1, at + 1);
          }
        }
      }
      const aim = ledges[along];
      const gap = aim.x - state.x;
      const stale = now - highestAt > WANDER_AFTER_MS;
      if (stale && now > wanderUntil && random() < 0.3) {
        wanderDir = random() < 0.5 ? 1 : -1;
        wanderUntil = now + 500 + random() * 900;
      }
      const dir = stale && now < wanderUntil ? wanderDir : Math.abs(gap) < 10 ? 0 : gap > 0 ? 1 : -1;
      // Up when near enough, a jump in the air now and then, and it never means to dash.
      const wantsUp = (state.ground && (stale || Math.abs(gap) < 110)) || (!state.ground && random() < 0.12);
      if (wantsUp && now >= jumpUntil + 60) jumpUntil = now + 230 + random() * 220;
      wanted = { dir, jump: false, dash: false };
    }
    wanted.jump = now < jumpUntil;
    await fingers.set(wanted);
  }
}

async function playLevel(browser, number) {
  const route = routes[`l${number}`];
  const ledges = ledgesOf(number, route);
  const { context, page, problems } = await openPhone(browser, { progress: allOpen() });
  await page.waitForSelector('.level-btn');
  await enterLevel(page, number);
  const fingers = await Fingers.on(page);
  const log = [];
  let won = null;
  for (let tries = 1; tries <= MAX_TRIES && !won; tries += 1) {
    const before = (await fingers.state()).tryNumber;
    const result = await oneTry(fingers, ledges, before);
    log.push(result.won ? 'won' : result.gaveUp ? `stuck y ${Math.round(result.state.y)}` : `singed, best ${Math.round((route.track[0][1] - result.highest) / 20)}/${Math.round((route.track[0][1] - route.track.at(-1)[1]) / 20)} rows`);
    if (result.won) won = result;
    else if (result.gaveUp) {
      await page.locator('.hud-left .bar-btn').first().tap();
      await page.waitForSelector('.level-btn');
      await enterLevel(page, number);
      fingers.zones = await Fingers.readZones(page);
    } else {
      for (;;) {
        const state = await fingers.state();
        if (state.phase === 'ready' && state.tryNumber > before) break;
        await page.waitForTimeout(16);
      }
    }
  }
  await page.waitForTimeout(100);
  const end = won ? await fingers.state() : null;
  await context.close();
  return { number, won: Boolean(won), tries: log.length, seconds: end?.seconds, stars: end?.stars, log, problems };
}

async function main() {
  const asked = process.argv.slice(2).filter((word) => /^\d+$/.test(word)).map(Number);
  const numbers = asked.length ? asked : Array.from({ length: 24 }, (_, index) => index + 1);
  if (!process.env.NO_BUILD) buildGame();
  const server = await serveGame();
  const browser = await openBrowser();
  const queue = numbers.slice();
  const results = [];
  async function lane() {
    for (;;) {
      const number = queue.shift();
      if (number === undefined) return;
      const result = await playLevel(browser, number);
      results.push(result);
      console.log(`L${number}: ${result.won ? `WON try ${result.tries}, ${result.seconds}s, ${result.stars} stars` : `LOST ${result.tries} tries`} ${result.log.join('; ')} ${result.problems.join(' ')}`);
    }
  }
  try {
    await Promise.all(Array.from({ length: LANES }, lane));
  } finally {
    await browser.close();
    server.kill();
  }
  results.sort((a, b) => a.number - b.number);
  writeFileSync(OUT, `${JSON.stringify(results, null, 1)}\n`);
  console.log(`\n${results.filter(({ won }) => won).length}/${results.length} levels beaten`);
}

await main();
