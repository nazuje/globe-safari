import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Move } from './moves.ts';
import { MOVES } from './moves.ts';
import { createPlayer, type Player, type PlayerIO } from './player.ts';
import { gameScript, MOVE_MS, type Script, type Step } from './script.ts';

const SPEECH_MS = 1000;

/** Records everything that happens, and checks the one rule that matters as it goes. */
function harness(script: Script) {
  const log: string[] = [];
  let speaking = 0;
  let beating = false;
  let finished: Move[] | null = null;
  let current: Step | null = null;

  const io: PlayerIO = {
    say(text, signal) {
      if (beating) throw new Error(`"${text}" spoken over the beat`);
      log.push(`say:${text}`);
      speaking += 1;
      return new Promise((resolve) => {
        const end = () => {
          speaking -= 1;
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(end, SPEECH_MS);
        signal.addEventListener('abort', end, { once: true });
      });
    },
    beatOn() {
      if (speaking > 0) throw new Error('beat started over speech');
      beating = true;
      log.push('beat:on');
    },
    beatOff() {
      beating = false;
      log.push('beat:off');
    },
    render(step) {
      current = step;
    },
    finished(moves) {
      finished = moves;
    },
  };

  return {
    player: createPlayer(script, io) as Player,
    log,
    step: () => current as Step | null,
    finished: () => finished as Move[] | null,
    isBeating: () => beating,
  };
}

async function tick(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/** Runs to the first beat of a Follow me game: six spoken lines. */
const toBeat = () => tick(SPEECH_MS * 6);
const SETTLED = 600;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const follow = (count = 3) => gameScript('follow', MOVES, count, () => 0.5);

describe('playing through', () => {
  it('finishes a whole game by itself, with no taps', async () => {
    const game = harness(follow());
    game.player.start();
    await tick(120_000);
    expect(game.finished()).toHaveLength(3);
    expect(game.isBeating()).toBe(false);
  });

  it('waits for each line to end before the next thing starts', async () => {
    const game = harness(follow());
    game.player.start();
    await tick(SPEECH_MS - 1);
    expect(game.log).toHaveLength(1);
    await tick(1);
    expect(game.log).toHaveLength(2);
  });

  it('stops the beat before "Freeze!" is said', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    await tick(MOVE_MS);
    expect(game.log.slice(-2)).toEqual(['beat:off', 'say:Freeze!']);
  });

  it('reports progress through the beat', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    expect(game.player.progress()).toBe(0);
    await tick(MOVE_MS / 2);
    expect(game.player.progress()).toBeCloseTo(0.5);
  });
});

describe('pausing', () => {
  it('stops the beat and the clock, and carries on with the time left', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    await tick(4000);
    game.player.pause();
    expect(game.isBeating()).toBe(false);
    expect(game.player.isPaused()).toBe(true);
    await tick(60_000);
    expect(game.step()?.kind).toBe('beat');
    expect(game.player.progress()).toBeCloseTo(0.4);

    game.player.resume();
    expect(game.isBeating()).toBe(true);
    await tick(MOVE_MS - 4000 - 1);
    expect(game.step()?.kind).toBe('beat');
    await tick(1);
    expect(game.step()?.scene.view).toBe('freeze');
  });

  it('lets go of a half-said line and says it again on resume', async () => {
    const game = harness(follow());
    game.player.start();
    await tick(SETTLED);
    game.player.pause({ quiet: true });
    const before = game.log.length;
    await tick(10_000);
    expect(game.log).toHaveLength(before);
    await tick(SETTLED);
    game.player.resume();
    expect(game.log.at(-1)).toBe(game.log[0]);
    await tick(SPEECH_MS);
    expect(game.log.at(-1)).toBe('say:Ready?');
  });

  it('says a resting line out loud, but never when the page was hidden', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    game.player.pause();
    expect(game.log.at(-1)).toBe('say:Take a rest!');
    await tick(SETTLED);
    game.player.resume();
    await tick(SETTLED);
    game.player.pause({ quiet: true });
    expect(game.log.at(-1)).toBe('beat:off');
  });

  it('ignores a mashed pause right after Go, and a mashed resume right after pause', async () => {
    const game = harness(follow());
    game.player.start();
    game.player.pause();
    expect(game.player.isPaused()).toBe(false);
    await tick(SETTLED);
    game.player.pause();
    expect(game.player.isPaused()).toBe(true);
    game.player.resume();
    expect(game.player.isPaused()).toBe(true);
    await tick(SETTLED);
    game.player.resume();
    expect(game.player.isPaused()).toBe(false);
  });

  it('never plays on after stop', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    game.player.stop();
    expect(game.isBeating()).toBe(false);
    const before = game.log.length;
    await tick(120_000);
    expect(game.log).toHaveLength(before);
    expect(game.finished()).toBeNull();
  });
});

