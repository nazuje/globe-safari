// The checks a person would do by hand: every screen size and language, 50-tap mashing on every screen,
// a language switch mid-game, the keyboard, reduced motion, console errors and outside requests.
//   npx vite build && node e2e/check.mjs [folder for screenshots]
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, openPage, readSight, startServer, tapElement } from './lib.mjs';

const OUT = process.argv[2] ?? join(tmpdir(), 'dodge-arena-shots');
const SCREENS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'laptop', width: 1280, height: 800 },
];
const LANGUAGES = ['en', 'sl'];
const MASH_TAPS = 50;
const MIN_TARGET_PX = 48;

const problems = [];
const note = (where, problem) => {
  problems.push(`${where}: ${problem}`);
  console.log(`  ✗ ${where}: ${problem}`);
};

async function fits(page, where) {
  const report = await page.evaluate((least) => {
    const sideways = document.documentElement.scrollWidth > innerWidth;
    const small = [...document.querySelectorAll('a, button')]
      .filter((item) => !item.hidden && item.getClientRects().length)
      .map((item) => ({ name: item.getAttribute('aria-label') || item.textContent.trim(), box: item.getBoundingClientRect() }))
      .filter(({ box }) => box.width < least || box.height < least)
      .map(({ name, box }) => `${name} ${Math.round(box.width)}x${Math.round(box.height)}`);
    const off = [...document.querySelectorAll('.overlay button, .leap-btn, .topbar > *')]
      .filter((item) => !item.hidden && item.getClientRects().length)
      .filter((item) => {
        const box = item.getBoundingClientRect();
        return box.left < 0 || box.top < 0 || box.right > innerWidth || box.bottom > innerHeight;
      })
      .map((item) => item.getAttribute('aria-label') || item.textContent.trim());
    const fontTooSmall = [...document.querySelectorAll('.overlay *, .hud *')]
      .filter((item) => item.children.length === 0 && item.textContent.trim() && parseFloat(getComputedStyle(item).fontSize) < 16)
      .map((item) => item.textContent.trim().slice(0, 16));
    return { sideways, small, off, fontTooSmall };
  }, MIN_TARGET_PX);
  if (report.sideways) note(where, 'scrolls sideways');
  if (report.small.length) note(where, `small targets: ${report.small.join(', ')}`);
  if (report.off.length) note(where, `off screen: ${report.off.join(', ')}`);
  if (report.fontTooSmall.length) note(where, `small text: ${report.fontTooSmall.join(', ')}`);
}

async function mash(page, fingers, width, height) {
  for (let tap = 0; tap < MASH_TAPS; tap += 1) {
    const x = 12 + ((tap * 83) % (width - 24));
    const y = 80 + ((tap * 137) % (height - 90));
    await fingers.tap(5, x, y).catch(() => undefined);
  }
}

const screenName = (page) => page.evaluate(() => document.body.dataset.screen);

async function everySize(browser) {
  for (const screen of SCREENS) {
    for (const language of LANGUAGES) {
      const where = `${screen.name} ${language}`;
      console.log(where);
      const { page, context, fingers, problems: seen } = await openPage(browser, { ...screen, language, stages: 11 });
      const shot = (step) => page.screenshot({ path: join(OUT, `${screen.name}-${language}-${step}.png`) });
      await page.waitForTimeout(700);
      await shot('home');
      await fits(page, `${where} home`);
      await tapElement(page, fingers, '[data-mode=challenge]');
      await page.waitForTimeout(300);
      await shot('stages');
      await fits(page, `${where} stages`);
      await tapElement(page, fingers, '[data-stage="12"]');
      await page.waitForTimeout(3200);
      await shot('play');
      await fits(page, `${where} play`);
      await page.waitForFunction(() => document.body.dataset.screen === 'result', null, { timeout: 40000 });
      await page.waitForTimeout(500);
      await shot('result');
      await fits(page, `${where} result`);
      for (const problem of seen) note(where, problem);
      await context.close();
    }
  }
}

