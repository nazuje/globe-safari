// A skilled player. It reads each level from the data, works out the answer with the solver, then plays the
// built game from a fresh save with real touches on the real mirrors. Run `npx vite build` first.
import { boardFor, LEVELS } from '../src/rules/levels.ts';
import { startPlay, tapPiece } from '../src/rules/play.ts';
import { solve, Space } from '../src/rules/solver.ts';
import { touch, launch, openLevel, openPage, screenIs, serve } from './lib.mjs';

const TAP_WAIT_MS = 30;

/** The shortest taps that light the hidden target, then the shortest win from there. */
function secretRoute(level) {
  const board = boardFor(level);
  const space = new Space(board);
  const start = space.startState();
  const cameFrom = new Map([[start, null]]);
  let layer = [start];
  while (layer.length) {
    const nextLayer = [];
    for (const state of layer) {
      for (let piece = 0; piece < board.pieces.length; piece += 1) {
        const after = space.next(state, piece);
        if (cameFrom.has(after) || space.won(after)) continue;
        cameFrom.set(after, { state, piece });
        if (space.secret(after)) {
          const taps = [];
          for (let step = cameFrom.get(after); step; step = cameFrom.get(step.state)) taps.unshift(step.piece);
          let play = startPlay(board, level);
          for (const tap of taps) play = tapPiece(play, tap);
          const rest = solve(board, play.frame, level.limit - taps.length);
          if (rest) return [...taps, ...rest.taps];
        }
        nextLayer.push(after);
      }
    }
    layer = nextLayer;
  }
  throw new Error(`Level ${level.id}: no route to the hidden target`);
}

async function tapPieces(page, taps, expected) {
  let play = expected;
  for (const tap of taps) {
    await touch(page, `.piece-hit[data-piece="${tap}"]`);
    await page.waitForTimeout(TAP_WAIT_MS);
    play = tapPiece(play, tap);
    const real = await page.evaluate(() => ({ moves: Number(document.body.dataset.moves), turns: document.body.dataset.turns }));
    if (real.moves !== play.moves || real.turns !== play.frame.turns.join(',')) {
      throw new Error(`The game and the rules disagree: real ${JSON.stringify(real)}, rules ${play.moves} ${play.frame.turns}`);
    }
  }
}

async function playLevel(page, level) {
  const board = boardFor(level);
  const taps = level.unlocks ? secretRoute(level) : solve(board).taps;
  await tapPieces(page, taps, startPlay(board, level));
  await screenIs(page, 'won');
  return page.evaluate(() => ({ moves: Number(document.body.dataset.moves), stars: Number(document.body.dataset.stars) }));
}

async function main() {
  const server = await serve();
  const browser = await launch();
  const { page, problems } = await openPage(browser);
  const rows = [];
  try {
    for (const level of LEVELS) {
      const tile = page.locator(`[data-level="${level.id}"]`);
      const onMap = (await page.evaluate(() => document.body.dataset.screen)) === 'map';
      if (!onMap) {
        await page.waitForSelector('.card-btn.armed');
        await touch(page, '.card-btn[aria-label]:last-child');
        await screenIs(page, 'map');
      }
      await page.waitForFunction(() => document.querySelector('.map'));
      if (!(await tile.count())) throw new Error(`Level ${level.id} is not on the map, so its hidden target was not found`);
      if ((await tile.getAttribute('data-open')) !== 'true') throw new Error(`Level ${level.id} did not open`);
      await openLevel(page, level.id);
      const started = Date.now();
      const { moves, stars } = await playLevel(page, level);
      rows.push({ id: level.id, world: level.world, par: level.par, limit: level.limit, moves, stars, ms: Date.now() - started });
      console.log(`level ${String(level.id).padStart(2)} ${level.world.padEnd(9)} won in ${String(moves).padStart(2)} (par ${level.par}, limit ${level.limit}) ${'★'.repeat(stars)}`);
    }
  } finally {
    await browser.close();
    server.kill();
  }
  const wins = rows.length;
  console.log(`\nskilled bot: won ${wins} of ${LEVELS.length} levels, bonus levels included`);
  console.log(`problems: ${problems.length ? problems.join('\n') : 'none'}`);
  process.exit(wins === LEVELS.length && !problems.length ? 0 : 1);
}

await main();