describe('🔊 say it again', () => {
  it('holds the beat and the clock while it speaks, then carries on', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    await tick(3000);
    game.player.repeat();
    expect(game.isBeating()).toBe(false);
    expect(game.log.at(-1)).toBe(`say:${game.step()?.scene.line}`);
    await tick(SPEECH_MS);
    expect(game.isBeating()).toBe(true);
    expect(game.player.progress()).toBeCloseTo(0.3);
    await tick(MOVE_MS - 3000);
    expect(game.step()?.scene.view).toBe('freeze');
  });

  it('does nothing while a line is already being said', async () => {
    const game = harness(follow());
    game.player.start();
    const before = game.log.length;
    game.player.repeat();
    expect(game.log).toHaveLength(before);
  });

  it('survives being mashed', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    for (let i = 0; i < 20; i++) {
      game.player.repeat();
      await tick(100);
    }
    await tick(60_000);
    expect(game.step()?.scene.move).toBeDefined();
    expect(game.log.filter((entry) => entry === 'beat:off').length).toBeGreaterThan(0);
  });

  it('can be paused halfway, and comes back to the beat', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    await tick(SETTLED);
    game.player.repeat();
    game.player.pause({ quiet: true });
    await tick(5000);
    expect(game.isBeating()).toBe(false);
    game.player.resume();
    expect(game.isBeating()).toBe(true);
  });
});

describe('switching language', () => {
  it('starts a cut line again instead of skipping it', async () => {
    const game = harness(follow());
    game.player.start();
    await tick(SPEECH_MS / 2);
    const line = game.log.at(-1);
    game.player.sayAgainInNewLanguage();
    await tick(0);
    expect(game.log.slice(-2)).toEqual([line, line]);
    await tick(SPEECH_MS / 2);
    expect(game.log).toHaveLength(2);
    await tick(SPEECH_MS);
    expect(game.log).toHaveLength(3);
  });

  it('leaves the beat and the clock alone', async () => {
    const game = harness(follow());
    game.player.start();
    await toBeat();
    await tick(1000);
    game.player.sayAgainInNewLanguage();
    expect(game.isBeating()).toBe(true);
    await tick(MOVE_MS - 1000);
    expect(game.step()?.scene.view).toBe('freeze');
  });

  it('stays quiet while paused', async () => {
    const game = harness(follow());
    game.player.start();
    await tick(SETTLED);
    game.player.pause({ quiet: true });
    const said = game.log.length;
    game.player.sayAgainInNewLanguage();
    expect(game.log).toHaveLength(said);
  });
});

describe('You pick', () => {
  const pickGame = () => harness(gameScript('pick', MOVES, 3, () => 0.5));

  function options(game: ReturnType<typeof pickGame>): Move[] {
    const step = game.step();
    if (step?.kind !== 'pick') throw new Error('expected a pick step');
    return step.options;
  }

  it('waits as long as it takes', async () => {
    const game = pickGame();
    game.player.start();
    await tick(600_000);
    expect(game.step()?.kind).toBe('pick');
  });

  it('plays the chosen animal, and a tap can cut the question short', async () => {
    const game = pickGame();
    game.player.start();
    await tick(SETTLED);
    const chosen = options(game)[1];
    game.player.choose(chosen.id);
    expect(game.step()?.scene.move?.id).toBe(chosen.id);
  });

  it('ignores a mashing tap the moment the choices appear', async () => {
    const game = pickGame();
    game.player.start();
    game.player.choose(options(game)[0].id);
    expect(game.step()?.kind).toBe('pick');
  });

  it('ignores animals that are not on offer', async () => {
    const game = pickGame();
    game.player.start();
    await tick(SETTLED);
    const others = MOVES.filter((move) => !options(game).includes(move));
    game.player.choose(others[0].id);
    expect(game.step()?.kind).toBe('pick');
  });

  it('asks again on 🔊 without moving on', async () => {
    const game = pickGame();
    game.player.start();
    await tick(SPEECH_MS);
    game.player.repeat();
    expect(game.log.filter((entry) => entry === 'say:Pick an animal!')).toHaveLength(2);
    await tick(SPEECH_MS * 3);
    expect(game.step()?.kind).toBe('pick');
  });
});
