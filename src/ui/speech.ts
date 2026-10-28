import { el } from './dom.ts';

export function speechSupported(): boolean {
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function friendlyVoice(): SpeechSynthesisVoice | undefined {
  const english = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  return english.find((v) => v.localService) ?? english[0];
}

/** Reads text aloud, a little slower than normal, interrupting anything already playing. */
export function speak(text: string): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  const voice = friendlyVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** A round 🔊 button that reads the text aloud. Returns null when the browser can't speak. */
export function speakerButton(text: string, label = 'Read it to me'): HTMLButtonElement | null {
  if (!speechSupported()) return null;
  return el('button', {
    className: 'speaker-btn',
    text: '🔊',
    attrs: { type: 'button', 'aria-label': label, title: label },
    onClick: (event) => {
      event.stopPropagation();
      speak(text);
    },
  });
}
