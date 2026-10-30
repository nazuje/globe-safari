import { canSpeak, stopSpeaking } from '@playroom/kit';

// The kit's speak() can't say when it has finished, and this game has to wait
// for the voice before the beat may start. So this is speak() plus an ending.

const START_LIMIT_MS = 2500;
const DEAD_AFTER_MISSES = 2;

let missedStarts = 0;
// Some browsers lose the end event if nothing holds on to the utterance.
let speaking: SpeechSynthesisUtterance | null = null;

/** Gives the voice a fresh chance, for each new game. */
export function retryVoice(): void {
  missedStarts = 0;
}

/** About how long a line takes aloud: also the pause we leave when there is no voice at all. */
export function estimateMs(text: string): number {
  return Math.max(700, text.trim().split(/\s+/).length * 420);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const english = speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'));
  return english.find((voice) => voice.localService) ?? english[0];
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

/**
 * Speaks a line and resolves when it has ended, was aborted, or plainly isn't
 * going to happen. A browser with no working voice may never fire any event,
 * so nothing here depends on one arriving.
 */
export function say(text: string, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  if (!canSpeak() || missedStarts >= DEAD_AFTER_MISSES) return waitQuietly(text, signal);

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    let limit: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(limit);
      signal.removeEventListener('abort', cut);
      resolve();
    };
    const cut = () => {
      if (settled) return;
      stopSpeaking();
      finish();
    };

    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
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
    // Canceling an idle engine can make iPads drop the line that follows it.
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    speechSynthesis.speak(speaking);
  });
}
