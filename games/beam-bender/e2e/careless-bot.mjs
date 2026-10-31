// A careless player. It taps real mirrors at random until it wins or runs out of moves, then takes the one-tap
// retry. The random numbers are seeded, so a run can be repeated. Run `npx vite build` first.
// Usage: node e2e/careless-bot.mjs [tries per level, default 20]
import { LEVELS } from '../src/rules/levels.ts';
import { allOpen, launch, openLevel, openPage, screenIs, serve, touch } from './lib.mjs';

const TRIES = Number(process.argv[2] ?? 20);
const TAP_WAIT_MS = 12;

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const statusOf = (page) => page.evaluate(() => document.body.dataset.status);

/** One try: random mirrors until the level ends. Returns true on a win. */
async function oneTry(page, boxes, random) {
  for (;;) {
    const box = boxes[Math.floor(random() * boxes.length)];
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(TAP_WAIT_MS);
    const status = await statusOf(page);
    if (status !== 'playing') return status === 'won';
  }
}

async function playLevel(page, level, random) {
  let wins = 0;
  await openLevel(page, level.id);
  const boxes = await page.locator('.piece-hit').evaluateAll((items) => items.map((item) => {
    const { x, y, width, height } = item.getBoundingClientRect();
    return { x, y, width, height };
  }));
  for (let attempt = 0; attempt < TRIES; attempt += 1) {
    const won = await oneTry(page, boxes, random);
    if (won) {
      wins += 1;
      await screenIs(page, 'won');
      await page.waitForSelector('.card-btn.armed');
      await touch(page, '.card-row .card-btn:first-child');
      await page.waitForFunction(() => document.body.dataset.screen === 'play' && document.body.dataset.moves === '0');
    } else {
      await page.waitForFunction(() => document.body.dataset.screen === 'lost');
      await page.waitForSelector('[data-action="try-again"].armed');
      await touch(page, '[data-action="try-again"]');
      await page.waitForFunction(() => document.body.dataset.screen === 'play' && document.body.dataset.moves === '0');
    }
  }
  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  return wins;
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  const random = seeded(20261031);
  const byWorld = new Map();
  let lastWorldWins = 0;
  try {
    for (const level of LEVELS) {
      const wins = await playLevel(page, level, random);
      const world = byWorld.get(level.world) ?? { wins: 0, tries: 0 };
      byWorld.set(level.world, { wins: world.wins + wins, tries: world.tries + TRIES });
      if (level.world === 'mix') lastWorldWins += wins;
      console.log(`level ${String(level.id).padStart(2)} ${level.world.padEnd(9)} ${wins}/${TRIES}`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('');
  for (const [world, { wins, tries }] of byWorld) console.log(`${world.padEnd(9)} ${wins}/${tries}`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  process.exit(lastWorldWins === 0 && !problems.length ? 0 : 1);
}

await main();
