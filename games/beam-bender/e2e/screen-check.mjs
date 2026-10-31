// Plays the built game on every screen size in both languages, mashes every screen, and saves screenshots to
// .shots/ to look at. Run `npx vite build` first.
import { boardFor, levelById, LEVELS } from '../src/rules/levels.ts';
import { solve } from '../src/rules/solver.ts';
import { allOpen, launch, openLevel, openPage, screenIs, serve, SHOTS, touch } from './lib.mjs';

const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 800 },
];
const SMALLEST = { name: 'smallest', width: 360, height: 640 };
const MASH_TAPS = 50;
const MIN_TAP_PX = 64;
const MIN_BUTTON_PX = 48;
const HARDEST = 30;
const COUNT_DRAWS = () => {
  let calls = 0;
  let worst = 0;
  const wrap = (name) => {
    const real = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function counted(...args) {
      calls += 1;
      return real.apply(this, args);
    };
  };
  ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(wrap);
  const tally = () => {
    worst = Math.max(worst, calls);
    window.__draws = worst;
    calls = 0;
    requestAnimationFrame(tally);
  };
  requestAnimationFrame(tally);
};

const failures = [];
const expect = (ok, what) => {
  if (!ok) failures.push(what);
};

function mashPoints({ width, height }, top) {
  return Array.from({ length: MASH_TAPS }, (_, tap) => ({
    x: 16 + ((tap * 83) % (width - 32)),
    y: top + ((tap * 137) % (height - top - 12)),
  }));
}

async function mash(page, size, label) {
  const url = page.url();
  for (const { x, y } of mashPoints(size, size.height < 500 ? 8 : 80)) {
    // In landscape the home button is on the left edge, so the left strip stays out of it.
    await page.touchscreen.tap(size.height < 500 ? Math.max(x, 100) : x, y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(300);
  expect(page.url().startsWith(url), `${label}: mashing left the game`);
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sideways <= 0, `${label}: scrolls sideways by ${sideways}px`);
  return page.evaluate(() => document.body.dataset.screen);
}

async function checkTargets(page, label) {
  const report = await page.evaluate(({ least }) => {
    const box = (item) => item.getBoundingClientRect();
    const small = [...document.querySelectorAll('.piece-hit')].map(box).filter(({ width, height }) => width < least || height < least);
    const shown = [...document.querySelectorAll('a, button')].filter((item) => box(item).width > 0);
    const tiny = shown.map(box).filter(({ width, height }) => Math.min(width, height) < 48);
    const off = [...document.querySelectorAll('.piece-hit')].map(box).filter(({ left, top, right, bottom }) => left < -6 || top < 0 || right > innerWidth + 6 || bottom > innerHeight);
    const safe = document.getElementById('safe').getBoundingClientRect();
    const dock = [...document.querySelectorAll('.dock-btn')].map(box);
    const clash = dock.filter(({ left, top, right, bottom }) => left < safe.right && right > safe.left && top < safe.bottom && bottom > safe.top);
    return { small: small.length, tiny: tiny.length, off: off.length, clash: clash.length };
  }, { least: MIN_TAP_PX });
  expect(report.small === 0, `${label}: ${report.small} mirror targets under ${MIN_TAP_PX}px`);
  expect(report.tiny === 0, `${label}: ${report.tiny} buttons under ${MIN_BUTTON_PX}px`);
  expect(report.off === 0, `${label}: ${report.off} mirrors off screen`);
  expect(report.clash === 0, `${label}: dock overlaps the board`);
}

async function loseLevel(page, id) {
  await openLevel(page, id);
  const limit = levelById(id).limit;
  for (let tap = 0; tap < limit; tap += 1) {
    // Tapping the same piece back and forth goes nowhere until the moves run out.
    if ((await page.evaluate(() => document.body.dataset.status)) !== 'playing') break;
    await touch(page, '.piece-hit[data-piece="0"]');
    await page.waitForTimeout(25);
  }
}

async function winLevel(page, id) {
  await openLevel(page, id);
  for (const tap of solve(boardFor(levelById(id))).taps) {
    await touch(page, `.piece-hit[data-piece="${tap}"]`);
    await page.waitForTimeout(25);
  }
}

async function oneScreen(browser, size, language) {
  const label = `${size.name} ${language}`;
  const shot = (step) => `${SHOTS}/${size.name}-${language}-${step}.png`;
  const { page, context, problems } = await openPage(browser, { ...size, language, progress: allOpen(LEVELS) });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('map') });
  await mash(page, size, `${label} map`);
  if ((await page.evaluate(() => document.body.dataset.screen)) !== 'map') await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');

  await openLevel(page, HARDEST);
  await page.waitForTimeout(300);
  await checkTargets(page, label);
  await page.screenshot({ path: shot('play') });
  await mash(page, size, `${label} play`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('after-mash') });

  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  await loseLevel(page, 16);
  await screenIs(page, 'lost');
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot('lost') });
  const afterLost = await mash(page, size, `${label} lost`);
  expect(['lost', 'play'].includes(afterLost), `${label}: mashing the fizzle went to ${afterLost}`);

  await touch(page, '[data-action="levels"]');
  await screenIs(page, 'map');
  await winLevel(page, 12);
  await screenIs(page, 'won');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('won') });
  await mash(page, size, `${label} won`);
  expect(problems.length === 0, `${label}: ${problems.join('; ')}`);
  await context.close();
}

