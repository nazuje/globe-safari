import { BALL_IDS, type BallId } from './balls.ts';
import { text } from './lang/index.ts';
import { BALLS_PER_TURN } from './scoring.ts';
import { PLAYER_EMOJI, PLAYERS, type Tally } from './tally.ts';
import { button, element } from './ui.ts';

export interface MeterState {
  fallen: number;
  goals: readonly number[];
  ballsLeft: number;
}

export interface Hud {
  showBall(ball: BallId): void;
  meter(state: MeterState): void;
  tally(tally: Tally | null): void;
  hint(x: number, y: number): void;
  hideHint(): void;
  reticle(x: number, y: number): void;
  hideReticle(): void;
  ripple(x: number, y: number): void;
  tray(shown: boolean): void;
  /** Marks the big last ball. */
  lastBall(on: boolean): void;
  flashSlowMotion(on: boolean): void;
  redraw(): void;
}

export function createHud(app: HTMLElement, onBall: (ball: BallId) => void): Hud {
  const top = element('div', 'hud');
  const tally = element('div', 'tally');
  tally.hidden = true;
  const fox = element('span', 'tally-chip');
  const frog = element('span', 'tally-chip');
  tally.append(fox, frog);

  const meter = element('div', 'meter');
  const fill = element('div', 'meter-fill');
  const count = element('div', 'meter-count');
  const stars = [element('span', 'meter-star', '⭐'), element('span', 'meter-star', '⭐'), element('span', 'meter-star', '⭐')];
  meter.append(fill, ...stars);

  const pips = element('div', 'pips');
  const pipList = Array.from({ length: BALLS_PER_TURN }, () => element('span', 'pip'));
  pips.append(...pipList);
  const row = element('div', 'hud-row');
  row.append(count, meter, pips);
  top.append(tally, row);

  const tray = element('div', 'tray');
  const buttons = new Map<BallId, HTMLButtonElement>();
  for (const id of BALL_IDS) {
    const choice = button('ball-btn');
    choice.append(element('span', `ball-art ball-${id}`));
    choice.dataset.ball = id;
    choice.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      onBall(id);
    });
    // A keyboard press has no pointer before it, so it arrives as a click with no detail.
    choice.addEventListener('click', (event) => {
      if (event.detail === 0) onBall(id);
    });
    buttons.set(id, choice);
    tray.append(choice);
  }

  const hint = element('div', 'hint', '👆');
  hint.hidden = true;
  const reticle = element('div', 'reticle');
  reticle.hidden = true;
  const dim = element('div', 'slow-motion');
  dim.hidden = true;
  app.append(top, tray, hint, reticle, dim);

  let lastFallen = 0;

  function label(): void {
    for (const [id, choice] of buttons) choice.setAttribute('aria-label', text().balls[id]);
  }

  label();

  return {
    showBall(ball) {
      for (const [id, choice] of buttons) choice.classList.toggle('is-picked', id === ball);
    },
    meter({ fallen, goals, ballsLeft }) {
      // The bar fills to the third star, which can be more blocks than the structure began with.
      const full = goals[goals.length - 1] ?? 1;
      fill.style.width = `${Math.min(fallen / full, 1) * 100}%`;
      count.textContent = String(fallen);
      stars.forEach((star, index) => {
        const goal = goals[index] ?? full;
        star.style.left = `${Math.min((goal / full) * 100, 95)}%`;
        star.classList.toggle('is-won', fallen >= goal);
      });
      pipList.forEach((pip, index) => pip.classList.toggle('is-used', index >= ballsLeft));
      if (fallen > lastFallen) {
        count.classList.remove('is-bumped');
        void count.offsetWidth;
        count.classList.add('is-bumped');
      }
      lastFallen = fallen;
      if (ballsLeft === BALLS_PER_TURN) pips.classList.remove('is-last');
    },
    tally(state) {
      tally.hidden = state === null;
      if (!state) return;
      for (const player of PLAYERS) {
        const chip = player === 'fox' ? fox : frog;
        chip.textContent = `${PLAYER_EMOJI[player]} ${state[player]}`;
        chip.classList.toggle('is-turn', state.turn === player);
      }
    },
    hint(x, y) {
      hint.hidden = false;
      hint.style.transform = `translate(${x}px, ${y}px)`;
    },
    hideHint() {
      hint.hidden = true;
    },
    reticle(x, y) {
      reticle.hidden = false;
      reticle.style.transform = `translate(${x}px, ${y}px)`;
    },
    hideReticle() {
      reticle.hidden = true;
    },
    ripple(x, y) {
      const ring = element('div', 'ripple');
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      ring.addEventListener('animationend', () => ring.remove());
      app.append(ring);
    },
    tray(shown) {
      tray.hidden = !shown;
    },
    lastBall(on) {
      pips.classList.toggle('is-last', on);
    },
    flashSlowMotion(on) {
      dim.hidden = !on;
    },
    redraw: label,
  };
}
