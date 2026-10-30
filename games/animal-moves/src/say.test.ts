import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { estimateMs, retryVoice, say } from './say.ts';

class FakeUtterance {
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function fakeEngine(behave: (utterance: FakeUtterance) => void) {
  const engine = { speaking: false, pending: false, getVoices: () => [], cancel: vi.fn(), speak: vi.fn(behave) };
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', engine);
  return engine;
}

async function endsWithin(ms: number, line: Promise<void>): Promise<boolean> {
  let ended = false;
  void line.then(() => {
    ended = true;
  });
  await vi.advanceTimersByTimeAsync(ms);
  return ended;
}

const quiet = () => new AbortController().signal;

beforeEach(() => {
  vi.useFakeTimers();
  retryVoice();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('say', () => {
  it('ends when the voice ends, not before', async () => {
    let finish = () => {};
    fakeEngine((utterance) => {
      utterance.onstart?.();
      finish = () => utterance.onend?.();
    });
    const line = say('Hop like a frog!', quiet());
    expect(await endsWithin(1000, line)).toBe(false);
    finish();
    expect(await endsWithin(0, line)).toBe(true);
  });

  it('never leaves the game stuck when a voice never starts, then stops trying', async () => {
    const engine = fakeEngine(() => {});
    expect(await endsWithin(3000, say('One', quiet()))).toBe(true);
    expect(await endsWithin(3000, say('Two', quiet()))).toBe(true);
    const calls = engine.speak.mock.calls.length;
    expect(await endsWithin(estimateMs('Three'), say('Three', quiet()))).toBe(true);
    expect(engine.speak.mock.calls).toHaveLength(calls);
  });

  it('never leaves the game stuck when a voice starts and never ends', async () => {
    fakeEngine((utterance) => utterance.onstart?.());
    expect(await endsWithin(10_000, say('One', quiet()))).toBe(true);
  });

  it('still paces the game when there is no speech at all', async () => {
    const line = say('Hop like a frog!', quiet());
    expect(await endsWithin(estimateMs('Hop like a frog!') - 1, line)).toBe(false);
    expect(await endsWithin(1, line)).toBe(true);
  });

  it('stops the voice at once when aborted', async () => {
    const engine = fakeEngine((utterance) => utterance.onstart?.());
    const control = new AbortController();
    const line = say('Hop like a frog!', control.signal);
    engine.speaking = true;
    control.abort();
    expect(await endsWithin(0, line)).toBe(true);
    expect(engine.cancel).toHaveBeenCalled();
  });

  it('leaves an idle voice alone, since canceling can lose the next line', () => {
    const engine = fakeEngine(() => {});
    void say('One', quiet());
    expect(engine.cancel).not.toHaveBeenCalled();
  });
});
