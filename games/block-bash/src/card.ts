import { burst, playSound } from '@playroom/kit';
import { text } from './lang/index.ts';
import { PLAYER_EMOJI, type Player, type Tally } from './tally.ts';
import { button, element } from './ui.ts';

/** Long enough for a child still mashing the crash not to press anything by accident. */
const ARMED_AFTER_MS = 650;
const STAR_GAP_MS = 240;

export type CardChoice = 'again' | 'next' | 'turn' | 'bonus';

export interface CardSolo {
  kind: 'solo';
  fallen: number;
  stars: number;
  best: number;
  isNew: boolean;
  bonus: boolean;
}

export interface CardHandover {
  kind: 'handover';
  player: Player;
  fallen: number;
  next: Player;
}

export interface CardBoth {
  kind: 'both';
  tally: Tally;
  bonus: boolean;
}

export type CardContent = CardSolo | CardHandover | CardBoth;

export interface Card {
  show(content: CardContent): void;
  hide(): void;
  redraw(): void;
}

function starRow(stars: number, celebrate: boolean, calm: boolean): HTMLElement {
  const row = element('div', 'card-stars');
  for (let index = 0; index < 3; index += 1) {
    const star = element('span', index < stars ? 'card-star is-won' : 'card-star', '⭐');
    if (calm || !celebrate) star.style.animation = 'none';
    else star.style.animationDelay = `${index * STAR_GAP_MS}ms`;
    row.append(star);
  }
  return row;
}

export function createCard(app: HTMLElement, onChoice: (choice: CardChoice) => void, calm: () => boolean): Card {
  const card = element('div', 'card');
  card.hidden = true;
  app.append(card);
  let content: CardContent | null = null;
  let armedAt = 0;

  function choiceButton(className: string, label: string, choice: CardChoice, words = ''): HTMLButtonElement {
    const made = button(`btn ${className}`, label);
    if (words) made.setAttribute('aria-label', words);
    made.addEventListener('click', () => {
      if (performance.now() >= armedAt) onChoice(choice);
    });
    return made;
  }

  function again(): HTMLButtonElement {
    return choiceButton('card-btn', '↻', 'again', text().again);
  }

  function next(): HTMLButtonElement {
    return choiceButton('card-btn card-next', '▶', 'next', text().next);
  }

  function gift(): HTMLButtonElement {
    return choiceButton('card-btn card-gift', '🎁', 'bonus', text().bonus);
  }

  function draw(fresh: boolean): void {
    if (!content) return;
    const words = text();
    card.replaceChildren();
    const actions = element('div', 'card-actions');
    if (content.kind === 'solo') {
      const { fallen, stars, best, isNew, bonus } = content;
      card.append(starRow(stars, fresh, calm()), element('div', 'card-score', `🧱 ${fallen}`));
      if (isNew) card.append(element('div', 'card-note', words.newBest));
      else if (best > 0) card.append(element('div', 'card-note', `${words.best}: ${best}`));
      actions.append(again(), ...(bonus ? [gift()] : []), next());
    } else if (content.kind === 'handover') {
      const { player, fallen, next: nextPlayer } = content;
      card.append(element('div', 'card-score', `${PLAYER_EMOJI[player]} ${fallen}`));
      actions.append(choiceButton('card-btn card-next card-wide', `${PLAYER_EMOJI[nextPlayer]} ▶`, 'turn', words.turns[nextPlayer]));
    } else {
      const { tally, bonus } = content;
      card.append(
        element('div', 'card-score', `🦊 ${tally.fox} + 🐸 ${tally.frog}`),
        element('div', 'card-note card-together', `${words.together}: ${tally.fox + tally.frog} 😂`),
      );
      actions.append(again(), ...(bonus ? [gift()] : []), next());
    }
    card.append(actions);
    // Lets a laptop player carry on with the space bar. A touch shows no focus ring.
    if (fresh && actions.lastElementChild instanceof HTMLElement) actions.lastElementChild.focus({ preventScroll: true });
  }

  return {
    show(next) {
      content = next;
      armedAt = performance.now() + ARMED_AFTER_MS;
      card.hidden = false;
      draw(true);
      const rect = card.getBoundingClientRect();
      const lucky = next.kind === 'solo' ? next.stars >= 2 : next.kind === 'both';
      if (lucky && !calm()) burst(rect.left + rect.width / 2, rect.top + 20);
      if (next.kind === 'solo' && next.stars === 3) playSound('tada');
    },
    hide() {
      content = null;
      card.hidden = true;
      card.replaceChildren();
    },
    redraw() {
      draw(false);
    },
  };
}
