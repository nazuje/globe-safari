import { burst, store } from '@playroom/kit';
import { button, el } from './dom.ts';
import { winnerLine, type GameState } from './game.ts';
import { BESTS_KEY, readBests, recordBest } from './setup.ts';
import { say } from './voice.ts';

export interface Player {
  name: string;
  face: string;
}

export interface ResultActions {
  onAgain: () => void;
  onChange: () => void;
}

interface Summary {
  emoji: string;
  headline: string;
  spoken: string;
  details: string[];
}

function togetherSummary(game: GameState, players: readonly Player[]): Summary {
  const headline = winnerLine(
    players.map((player) => player.name),
    game.stars,
  );
  return {
    emoji: '🏆',
    headline,
    spoken: headline,
    details: players.map((player, index) => `${player.face} ⭐ ${game.stars[index]}`),
  };
}

function soloSummary(game: GameState): Summary {
  const pairs = game.cards.length / 2;
  const { bests, isNew } = recordBest(readBests(store.get<unknown>(BESTS_KEY, null)), pairs, game.flips);
  store.set(BESTS_KEY, bests);
  return {
    emoji: isNew ? '🏆' : '🎉',
    headline: 'You found them all!',
    spoken: isNew ? `You found them all! ${game.flips} flips. A new best!` : `You found them all! ${game.flips} flips.`,
    details: [`${game.flips} flips`, isNew ? 'New best!' : `Best: ${bests[pairs]}`],
  };
}

function celebrate(): void {
  const { innerWidth: width, innerHeight: height } = window;
  burst(width / 2, height / 3, 28);
  setTimeout(() => burst(width / 4, height / 2), 250);
  setTimeout(() => burst((width * 3) / 4, height / 2), 500);
}

/** The end of a game, laid over the finished board. */
export function resultPanel(game: GameState, players: readonly Player[], actions: ResultActions): HTMLElement {
  const summary = players.length > 1 ? togetherSummary(game, players) : soloSummary(game);
  const again = button('btn btn-sun result-again', 'Play again 🔁');
  again.addEventListener('click', actions.onAgain);
  const change = button('btn result-change', 'Change game');
  change.addEventListener('click', actions.onChange);

  const details = el('div', 'result-details');
  details.append(...summary.details.map((detail) => el('span', 'result-detail', detail)));

  const card = el('div', 'result-card');
  card.append(el('div', 'result-emoji', summary.emoji), el('h2', 'result-title', summary.headline), details, again, change);

  const panel = el('div', 'result');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', summary.headline);
  panel.append(card);

  say(summary.spoken);
  celebrate();
  return panel;
}
