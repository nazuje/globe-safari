import { burst } from '@playroom/kit';
import { ANIMALS } from './animals.ts';
import { button, el } from './dom.ts';
import { endPeek, flipCard, matchLine, newGame, turnLine, type FlipEvent, type GameState } from './game.ts';
import { bestGrid } from './layout.ts';
import { resultPanel, type Player } from './result.ts';
import { PLAYER_NAMES, SOLO_NAME, type Setup } from './setup.ts';
import { say } from './voice.ts';

/** Keep in step with --flip-ms in style.css. */
const FLIP_MS = 450;
/** How long a missed pair stays up once it has finished turning. */
const PEEK_MS = 1500;
/** Taps this soon after a miss are a double tap, not a wish to move on. */
const PEEK_TAP_GUARD_MS = 500;
/** Time for the last match to be heard and seen before the celebration. */
const FINISH_PAUSE_MS = 1500;

const CARD_GAP = 8;
const MAX_CARD = 180;

function playersFor(setup: Setup): Player[] {
  if (setup.mode === 'solo') return [{ name: SOLO_NAME, face: setup.faces[0] }];
  return PLAYER_NAMES.map((name, index) => ({ name, face: setup.faces[index] }));
}

function cardButton(emoji: string): HTMLButtonElement {
  const card = button('card');
  const inner = el('span', 'card-inner');
  inner.setAttribute('aria-hidden', 'true');
  inner.append(el('span', 'card-face card-back', '🐾'), el('span', 'card-face card-front', emoji));
  card.append(inner);
  return card;
}

interface ScorePanel {
  root: HTMLElement;
  stars: HTMLElement;
}

function scorePanel(player: Player): ScorePanel {
  const root = el('div', 'score');
  const stars = el('span', 'score-stars', '⭐ 0');
  const text = el('span', 'score-text');
  text.append(el('span', 'score-name', player.name), stars);
  root.append(el('span', 'score-face', player.face), text);
  return { root, stars };
}

/** One game from first flip to celebration. Calling onChange returns to the setup screen. */
export function startGame(host: HTMLElement, setup: Setup, onChange: () => void): void {
  const players = playersFor(setup);
  const solo = players.length === 1;
  let game: GameState = newGame(setup.pairs, players.length, ANIMALS);
  let locked = false;
  let peekStart = 0;
  let peekTimer = 0;

  const screen = el('section', 'play');
  const scoreboard = el('div', 'scoreboard');
  const panels = players.map(scorePanel);
  scoreboard.append(...panels.map((panel) => panel.root));
  const flipCount = el('div', 'flip-count');
  if (solo) scoreboard.append(flipCount);

  const board = el('div', 'board');
  const cards = game.cards.map((animal) => cardButton(animal.emoji));
  const grid = el('div', 'grid');
  grid.append(...cards);
  board.append(grid);
  screen.append(scoreboard, board);
  host.replaceChildren(screen);

  const resize = new ResizeObserver(() => {
    const { cols, size } = bestGrid(cards.length, board.clientWidth, board.clientHeight, CARD_GAP, MAX_CARD);
    grid.style.setProperty('--cols', String(cols));
    grid.style.setProperty('--card', `${size}px`);
  });
  resize.observe(board);

  function leave(then: () => void): void {
    resize.disconnect();
    then();
  }

  function draw(): void {
    panels.forEach((panel, index) => {
      const active = index === game.current;
      panel.root.classList.toggle('is-turn', active);
      panel.root.toggleAttribute('aria-current', active);
      const text = `⭐ ${game.stars[index]}`;
      if (panel.stars.textContent !== text) {
        panel.stars.textContent = text;
        panel.stars.classList.remove('pop');
        void panel.stars.offsetWidth;
        panel.stars.classList.add('pop');
      }
    });
    screen.dataset.turn = String(game.current);
    flipCount.textContent = `${game.flips} flips`;
    cards.forEach((card, index) => {
      const animal = game.cards[index];
      const matched = game.matched.includes(index);
      const up = matched || game.faceUp.includes(index);
      card.classList.toggle('up', up);
      card.classList.toggle('matched', matched);
      card.classList.toggle('missed', game.phase === 'peeking' && up && !matched);
      card.setAttribute('aria-label', up ? animal.name : `Card ${index + 1}, face down`);
    });
  }

  function sayTurn(): void {
    say(solo ? 'Try again!' : turnLine(players[game.current].name));
  }

  /** The missed pair turns back, the turn passes, and taps wait until they are down. */
  function settle(): void {
    clearTimeout(peekTimer);
    game = endPeek(game);
    locked = true;
    draw();
    sayTurn();
    setTimeout(() => {
      locked = false;
    }, FLIP_MS);
  }

  function celebrateMatch(index: number, goesAgain: boolean): void {
    const { left, top, width, height } = cards[index].getBoundingClientRect();
    burst(left + width / 2, top + height / 2);
    say(matchLine(game.cards[index], goesAgain));
  }

  function finish(): void {
    screen.append(
      resultPanel(game, players, {
        onAgain: () => leave(() => startGame(host, setup, onChange)),
        onChange: () => leave(onChange),
      }),
    );
  }

  function react(event: FlipEvent, index: number): void {
    const animal = game.cards[index];
    if (event === 'first') say(animal.name);
    if (event === 'match') celebrateMatch(index, !solo);
    if (event === 'miss') {
      say(animal.name);
      peekStart = performance.now();
      peekTimer = window.setTimeout(settle, FLIP_MS + PEEK_MS);
    }
    if (event === 'finished') {
      celebrateMatch(index, false);
      setTimeout(finish, FINISH_PAUSE_MS);
    }
  }

  function tapCard(index: number): void {
    const animal = game.cards[index];
    const result = flipCard(game, index);
    if (result.event === 'ignored') {
      if (game.matched.includes(index) || game.faceUp.includes(index)) say(animal.name);
      return;
    }
    game = result.game;
    draw();
    react(result.event, index);
  }

  screen.addEventListener('click', (event) => {
    if (locked || game.phase === 'finished') return;
    if (game.phase === 'peeking') {
      if (performance.now() - peekStart > PEEK_TAP_GUARD_MS) settle();
      return;
    }
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest('.card');
    if (card instanceof HTMLButtonElement) tapCard(cards.indexOf(card));
  });

  draw();
  say(solo ? 'Find the pairs!' : turnLine(players[game.current].name));
}
