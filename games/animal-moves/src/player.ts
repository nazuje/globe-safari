import type { Move } from './moves.ts';
import type { Script, Step } from './script.ts';

const REST_LINE = 'Take a rest!';
/** Taps this soon after the screen changes are mashing, not meaning. */
const SETTLE_MS = 500;
const REPEAT_GAP_MS = 800;

export interface PlayerIO {
  /** Speaks a line and resolves when it ends. Aborting stops the voice. It never rejects. */
  say(text: string, signal: AbortSignal): Promise<void>;
  beatOn(): void;
  beatOff(): void;
  render(step: Step): void;
  finished(moves: Move[]): void;
}

export interface Player {
  start(): void;
  pause(options?: { quiet?: boolean }): void;
  resume(): void;
  /** Says the current instruction again, holding the beat and the clock while it speaks. */
  repeat(): void;
  choose(moveId: string): void;
  stop(): void;
  isPaused(): boolean;
  /** How far through the current beat step we are, from 0 to 1. */
  progress(): number;
}

/** Plays a script one step at a time. It knows nothing about the screen or sound hardware. */
export function createPlayer(script: Script, io: PlayerIO, now: () => number = Date.now): Player {
  let state: 'ready' | 'running' | 'paused' | 'over' = 'ready';
  let step: Step | null = null;
  let duration = 0;
  let remaining = 0;
  let clockStartedAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: AbortController | null = null;
  let beating = false;
  let repeating = false;
  let settledAt = 0;
  let lastRepeat = Number.NEGATIVE_INFINITY;

  const settling = () => now() < settledAt;
  const settle = () => {
    settledAt = now() + SETTLE_MS;
  };

  function freshSignal(): AbortSignal {
    active?.abort();
    active = new AbortController();
    return active.signal;
  }

  function stopBeat(): void {
    if (beating) io.beatOff();
    beating = false;
  }

  /** Stops whatever is happening, keeping the time left on the clock. */
  function halt(): void {
    active?.abort();
    active = null;
    clearTimeout(timer);
    if (clockStartedAt !== null) remaining = Math.max(0, remaining - (now() - clockStartedAt));
    clockStartedAt = null;
    repeating = false;
    stopBeat();
  }

  function advance(choice?: string): void {
    const next = script.next(choice);
    if (next.done) {
      step = null;
      state = 'over';
      io.finished(next.value);
      return;
    }
    step = next.value;
    duration = remaining = step.kind === 'wait' || step.kind === 'beat' ? step.ms : 0;
    if (step.kind === 'pick') settle();
    io.render(step);
    play(step);
  }

  function runClock(): void {
    clockStartedAt = now();
    timer = setTimeout(() => {
      clockStartedAt = null;
      stopBeat();
      advance();
    }, remaining);
  }

  function play(current: Step): void {
    const signal = freshSignal();
    if (current.kind === 'say') {
      void io.say(current.text, signal).then(() => {
        if (!signal.aborted) advance();
      });
    } else if (current.kind === 'pick') {
      void io.say(current.text, signal);
    } else {
      if (current.kind === 'beat') {
        io.beatOn();
        beating = true;
      }
      runClock();
    }
  }

  return {
    start() {
      if (state !== 'ready') return;
      state = 'running';
      settle();
      advance();
    },

    pause({ quiet = false } = {}) {
      if (state !== 'running' || (!quiet && settling())) return;
      state = 'paused';
      settle();
      halt();
      if (!quiet) void io.say(REST_LINE, freshSignal());
    },

    resume() {
      if (state !== 'paused' || !step || settling()) return;
      state = 'running';
      settle();
      play(step);
    },

    repeat() {
      if (state !== 'running' || !step || step.kind === 'say' || repeating) return;
      if (now() - lastRepeat < REPEAT_GAP_MS) return;
      lastRepeat = now();
      if (step.kind === 'pick') {
        play(step);
        return;
      }
      const current = step;
      halt();
      repeating = true;
      const signal = freshSignal();
      void io.say(current.scene.line, signal).then(() => {
        if (signal.aborted) return;
        repeating = false;
        play(current);
      });
    },

    choose(moveId) {
      if (state !== 'running' || step?.kind !== 'pick' || settling()) return;
      if (!step.options.some((move) => move.id === moveId)) return;
      halt();
      advance(moveId);
    },

    stop() {
      if (state === 'over') return;
      state = 'over';
      halt();
      script.return([]);
    },

    isPaused: () => state === 'paused',

    progress() {
      if (step?.kind !== 'beat' || duration === 0) return 0;
      const running = clockStartedAt === null ? 0 : now() - clockStartedAt;
      return Math.min(1, 1 - (remaining - running) / duration);
    },
  };
}
