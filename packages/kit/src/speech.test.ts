import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipManifest } from './clips.ts';
import type { SayOptions } from './speech.ts';

class FakeUtterance {
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  rate = 1;
  pitch = 1;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}

function voiceFor(lang: string, localService = true): SpeechSynthesisVoice {
  return { lang, localService, name: lang, default: false, voiceURI: lang };
}

function fakeEngine(behave: (utterance: FakeUtterance) => void = () => {}, voices: SpeechSynthesisVoice[] = []) {
  const said: FakeUtterance[] = [];
  const engine = {
    speaking: false,
    pending: false,
    getVoices: () => voices,
    cancel: vi.fn(),
    speak: vi.fn((utterance: FakeUtterance) => {
      said.push(utterance);
      behave(utterance);
    }),
  };
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('speechSynthesis', engine);
  return { engine, said };
}

const saysAtOnce = (utterance: FakeUtterance): void => {
  utterance.onstart?.();
  utterance.onend?.();
};

/** Stands in for the one reused element. Tests decide when it plays, ends or fails. */
class FakeAudio {
  static made: FakeAudio[] = [];
  /** What each play() does. By default it starts playing and never ends, like a long clip. */
  static onPlay: (audio: FakeAudio) => Promise<void> = (audio) => {
    audio.emit('playing');
    return Promise.resolve();
  };

  src = '';
  played: string[] = [];
  pause = vi.fn();
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.made.push(this);
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener();
  }

  play(): Promise<void> {
    this.played.push(this.src);
    return FakeAudio.onPlay(this);
  }
}

function fakeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const saved = new Map<string, string>();
  return {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => void saved.set(key, value),
  };
}

const MANIFEST: ClipManifest = {
  clips: { 'Bravo!': 'bravo.mp3', 'Še enkrat!': 'again.mp3' },
  slow: { 'Bravo!': 'bravo-slow.mp3' },
};

async function load() {
  return { ...(await import('./speech.ts')), ...(await import('./clips.ts')), ...(await import('./language.ts')) };
}

/** A page in Slovenian with this game's clips registered. */
async function slovenian(manifest = MANIFEST) {
  const kit = await load();
  kit.setLanguage('sl');
  kit.useClips(manifest, './voice/sl/');
  return kit;
}

async function endsWithin(ms: number, line: Promise<void>): Promise<boolean> {
  let ended = false;
  void line.then(() => {
    ended = true;
  });
  await vi.advanceTimersByTimeAsync(ms);
  return ended;
}