async function checkSmallestPhone(browser) {
  const { page, context, problems } = await openPage(browser, { ...SMALLEST, progress: allOpen(LEVELS) });
  for (const id of [HARDEST, 18, 33, 1]) {
    await openLevel(page, id);
    await page.waitForTimeout(150);
    await checkTargets(page, `360 level ${id}`);
    await page.screenshot({ path: `${SHOTS}/smallest-${id}.png` });
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
  expect(problems.length === 0, `360: ${problems.join('; ')}`);
  await context.close();
}

async function checkLanguageSwitch(browser) {
  const { page, context, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  await openLevel(page, HARDEST);
  await touch(page, '.piece-hit[data-piece="1"]');
  await touch(page, '.piece-hit[data-piece="0"]');
  const before = await page.evaluate(() => [document.body.dataset.moves, document.body.dataset.turns].join('|'));
  await touch(page, '.language-btn');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => [document.body.dataset.moves, document.body.dataset.turns, document.documentElement.lang, document.title].join('|'));
  expect(after.startsWith(before), 'language switch: the board changed');
  expect(after.includes('|sl|Zrcalni'), `language switch: page did not change language (${after})`);
  await page.screenshot({ path: `${SHOTS}/language-switch.png` });
  expect(problems.length === 0, `language: ${problems.join('; ')}`);
  await context.close();
}

async function checkKeyboard(browser) {
  const { page, context, problems } = await openPage(browser, { width: 1280, height: 800, progress: allOpen(LEVELS) });
  await page.locator('[data-level="4"]').focus();
  await page.keyboard.press('Enter');
  await screenIs(page, 'play');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const moves = () => page.evaluate(() => Number(document.body.dataset.moves));
  expect((await moves()) === 1, 'keyboard: Enter did not turn a mirror');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  expect((await moves()) === 2, 'keyboard: Space did not turn a mirror');
  await page.keyboard.press('u');
  expect((await moves()) === 3, 'keyboard: U did not undo');
  await page.keyboard.press('h');
  await page.waitForFunction(() => document.body.dataset.hints === '1');
  await page.screenshot({ path: `${SHOTS}/keyboard-hint.png` });
  await page.keyboard.press('r');
  expect((await moves()) === 0, 'keyboard: R did not retry');
  await page.keyboard.press('Escape');
  await screenIs(page, 'map');
  expect(problems.length === 0, `keyboard: ${problems.join('; ')}`);
  await context.close();
}

/** The rules a parent would ask about, checked in the real game from a fresh save. */
async function checkRules(browser) {
  const { page, context, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  await openLevel(page, 16);
  const taps = solve(boardFor(levelById(16))).taps;
  for (let press = 0; press < 5; press += 1) {
    await touch(page, '[data-action="hint"]');
    await page.waitForTimeout(120);
  }
  expect((await page.evaluate(() => document.body.dataset.hints)) === '3', 'hints: more than 3 on a level');
  expect((await page.locator('.piece-hit.hinted').count()) === 1, 'hints: no mirror is marked');
  for (const tap of taps) await touch(page, `.piece-hit[data-piece="${tap}"]`);
  await screenIs(page, 'won');
  expect((await page.evaluate(() => document.body.dataset.stars)) === '1', 'hints: a hinted win earned more than 1 star');
  await context.close();

  const fresh = await openPage(browser, { progress: { stars: { 1: 3, 2: 3, 3: 3 }, skipped: [], found: [] } });
  await openLevel(fresh.page, 4);
  for (let loss = 1; loss <= 5; loss += 1) {
    for (let tap = 0; tap < levelById(4).limit; tap += 1) {
      await touch(fresh.page, '.piece-hit[data-piece="0"]');
      await fresh.page.waitForTimeout(20);
      if ((await fresh.page.evaluate(() => document.body.dataset.status)) !== 'playing') break;
    }
    await screenIs(fresh.page, 'lost');
    await fresh.page.waitForSelector('.card-btn.armed');
    const skip = await fresh.page.locator('[data-action="skip"]').count();
    expect(skip === (loss >= 5 ? 1 : 0), `skip: wrong after ${loss} losses (${skip})`);
    if (loss < 5) {
      await touch(fresh.page, '[data-action="try-again"]');
      await fresh.page.waitForFunction(() => document.body.dataset.moves === '0' && document.body.dataset.screen === 'play');
    }
  }
  await touch(fresh.page, '[data-action="skip"]');
  await fresh.page.waitForFunction(() => document.body.dataset.level === '5');
  expect(problems.length + fresh.problems.length === 0, `rules: ${[...problems, ...fresh.problems].join('; ')}`);
  await fresh.context.close();
}

/** Saves the tap nearest the laser for last, which is what earns the party. */
async function throwDisco(page) {
  await openLevel(page, 31);
  for (const tap of [1, 2, 3, 4, 4, 0]) {
    await touch(page, `.piece-hit[data-piece="${tap}"]`);
    await page.waitForTimeout(25);
  }
  await page.waitForFunction(() => document.body.dataset.disco === 'yes');
  await page.waitForTimeout(900);
}

async function checkDisco(browser) {
  const { page, context, problems } = await openPage(browser, { progress: allOpen(LEVELS) });
  await throwDisco(page);
  await page.screenshot({ path: `${SHOTS}/disco.png` });
  await screenIs(page, 'won');
  expect(problems.length === 0, `disco: ${problems.join('; ')}`);
  await context.close();
}

async function checkReducedMotion(browser) {
  const { page, context, problems } = await openPage(browser, { motion: 'reduce', progress: allOpen(LEVELS) });
  await throwDisco(page);
  await page.screenshot({ path: `${SHOTS}/calm-disco.png` });
  await screenIs(page, 'won');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/calm-won.png` });
  expect(problems.length === 0, `reduced motion: ${problems.join('; ')}`);
  await context.close();
}

/** Quick pictures of levels with something special on them. */
async function pictures(browser) {
  const { page, context } = await openPage(browser, { progress: allOpen(LEVELS) });
  for (const id of [13, 16, 22, 32, 33]) {
    await openLevel(page, id);
    await page.waitForTimeout(250);
    for (const tap of solve(boardFor(levelById(id))).taps.slice(0, -1)) await touch(page, `.piece-hit[data-piece="${tap}"]`);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${SHOTS}/level-${id}.png` });
    await touch(page, '[data-action="levels"]');
    await screenIs(page, 'map');
  }
  await context.close();
}

async function countDraws(browser) {
  const { page, context } = await openPage(browser, { progress: allOpen(LEVELS) });
  await page.addInitScript(COUNT_DRAWS);
  await page.reload();
  await page.waitForSelector('body[data-screen="map"]');
  await openLevel(page, HARDEST);
  await page.waitForTimeout(800);
  const draws = await page.evaluate(() => window.__draws);
  await context.close();
  return draws;
}

async function main() {
  const server = await serve();
  const browser = await launch();
  let draws = 0;
  try {
    for (const size of SIZES) {
      for (const language of ['en', 'sl']) {
        await oneScreen(browser, size, language);
        console.log(`done ${size.name} ${language}`);
      }
    }
    await checkSmallestPhone(browser);
    await checkLanguageSwitch(browser);
    await checkKeyboard(browser);
    await checkRules(browser);
    await checkDisco(browser);
    await checkReducedMotion(browser);
    await pictures(browser);
    draws = await countDraws(browser);
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`draw calls on the hardest level: ${draws}`);
  console.log(failures.length ? failures.join('\n') : 'all screens passed');
  process.exit(failures.length ? 1 : 0);
}

await main();
