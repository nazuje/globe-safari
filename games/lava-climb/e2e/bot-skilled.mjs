// The skilled bot: plays each level's recorded route in the real built game, by touch, at real speed.
// node e2e/bot-skilled.mjs [level numbers...]   Results land in e2e/skilled.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { allOpen, buildGame, enterLevel, Fingers, openBrowser, openPhone, replay, serveGame } from './harness.mjs';

const routes = JSON.parse(readFileSync(fileURLToPath(new URL('routes.json', import.meta.url)), 'utf8'));
const OUT = fileURLToPath(new URL('skilled.json', import.meta.url));
const MAX_TRIES = 5;
const LANES = Number(process.env.LANES ?? 4);
const HERO_H = 16;

async function oneTry(fingers, route) {
  let closest = Infinity;
  const result = await replay(fingers, route, (state) => {
    if (state.phase === 'climbing' && state.tick > 120) closest = Math.min(closest, state.lava - (state.y + HERO_H));
  });
  return { ...result, closest };
}

async function playLevel(browser, number) {
  const route = routes[`l${number}`];
  if (!route) return { number, won: false, tries: 0, note: 'no route' };
  const { context, page, problems } = await openPhone(browser, { progress: allOpen() });
  await page.waitForSelector('.level-btn');
  await enterLevel(page, number);
  const fingers = await Fingers.on(page);
  await page.waitForTimeout(800);
  const log = [];
  let outcome = null;
  for (let tryNumber = 1; tryNumber <= MAX_TRIES && !outcome; tryNumber += 1) {
    const result = await oneTry(fingers, route);
    log.push(result.won ? 'won' : `singed at y ${result.state.y} tick ${result.state.tick}`);
    if (result.won) outcome = result;
    else {
      for (;;) {
        const state = await fingers.state();
        if (state.phase === 'ready' && state.tryNumber > tryNumber) break;
        await page.waitForTimeout(16);
      }
    }
  }
  await page.waitForTimeout(150);
  const end = outcome ? await fingers.state() : null;
  await context.close();
  return {
    number,
    won: Boolean(outcome),
    tries: log.length,
    seconds: end?.seconds,
    stars: end?.stars,
    gems: end?.gems,
    lavaGapTiles: outcome ? Math.round((outcome.closest / 20) * 10) / 10 : null,
    log,
    problems,
  };
}

async function main() {
  const asked = process.argv.slice(2).filter((word) => /^\d+$/.test(word)).map(Number);
  const numbers = asked.length ? asked : Array.from({ length: 24 }, (_, index) => index + 1);
  if (!process.env.NO_BUILD) buildGame();
  const server = await serveGame();
  const browser = await openBrowser();
  const results = [];
  const queue = numbers.slice();
  async function lane() {
    for (;;) {
      const number = queue.shift();
      if (number === undefined) return;
      const result = await playLevel(browser, number);
      results.push(result);
      console.log(`L${number}: ${result.won ? `WON try ${result.tries}, ${result.seconds}s, ${result.stars} stars, gems ${result.gems}, lava gap ${result.lavaGapTiles} tiles` : `LOST ${result.tries} tries`} ${result.won ? '' : result.log.join('; ')} ${result.problems?.join(' ') ?? ''}`);
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
  const wins = results.filter(({ won }) => won).length;
  console.log(`\n${wins}/${results.length} levels beaten`);
  process.exit(wins === results.length ? 0 : 1);
}

await main();
