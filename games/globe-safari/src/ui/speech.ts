import { canSpeak, speak } from '@playroom/kit';
import { el } from './dom.ts';

/** A round 🔊 button that reads the text aloud. Returns null when the browser can't speak. */
export function speakerButton(text: string, label = 'Read it to me'): HTMLButtonElement | null {
  if (!canSpeak()) return null;
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
