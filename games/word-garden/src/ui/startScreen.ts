import { canSpeak } from '@playroom/kit';
import { sayLine } from '../speech.ts';
import { LEVELS, type Level } from '../words.ts';
import { button, el } from './dom.ts';

const HOW_TO = 'Pick a level. Listen to the word, then tap the letters to spell it and grow a flower!';

export function createStartScreen(onLevel: (level: Level) => void): HTMLElement {
  return el('section', { className: 'start' }, [
    el('p', { className: 'start-lead', text: 'Spell words. Grow flowers!' }),
    canSpeak() && button('🔊 How to play', 'btn btn-sun', () => sayLine(HOW_TO)),
    el(
      'div',
      { className: 'levels' },
      LEVELS.map((level) =>
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
