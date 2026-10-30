import { canSpeak } from '@playroom/kit';
import { text } from '../lang/index.ts';
import { sayLine } from '../speech.ts';
import type { Level } from '../words.ts';
import { button, el } from './dom.ts';

export function createStartScreen(onLevel: (level: Level) => void): HTMLElement {
  const words = text();
  return el('section', { className: 'start' }, [
    el('p', { className: 'start-lead', text: words.lead }),
    canSpeak() && button(words.howToButton, 'btn btn-sun', () => sayLine(words.howTo)),
    el(
      'div',
      { className: 'levels' },
      words.levels.map((level) =>
        el(
          'button',
          {
            className: 'level',
            attrs: { type: 'button', 'data-level': String(level.id) },
            onClick: () => onLevel(level),
          },
          [el('span', { className: 'level-emoji', text: level.sample }), el('span', { text: level.name })],
        ),
      ),
    ),
  ]);
}