async function mashEveryScreen(browser) {
  const where = 'mash';
  console.log(where);
  const { page, context, fingers, problems: seen } = await openPage(browser, { stages: 4 });
  const { width, height } = { width: 390, height: 844 };
  await mash(page, fingers, width, height);
  // A mash can land on a menu button and move on, which is fine, so long as the game is still whole.
  const after = await screenName(page);
  if (!['home', 'stages', 'play', 'result'].includes(after)) note(where, `lost on screen ${after}`);
  await page.reload();
  await page.waitForSelector('[data-mode=challenge]');
  await tapElement(page, fingers, '[data-mode=challenge]');
  await mash(page, fingers, width, height);
  await page.reload();
  await page.waitForSelector('[data-mode=endless]');
  await tapElement(page, fingers, '[data-mode=endless]');
  await mash(page, fingers, width, height);
  await page.waitForFunction(() => document.body.dataset.screen === 'result', null, { timeout: 40000 });
  const clockAtEnd = (await readSight(page)).clock;
  await mash(page, fingers, width, height);
  const retries = await readSight(page);
  console.log(`  after mashing the result screen: ${await screenName(page)} clock ${retries.clock} (ended at ${clockAtEnd})`);
  for (const problem of seen) note(where, problem);
  await context.close();
}

async function languageMidGame(browser) {
  const where = 'language mid-game';
  console.log(where);
  const { page, context, fingers, problems: seen } = await openPage(browser);
  await tapElement(page, fingers, '[data-mode=endless]');
  await page.waitForTimeout(1200);
  const before = Number((await readSight(page)).clock);
  await tapElement(page, fingers, '.language-btn');
  await page.waitForTimeout(600);
  const after = await readSight(page);
  if (Number(after.clock) <= before || after.phase !== 'play') note(where, `run did not carry on: ${before} then ${after.clock} ${after.phase}`);
  if ((await page.evaluate(() => document.documentElement.lang)) !== 'sl') note(where, 'language did not change');
  if ((await page.title()) !== 'Izmikaj se!') note(where, 'title did not change');
  for (const problem of seen) note(where, problem);
  await context.close();
}

async function keyboard(browser) {
  const where = 'keyboard';
  console.log(where);
  const { page, context, fingers, problems: seen } = await openPage(browser, { width: 1280, height: 800 });
  await tapElement(page, fingers, '[data-mode=endless]');
  await page.waitForTimeout(200);
  await page.keyboard.down('KeyD');
  // Waits on the game, not the clock, since software drawing can be slow when the machine is busy.
  await page.waitForFunction(() => Number(document.getElementById('readout').dataset.player?.split(',')[0]) > 1, null, { timeout: 4000 }).catch(() => undefined);
  await page.keyboard.up('KeyD');
  const moved = Number((await readSight(page)).player.split(',')[0]);
  if (moved < 1) note(where, `D did not move the player: x ${moved}`);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => Number(document.getElementById('readout').dataset.player?.split(',')[1]) < -1, null, { timeout: 4000 }).catch(() => undefined);
  await page.keyboard.up('ArrowUp');
  const up = Number((await readSight(page)).player.split(',')[1]);
  if (up > -1) note(where, `up arrow did not move the player: z ${up}`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  const height = Number((await readSight(page)).player.split(',')[2]);
  if (height <= 0) note(where, 'Space did not leap');
  for (const problem of seen) note(where, problem);
  await context.close();
}

async function reducedMotion(browser) {
  const where = 'reduced motion';
  console.log(where);
  const { page, context, fingers, problems: seen } = await openPage(browser, { reduced: true });
  await tapElement(page, fingers, '[data-mode=endless]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, 'reduced-play.png') });
  await page.waitForFunction(() => document.body.dataset.screen === 'result', null, { timeout: 40000 });
  for (const problem of seen) note(where, problem);
  await context.close();
}

async function retryIsQuick(browser) {
  const where = 'retry';
  console.log(where);
  const { page, context, fingers, problems: seen } = await openPage(browser);
  await tapElement(page, fingers, '[data-mode=endless]');
  await page.waitForFunction(() => document.body.dataset.screen === 'result', null, { timeout: 40000 });
  const started = Date.now();
  await tapElement(page, fingers, '[data-action=retry]');
  await page.waitForFunction(() => document.body.dataset.screen === 'play' && Number(document.getElementById('readout').dataset.clock) > 0 && document.getElementById('readout').dataset.phase === 'play');
  const took = Date.now() - started;
  console.log(`  dead to running again in ${took} ms`);
  if (took > 1000) note(where, `took ${took} ms`);
  for (const problem of seen) note(where, problem);
  await context.close();
}

mkdirSync(OUT, { recursive: true });
const server = await startServer();
const browser = await launch();
try {
  await keyboard(browser);
  await retryIsQuick(browser);
  await languageMidGame(browser);
  await mashEveryScreen(browser);
  await reducedMotion(browser);
  await everySize(browser);
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall clean');
process.exit(problems.length ? 1 : 0);
