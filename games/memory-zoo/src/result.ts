import { burst, store } from '@playroom/kit';
import { button, el } from './dom.ts';
import { winnerLine, type GameState } from './game.ts';
import { text } from './lang/index.ts';
import { BESTS_KEY, readBests, recordBest } from './setup.ts';
import { say } from './voice.ts';

export interface Player {
  /** Read each time it is shown, because the language can change mid-game. */
  name: () => string;
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
    players.map((player) => player.name()),
    game.stars,
  );
  return {
    emoji: '🏆',
    headline,
    spoken: headline,
    details: players.map((player, index) => `${player.face} ⭐ ${game.stars[index]}`),
  };
}

/** Records the score once, then gives back the summary to read in any language. */
function soloSummary(game: GameState): () => Summary {
  const pairs = game.cards.length / 2;
  const { bests, isNew } = recordBest(readBests(store.get<unknown>(BESTS_KEY, null)), pairs, game.flips);
  store.set(BESTS_KEY, bests);
  return () => ({
    emoji: isNew ? '🏆' : '🎉',
    headline: text().soloHeadline,
    spoken: text().soloSpoken(game.flips, isNew),
    details: [text().flipCount(game.flips), isNew ? text().newBest : text().bestDetail(bests[pairs])],
  });
}

function celebrate(): void {
  const { innerWidth: width, innerHeight: height } = window;
  burst(width / 2, height / 3, 28);
  setTimeout(() => burst(width / 4, height / 2), 250);
  setTimeout(() => burst((width * 3) / 4, height / 2), 500);
}

/**
 * The end of a game, laid over the finished board. It covers the language flag,
 * so its words stay as drawn, but its spoken line follows 🔊 onto the next screen.
 */
export function resultPanel(game: GameState, players: readonly Player[], actions: ResultActions): HTMLElement {
  const summarize = players.length > 1 ? () => togetherSummary(game, players) : soloSummary(game);
  const summary = summarize();
  const again = button('btn btn-sun result-again', text().playAgain);
  again.addEventListener('click', actions.onAgain);
  const change = button('btn result-change', text().changeGame);
  change.addEventListener('click', actions.onChange);

  const details = el('div', 'result-details');
  details.append(...summary.details.map((detail) => el('span', 'result-detail', detail)));

  const card = el('div', 'result-card');
  card.append(el('div', 'result-emoji', summary.emoji), el('h2', 'result-title', summary.headline), details, again, change);

  const panel = el('div', 'result');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', summary.headline);
  panel.append(card);

  say(() => summarize().spoken);
  celebrate();
  return panel;
}