function theAudio(): FakeAudio {
  const audio = FakeAudio.made[0];
  if (!audio) throw new Error('No audio element was made');
  return audio;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.stubGlobal('localStorage', fakeStorage());
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('document', new EventTarget());
  FakeAudio.made = [];
  FakeAudio.onPlay = (audio) => {
    audio.emit('playing');
    return Promise.resolve();
  };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('say with a device voice', () => {
  it('uses the friendly defaults', async () => {
    const { said } = fakeEngine();
    const { speak } = await load();
    speak('Hello');
    expect(said[0]).toMatchObject({ text: 'Hello', rate: 0.9, pitch: 1.1 });
  });

  it('takes a rate and a pitch', async () => {
    const { said } = fakeEngine();
    const { say } = await load();
    void say('Hello', { rate: 0.45, pitch: 1.3 });
    expect(said[0]).toMatchObject({ rate: 0.45, pitch: 1.3 });
  });

  it('picks a voice on the device, then any English one', async () => {
    const remote = voiceFor('en-GB', false);
    const local = voiceFor('en-US');
    const { said } = fakeEngine(() => {}, [voiceFor('sl-SI'), remote, local]);
    const { say } = await load();
    void say('Hello');
    expect(said[0]?.voice).toBe(local);
  });

  it('ends when the voice ends, not before', async () => {
    let finish = () => {};
    fakeEngine((utterance) => {
      utterance.onstart?.();
      finish = () => utterance.onend?.();
    });
    const { say } = await load();
    const line = say('Hop like a frog!');
    expect(await endsWithin(1000, line)).toBe(false);
    finish();
    expect(await endsWithin(0, line)).toBe(true);
  });

  it('ends when the voice reports an error', async () => {
    fakeEngine((utterance) => utterance.onerror?.());
    const { say } = await load();
    expect(await endsWithin(0, say('Hello'))).toBe(true);
  });

  it('starts at once, inside the tap that asked for it', async () => {
    const { said } = fakeEngine();
    const { say } = await load();
    void say('Hello');
    expect(said).toHaveLength(1);
  });

  it('cuts the line before when a new one starts', async () => {
    const { engine, said } = fakeEngine((utterance) => utterance.onstart?.());
    const { say } = await load();
    const first = say('One');
    engine.speaking = true;
    void say('Two');
    expect(await endsWithin(0, first)).toBe(true);
    expect(engine.cancel).toHaveBeenCalled();
    expect(said.map((utterance) => utterance.text)).toEqual(['One', 'Two']);
  });

  it('leaves an idle voice alone, since canceling can lose the next line', async () => {
    const { engine } = fakeEngine();
    const { say } = await load();
    void say('One');
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('never leaves the game stuck when a voice never starts, then stops trying', async () => {
    const { engine } = fakeEngine();
    const { estimateMs, say } = await load();
    expect(await endsWithin(3000, say('One'))).toBe(true);
    expect(await endsWithin(3000, say('Two'))).toBe(true);
    const calls = engine.speak.mock.calls.length;
    expect(await endsWithin(estimateMs('Three'), say('Three'))).toBe(true);
    expect(engine.speak.mock.calls).toHaveLength(calls);
  });

  it('gives the voice a fresh chance on a tap, since speech before the first tap often goes nowhere', async () => {
    const { engine } = fakeEngine();
    const { say } = await load();
    await endsWithin(3000, say('One'));
    await endsWithin(3000, say('Two'));
    document.dispatchEvent(new Event('click'));
    const calls = engine.speak.mock.calls.length;
    void say('Three');
    expect(engine.speak.mock.calls).toHaveLength(calls + 1);
  });

  it('never leaves the game stuck when a voice starts and never ends', async () => {
    fakeEngine((utterance) => utterance.onstart?.());
    const { say } = await load();
    expect(await endsWithin(10_000, say('One'))).toBe(true);
  });

  it('still paces the game when there is no speech at all', async () => {
    const { estimateMs, say } = await load();
    const line = say('Hop like a frog!');
    expect(await endsWithin(estimateMs('Hop like a frog!') - 1, line)).toBe(false);
    expect(await endsWithin(1, line)).toBe(true);
  });

  it('stops the voice at once when aborted', async () => {
    const { engine } = fakeEngine((utterance) => utterance.onstart?.());
    const { say } = await load();
    const control = new AbortController();
    const line = say('Hop like a frog!', { signal: control.signal });
    engine.speaking = true;
    control.abort();
    expect(await endsWithin(0, line)).toBe(true);
    expect(engine.cancel).toHaveBeenCalled();
  });

  it('does nothing for a signal that has already aborted', async () => {
    const { engine } = fakeEngine();
    const { say } = await load();
    expect(await endsWithin(0, say('One', { signal: AbortSignal.abort() }))).toBe(true);
    expect(engine.speak).not.toHaveBeenCalled();
  });
});

describe('canSpeak', () => {
  it('is false with nothing to speak with', async () => {
    const { canSpeak } = await load();
    expect(canSpeak()).toBe(false);
  });

  it('is true with a device voice engine', async () => {
    fakeEngine();
    const { canSpeak } = await load();
    expect(canSpeak()).toBe(true);
  });

  it('is true in Slovenian with clips, even with no engine', async () => {
    const { canSpeak } = await slovenian();
    expect(canSpeak()).toBe(true);
  });
});

describe('a queue of lines', () => {
  const opts: SayOptions = { queue: true };

  it('says each line after the one before, each with its own settings', async () => {
    const finishers: (() => void)[] = [];
    const { engine, said } = fakeEngine((utterance) => {
      utterance.onstart?.();
      finishers.push(() => utterance.onend?.());
    });
    const { say } = await load();
    void say('One', { ...opts, rate: 0.95 });
    void say('Two', { ...opts, rate: 0.45 });
    await vi.advanceTimersByTimeAsync(0);
    expect(said.map((utterance) => utterance.rate)).toEqual([0.95]);
    finishers[0]?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(said.map((utterance) => utterance.rate)).toEqual([0.95, 0.45]);
    expect(engine.cancel).not.toHaveBeenCalled();
  });

  it('starts the first queued line at once', async () => {
    const { said } = fakeEngine();
    const { say } = await load();
    void say('One', opts);
    expect(said).toHaveLength(1);
  });

  it('starts at once again straight after stopSpeaking, with lines still waiting', async () => {
    const { said } = fakeEngine();
    const { say, stopSpeaking } = await load();
    void say('One', opts);
    void say('Two', opts);
    stopSpeaking();
    void say('Three', opts);
    expect(said.map((utterance) => utterance.text)).toEqual(['One', 'Three']);
  });

  it('resolves each line in order', async () => {
    fakeEngine(saysAtOnce);
    const { say } = await load();
    const order: string[] = [];
    await Promise.all([
      say('One', opts).then(() => order.push('One')),
      say('Two', opts).then(() => order.push('Two')),
    ]);
    expect(order).toEqual(['One', 'Two']);
  });

  it('drops waiting lines on stopSpeaking, and their promises still resolve', async () => {
    const { said } = fakeEngine((utterance) => utterance.onstart?.());
    const { say, stopSpeaking } = await load();
    const first = say('One', opts);
    const second = say('Two', opts);
    stopSpeaking();
    expect(await endsWithin(0, first)).toBe(true);
    expect(await endsWithin(0, second)).toBe(true);
    expect(said.map((utterance) => utterance.text)).toEqual(['One']);
  });

  it('drops waiting lines when a new line cuts in', async () => {
    const { said } = fakeEngine((utterance) => utterance.onstart?.());
    const { say } = await load();
    void say('One', opts);
    void say('Two', opts);
    void say('Three');
    await vi.advanceTimersByTimeAsync(0);
    expect(said.map((utterance) => utterance.text)).toEqual(['One', 'Three']);
  });

  it('moves on when a queued voice never starts', async () => {
    const { said } = fakeEngine();
    const { say } = await load();
    void say('One', opts);
    const second = say('Two', opts);
    expect(await endsWithin(6000, second)).toBe(true);
    expect(said.map((utterance) => utterance.text)).toEqual(['One', 'Two']);
  });
});

describe('Slovenian clips', () => {
  it('plays the clip for the exact text instead of a device voice', async () => {
    const { engine } = fakeEngine();
    const { say } = await slovenian();
    void say('Bravo!');
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
    expect(engine.speak).not.toHaveBeenCalled();
  });

  it('defaults to where the pipeline puts clips', async () => {
    const { say, setLanguage, useClips } = await load();
    setLanguage('sl');
    useClips(MANIFEST);
    void say('Bravo!');
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
  });

  it('resolves when the clip ends, not before', async () => {
    const { say } = await slovenian();
    const line = say('Bravo!');
    expect(await endsWithin(1000, line)).toBe(false);
    theAudio().emit('ended');
    expect(await endsWithin(0, line)).toBe(true);
  });

  it('reuses one element for every line', async () => {
    const { say } = await slovenian();
    void say('Bravo!');
    void say('Še enkrat!');
    expect(FakeAudio.made).toHaveLength(1);
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3', './voice/sl/again.mp3']);
  });

  it('cuts the line before when a new one starts', async () => {
    const { say } = await slovenian();
    const first = say('Bravo!');
    void say('Še enkrat!');
    expect(theAudio().pause).toHaveBeenCalled();
    expect(await endsWithin(0, first)).toBe(true);
  });

  it('stops on stopSpeaking', async () => {
    const { say, stopSpeaking } = await slovenian();
    const line = say('Bravo!');
    stopSpeaking();
    expect(theAudio().pause).toHaveBeenCalled();
    expect(await endsWithin(0, line)).toBe(true);
  });

  it('plays a queue of clips in order', async () => {
    const { say } = await slovenian();
    void say('Bravo!', { queue: true });
    void say('Še enkrat!', { queue: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
    theAudio().emit('ended');
    await vi.advanceTimersByTimeAsync(0);
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3', './voice/sl/again.mp3']);
  });

  it('does not fall back to a voice when a clip is cut', async () => {
    const { engine } = fakeEngine(() => {}, [voiceFor('sl-SI')]);
    const { say, stopSpeaking } = await slovenian();
    void say('Bravo!');
    stopSpeaking();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.speak).not.toHaveBeenCalled();
  });

  it('ignores rate and pitch, which a recording cannot follow', async () => {
    const { say } = await slovenian();
    void say('Bravo!', { rate: 0.45, pitch: 1.3 });
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
  });

  it('plays the slow recording when asked', async () => {
    const { say } = await slovenian();
    void say('Bravo!', { slow: true });
    expect(theAudio().played).toEqual(['./voice/sl/bravo-slow.mp3']);
  });

  it('uses the normal clip when no slow recording exists', async () => {
    const { say } = await slovenian();
    void say('Še enkrat!', { slow: true });
    expect(theAudio().played).toEqual(['./voice/sl/again.mp3']);
  });

  it('keeps speaking English in a game with clips while the language is English', async () => {
    const { said } = fakeEngine();
    const { say, useClips } = await load();
    useClips(MANIFEST);
    void say('Bravo!');
    expect(said).toHaveLength(1);
    expect(FakeAudio.made).toHaveLength(0);
  });

  it('follows the language as it changes', async () => {
    const { said } = fakeEngine();
    const { say, setLanguage } = await slovenian();
    setLanguage('en');
    void say('Bravo!');
    expect(said).toHaveLength(1);
    setLanguage('sl');
    void say('Bravo!');
    expect(said).toHaveLength(1);
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
  });

  it('leaves a game with no clips in English, whatever the shared language is', async () => {
    const english = voiceFor('en-US');
    const { said } = fakeEngine(() => {}, [english]);
    const { say, setLanguage } = await load();
    setLanguage('sl');
    void say('Hooray!');
    expect(said[0]?.voice).toBe(english);
    expect(console.warn).not.toHaveBeenCalled();
  });
});

describe('when a clip cannot play', () => {
  const slovene = voiceFor('sl-SI');

  it('uses a device Slovenian voice for a line with no clip', async () => {
    const { said } = fakeEngine(() => {}, [voiceFor('en-US'), slovene]);
    const { say } = await slovenian();
    void say('Ni posnetka.');
    expect(said[0]).toMatchObject({ text: 'Ni posnetka.', voice: slovene, lang: 'sl-SI' });
  });

  it('never reads Slovenian with an English voice: it resolves quietly instead', async () => {
    const { engine } = fakeEngine(() => {}, [voiceFor('en-US')]);
    const { estimateMs, say } = await slovenian();
    const line = say('Ni posnetka.');
    expect(await endsWithin(estimateMs('Ni posnetka.'), line)).toBe(true);
    expect(engine.speak).not.toHaveBeenCalled();
  });

  it('resolves quietly with no speech engine at all', async () => {
    const { say } = await slovenian();
    expect(await endsWithin(5000, say('Ni posnetka.'))).toBe(true);
  });

  it('says once in development which line is missing', async () => {
    const { say } = await slovenian();
    await endsWithin(5000, say('Ni posnetka.'));
    await endsWithin(5000, say('Ni posnetka.'));
    expect(console.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain('Ni posnetka.');
  });

  it('falls back when the clip fails to load', async () => {
    const { said } = fakeEngine(() => {}, [slovene]);
    const { say } = await slovenian();
    FakeAudio.onPlay = (audio) => {
      queueMicrotask(() => audio.emit('error'));
      return new Promise(() => {});
    };
    void say('Bravo!');
    await vi.advanceTimersByTimeAsync(0);
    expect(said[0]).toMatchObject({ text: 'Bravo!', voice: slovene });
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('falls back when play() is rejected', async () => {
    const { said } = fakeEngine(() => {}, [slovene]);
    const { say } = await slovenian();
    FakeAudio.onPlay = () => Promise.reject(new DOMException('no', 'NotSupportedError'));
    void say('Bravo!');
    await vi.advanceTimersByTimeAsync(0);
    expect(said[0]).toMatchObject({ text: 'Bravo!' });
  });

  it('does not call a clip missing when the browser only wanted a tap first', async () => {
    const { say } = await slovenian();
    FakeAudio.onPlay = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
    expect(await endsWithin(5000, say('Bravo!'))).toBe(true);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('gives up on a clip that never starts', async () => {
    const { say } = await slovenian();
    FakeAudio.onPlay = () => new Promise(() => {});
    expect(await endsWithin(6000, say('Bravo!'))).toBe(true);
    expect(theAudio().pause).toHaveBeenCalled();
  });

  it('cuts a clip that starts and never ends', async () => {
    const { say } = await slovenian();
    expect(await endsWithin(10_000, say('Bravo!'))).toBe(true);
    expect(theAudio().pause).toHaveBeenCalled();
  });

  it('carries on past a bad clip in a queue', async () => {
    const { say } = await slovenian();
    FakeAudio.onPlay = () => Promise.reject(new DOMException('no', 'NotSupportedError'));
    void say('Bravo!', { queue: true });
    expect(await endsWithin(5000, say('Še enkrat!', { queue: true }))).toBe(true);
    expect(theAudio().played).toHaveLength(2);
  });
});

describe('unlocking audio', () => {
  const tap = (): boolean => document.dispatchEvent(new Event('click'));

  it('plays silence on the shared element on the first tap', async () => {
    await slovenian();
    tap();
    expect(theAudio().played).toHaveLength(1);
    expect(theAudio().played[0]).toMatch(/^data:audio\/mpeg/);
  });

  it('counts the tap at the end of a touch, as iOS does', async () => {
    await slovenian();
    document.dispatchEvent(new Event('touchend'));
    expect(FakeAudio.made).toHaveLength(1);
  });

  it('unlocks once', async () => {
    await slovenian();
    tap();
    await vi.advanceTimersByTimeAsync(0);
    tap();
    expect(theAudio().played).toHaveLength(1);
  });

  it('does not double up on one tap, which fires both touchend and click', async () => {
    await slovenian();
    document.dispatchEvent(new Event('touchend'));
    tap();
    expect(theAudio().played).toHaveLength(1);
  });

  it('tries again on the next tap if the first did not take', async () => {
    await slovenian();
    FakeAudio.onPlay = () => Promise.reject(new DOMException('no', 'NotAllowedError'));
    tap();
    await vi.advanceTimersByTimeAsync(0);
    tap();
    expect(theAudio().played).toHaveLength(2);
  });

  it('never interrupts a clip that is already playing', async () => {
    const { say } = await slovenian();
    void say('Bravo!');
    tap();
    expect(theAudio().played).toEqual(['./voice/sl/bravo.mp3']);
  });

  it('lets a clip in the same tap replace the silence', async () => {
    const { say } = await slovenian();
    tap();
    void say('Bravo!');
    expect(theAudio().src).toBe('./voice/sl/bravo.mp3');
    expect(FakeAudio.made).toHaveLength(1);
  });

  it('needs no clips registered to leave the page alone', async () => {
    await load();
    tap();
    expect(FakeAudio.made).toHaveLength(0);
  });
});

describe('missingClips', () => {
  it('is empty when every line has a clip', async () => {
    const { missingClips } = await load();
    expect(missingClips(MANIFEST, ['Bravo!', 'Še enkrat!'], ['Bravo!'])).toEqual([]);
  });

  it('names lines without a clip', async () => {
    const { missingClips } = await load();
    expect(missingClips(MANIFEST, ['Bravo!', 'Novo'])).toEqual(['Novo']);
  });

  it('names slow lines without a slow clip', async () => {
    const { missingClips } = await load();
    expect(missingClips(MANIFEST, [], ['Še enkrat!'])).toEqual(['(slow) Še enkrat!']);
    expect(missingClips({ clips: {} }, [], ['Bravo!'])).toEqual(['(slow) Bravo!']);
  });

  it('is not fooled by words that are object built-ins', async () => {
    const { missingClips } = await load();
    expect(missingClips(MANIFEST, ['constructor'])).toEqual(['constructor']);
  });
});
