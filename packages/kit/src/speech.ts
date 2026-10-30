import { hasClips, clipUrl, playClip, reportMissingClip } from './clips.ts';
import { getLanguage, type Language } from './language.ts';
import { onEveryTap } from './taps.ts';

export interface SayOptions {
  /** Device voices only. A recorded clip always plays as it was generated. */
  rate?: number;
  /** Device voices only, like rate. */
  pitch?: number;
  /**
   * Recorded speech has no rate, so this picks the slow recording of the line
   * (see slowLines in scripts/voice/README.md). It falls back to the normal clip.
   */
  slow?: boolean;
  /** Wait behind whatever is speaking instead of cutting it off. */
  queue?: boolean;
  /** Stops the line early. The returned promise then resolves at once. */
  signal?: AbortSignal;
}

const RATE = 0.9;
const PITCH = 1.1;
const START_LIMIT_MS = 2500;
const DEAD_AFTER_MISSES = 2;

let missedStarts = 0;
// Some browsers lose the end event if nothing holds on to the utterance.
let speaking: SpeechSynthesisUtterance | null = null;
let current: AbortController | null = null;
/** Settles when the last waiting line has finished. Null when nothing is speaking. */
let tail: Promise<void> | null = null;
/** Bumped whenever lines are cleared, so a queued line knows it has been dropped. */
let turn = 0;

function hasEngine(): boolean {
  return 'speechSynthesis' in globalThis && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Slovenian only reaches the speakers in a game that has registered clips; anything else stays English. */
function speechLanguage(): Language {
  return getLanguage() === 'sl' && hasClips() ? 'sl' : 'en';
}

export function canSpeak(): boolean {
  return speechLanguage() === 'sl' || hasEngine();
}

/** The one place a device voice is chosen: one on the device if possible, then any for the language. */
function pickVoice(language: Language): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith(language));
  return voices.find((voice) => voice.localService) ?? voices[0];
}

/** Gives the voice a fresh chance. Every tap does this too, because speech tried before the first tap often goes nowhere. */
export function retryVoice(): void {
  missedStarts = 0;
}

/** About how long a line takes aloud: also the pause we leave when there is no voice at all. */
export function estimateMs(text: string): number {
  return Math.max(700, text.trim().split(/\s+/).length * 420);
}

function waitQuietly(text: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, estimateMs(text));
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

function hushEngine(): void {
  // Canceling an idle engine can make iPads drop the line that follows it.
  if (hasEngine() && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}

/**
 * Speaks with a device voice and resolves when it has ended, was aborted, or
 * plainly isn't going to happen. A browser with no working voice may never fire
 * any event, so nothing here depends on one arriving.
 */
function viaVoice(text: string, options: SayOptions, language: Language, signal: AbortSignal): Promise<void> {
  const voice = hasEngine() ? pickVoice(language) : undefined;
  // English may fall to the browser's default voice. Slovenian never may: it would be read as English.
  const quiet = !hasEngine() || missedStarts >= DEAD_AFTER_MISSES || (language === 'sl' && !voice);
  if (quiet) return waitQuietly(text, signal);

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    let limit: ReturnType<typeof setTimeout>;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(limit);
      signal.removeEventListener('abort', cut);
      resolve();
    };
    const cut = (): void => {
      if (settled) return;
      hushEngine();
      finish();
    };

    utterance.rate = options.rate ?? RATE;
    utterance.pitch = options.pitch ?? PITCH;
    if (voice) utterance.voice = voice;
    if (language === 'sl') utterance.lang = 'sl-SI';
    utterance.onend = finish;
    utterance.onerror = finish;
    utterance.onstart = () => {
      missedStarts = 0;
      clearTimeout(limit);
      limit = setTimeout(cut, estimateMs(text) * 3 + 2000);
    };

    signal.addEventListener('abort', cut, { once: true });
    limit = setTimeout(() => {
      missedStarts += 1;
      cut();
    }, START_LIMIT_MS);

    speaking = utterance;
    if (!options.queue) hushEngine();
    speechSynthesis.speak(speaking);
  });
}

async function viaClip(text: string, url: string, options: SayOptions, signal: AbortSignal): Promise<void> {
  const result = await playClip(url, signal, estimateMs(text) * 3 + 2000);
  if (result === 'played' || signal.aborted) return;
  if (result === 'failed') reportMissingClip(text);
  await viaVoice(text, options, 'sl', signal);
}

function speakLine(text: string, options: SayOptions, signal: AbortSignal): Promise<void> {
  if (speechLanguage() === 'en') return viaVoice(text, options, 'en', signal);
  const url = clipUrl(text, options.slow);
  if (url) return viaClip(text, url, options, signal);
  reportMissingClip(text);
  return viaVoice(text, options, 'sl', signal);
}

function startLine(text: string, options: SayOptions): Promise<void> {
  const control = new AbortController();
  const stop = (): void => control.abort();
  current = control;
  options.signal?.addEventListener('abort', stop, { once: true });
  return speakLine(text, options, control.signal).finally(() => {
    options.signal?.removeEventListener('abort', stop);
    if (current === control) current = null;
  });
}

function clearLines(): void {
  turn += 1;
  tail = null;
  current?.abort();
  current = null;
}

/**
 * Speaks a line and resolves when it has finished, whatever happens: this never
 * hangs, and with no voice at all it waits about as long as the line would take.
 *
 * In Slovenian, in a game that called useClips, this plays the recorded clip for
 * exactly this text. If the clip is missing or broken it uses a device Slovenian
 * voice, or stays quiet, and never reads Slovenian with an English voice.
 *
 * A new line cuts off the one before unless it asks to queue.
 */
export function say(text: string, options: SayOptions = {}): Promise<void> {
  onEveryTap(retryVoice);
  const { queue = false, signal } = options;
  if (signal?.aborted) return Promise.resolve();
  if (!queue) clearLines();

  const myTurn = turn;
  const start = (): Promise<void> | undefined => {
    if (myTurn === turn && !signal?.aborted) return startLine(text, options);
    return undefined;
  };
  // A line with nothing ahead of it starts right now, still inside the tap that asked for it.
  const line = tail ? tail.then(start) : Promise.resolve(start());
  const finished: Promise<void> = line.then(() => {
    if (tail === finished) tail = null;
  });
  tail = finished;
  return finished;
}

/** Reads text aloud, a little slower than normal, interrupting anything already playing. */
export function speak(text: string): void {
  void say(text);
}

export function stopSpeaking(): void {
  clearLines();
  hushEngine();
}
