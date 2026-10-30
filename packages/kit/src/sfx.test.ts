import { afterEach, describe, expect, it, vi } from 'vitest';
import { playNote, playSound, resetSounds, SOUND_NAMES } from './sfx.ts';

function fakeParam() {
  return { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
}

function fakeNode() {
  const node = { connect: vi.fn(() => node) };
  return node;
}

class FakeContext {
  static made: FakeContext[] = [];
  state = 'running';
  currentTime = 10;
  destination = fakeNode();
  oscillators: { type: string; frequency: ReturnType<typeof fakeParam>; start: ReturnType<typeof vi.fn> }[] = [];
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    FakeContext.made.push(this);
  }

  createDynamicsCompressor = () => fakeNode();
  createGain = () => ({ ...fakeNode(), gain: fakeParam() });
  createOscillator = () => {
    const oscillator = { ...fakeNode(), type: '', frequency: fakeParam(), start: vi.fn(), stop: vi.fn() };
    this.oscillators.push(oscillator);
    return oscillator;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetSounds();
  FakeContext.made = [];
});

describe('sound effects', () => {
  it('stays quiet and safe without Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playSound('pop')).not.toThrow();
    expect(() => playNote(440)).not.toThrow();
  });

  it('stays quiet when the browser refuses to make a context', () => {
    vi.stubGlobal('AudioContext', () => {
      throw new Error('no audio');
    });
    expect(() => playSound('pop')).not.toThrow();
  });

  it('plays at least one tone for every sound', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    for (const name of SOUND_NAMES) {
      const before = FakeContext.made[0]?.oscillators.length ?? 0;
      playSound(name);
      expect(FakeContext.made[0]?.oscillators.length, name).toBeGreaterThan(before);
    }
  });

  it('shares one context, because browsers limit how many a page can have', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playSound('pop');
    playSound('ding');
    expect(FakeContext.made).toHaveLength(1);
  });

  it('spaces the tones of a longer sound out in time', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playSound('tada');
    const starts = FakeContext.made[0]?.oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0]);
    expect(starts?.[0]).toBe(10);
    expect(starts?.[3]).toBeGreaterThan(10);
  });

  it('plays a note at the pitch asked for', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playNote(440, { wave: 'square' });
    const [oscillator] = FakeContext.made[0]?.oscillators ?? [];
    expect(oscillator?.type).toBe('square');
    expect(oscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10);
  });

  it('wakes a sleeping context when asked to play', () => {
    vi.stubGlobal('AudioContext', FakeContext);
    playSound('pop');
    const made = FakeContext.made[0];
    if (made) made.state = 'suspended';
    playSound('pop');
    expect(made?.resume).toHaveBeenCalled();
  });
});
