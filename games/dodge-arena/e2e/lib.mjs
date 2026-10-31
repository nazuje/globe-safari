// Shared by the real-play scripts: serves the built game, opens a touch browser and presses real fingers on it.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { launchOptions } from '../../../scripts/playtest.mjs';

export const GAME = fileURLToPath(new URL('..', import.meta.url));
const ROOT = join(GAME, '..', '..');
export const PORT = Number(process.env.PORT ?? 5353);
export const URL_BASE = `http://localhost:${PORT}/`;
const PROGRESS_KEY = 'playroom:dodge-arena:progress';

/** Starts `vite preview` of the normal build. Run `npx vite build` in the game's folder first. */
export async function startServer() {
  if (!existsSync(join(GAME, 'dist', 'index.html'))) throw new Error('dist is missing: run `npx vite build` in games/dodge-arena');
  const vite = join(ROOT, 'node_modules', '.bin', 'vite');
  const server = spawn(vite, ['preview', '--port', String(PORT), '--strictPort'], { cwd: GAME, stdio: 'ignore' });
  for (let tries = 0; tries < 100; tries += 1) {
    if (await fetch(URL_BASE).then(() => true, () => false)) return server;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  server.kill();
  throw new Error('the preview server did not start');
}

export const launch = () => chromium.launch(launchOptions);

/** A page on a touch device. Pass `stages` to open that many stages, as a player who got that far would have. */
export async function openPage(browser, { width = 390, height = 844, language = 'en', stages = 0, reduced = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const keys = { language, progress: stages ? { best: 0, stars: Array.from({ length: 12 }, (_, at) => (at < stages ? 1 : 0)), fails: [], skipped: [] } : null };
  await context.addInitScript(({ language: chosen, progress, key }) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('playroom:language', JSON.stringify(chosen));
    if (progress) localStorage.setItem(key, JSON.stringify(progress));
  }, { ...keys, key: PROGRESS_KEY });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`crash: ${error.message}`));
  page.on('request', (request) => {
    const { hostname, protocol } = new URL(request.url());
    if (protocol.startsWith('http') && hostname !== 'localhost' && !hostname.endsWith('googleapis.com') && !hostname.endsWith('gstatic.com')) problems.push(`outside request: ${request.url()}`);
  });
  await page.goto(URL_BASE);
  await page.waitForSelector('[data-mode=endless], .no-3d');
  return { page, context, problems, fingers: await createFingers(page, context) };
}

/** Real multi-touch through the browser's own input system. The game sees ordinary pointer events. */
async function createFingers(page, context) {
  const session = await context.newCDPSession(page);
  const held = new Map();
  let moving = false;
  const points = () => [...held].map(([id, point]) => ({ id, ...point, radiusX: 8, radiusY: 8, force: 1 }));
  const send = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
  return {
    async down(id, x, y) {
      held.set(id, { x, y });
      await send('touchStart', points());
    },
    /** Doesn't wait for the page to finish with it, or a bot would act a frame behind. */
    move(id, x, y) {
      held.set(id, { x, y });
      if (moving) return;
      moving = true;
      void send('touchMove', points()).catch(() => undefined).finally(() => {
        moving = false;
      });
    },
    /** Chrome reads touchEnd's list as the fingers that lifted, so the others stay down. */
    async up(id) {
      const lifted = points().filter((point) => point.id === id);
      held.delete(id);
      await send('touchEnd', lifted);
    },
    async tap(id, x, y) {
      await this.down(id, x, y);
      await this.up(id);
    },
    isDown: (id) => held.has(id),
  };
}

export async function tapElement(page, fingers, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: 'visible' });
  await page.waitForFunction((css) => !document.querySelector(css)?.disabled, selector);
  const box = await target.boundingBox();
  await fingers.tap(9, box.x + box.width / 2, box.y + box.height / 2);
}

/** Everything the bots may know, read straight from the #readout data attributes. */
export function readSight(page) {
  return page.evaluate(() => {
    const { dataset } = document.getElementById('readout');
    return { ...dataset, fingerBox: document.querySelector('.leap-btn')?.getBoundingClientRect().toJSON() ?? null, width: innerWidth, height: innerHeight };
  });
}

/** Turns a floor position into a screen position with the published camera. */
export function toScreen(camera, x, z, width, height) {
  const m = camera.split(',').map(Number);
  const w = m[3] * x + m[11] * z + m[15];
  return { x: (((m[0] * x + m[8] * z + m[12]) / w + 1) / 2) * width, y: ((1 - (m[1] * x + m[9] * z + m[13]) / w) / 2) * height };
}
