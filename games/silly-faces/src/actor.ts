import { creatureInner, creatureSvg } from './art.ts';
import type { Look } from './parts.ts';
import type { TapPoint } from './tap.ts';
import { calm } from './tap.ts';

const LOOK_MS = 1500;
const VIEW_WIDTH = 420;

export interface Actor {
  /** Redraws the creature with no fuss, whatever it is doing. */
  draw(look: Look): void;
  /** Starts an act, cutting off any act before it. `then` runs only if nothing cuts this one off. */
  act(name: string, ms: number, then?: () => void): void;
  /** Runs something during the current act. A new act cancels it. */
  during(ms: number, step: () => void): void;
  current(): string | null;
  /** A quick squish, for a tap while it is busy. */
  poke(): void;
  /** Its eyes turn toward a point on screen for a moment. */
  glance(point: TapPoint): void;
  /** Where a point on the drawing is on screen. */
  screen(x: number, y: number): TapPoint;
  svg(): SVGSVGElement;
}

export function createActor(host: HTMLElement, look: Look): Actor {
  const mover = document.createElement('span');
  mover.className = 'mover';
  mover.innerHTML = creatureSvg(look);
  host.append(mover);
  const svg = mover.querySelector('svg')!;

  let timers: ReturnType<typeof setTimeout>[] = [];
  let glanceTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    draw(next) {
      svg.innerHTML = creatureInner(next);
    },

    act(name, ms, then) {
      timers.forEach(clearTimeout);
      timers = [];
      delete host.dataset.act;
      // Reading layout here lets the same act play again straight after itself.
      void host.offsetWidth;
      host.dataset.act = name;
      timers.push(
        setTimeout(() => {
          delete host.dataset.act;
          then?.();
        }, ms),
      );
    },

    during(ms, step) {
      timers.push(setTimeout(step, ms));
    },

    current: () => host.dataset.act ?? null,

    poke() {
      if (calm()) return;
      mover.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.06, 0.92)' }, { transform: 'scale(0.97, 1.04)' }, { transform: 'scale(1)' }],
        { duration: 220, easing: 'ease-out', composite: 'add' },
      );
    },

    glance({ x, y }) {
      const box = svg.getBoundingClientRect();
      const across = (x - (box.left + box.width / 2)) / (box.width / 2);
      const down = (y - (box.top + box.height * 0.45)) / (box.height / 2);
      const clamp = (value: number): string => Math.max(-1, Math.min(1, value)).toFixed(2);
      svg.style.setProperty('--gx', clamp(across));
      svg.style.setProperty('--gy', clamp(down));
      svg.dataset.glancing = 'yes';
      clearTimeout(glanceTimer);
      glanceTimer = setTimeout(() => delete svg.dataset.glancing, LOOK_MS);
    },

    screen(x, y) {
      const matrix = svg.getScreenCTM();
      if (!matrix) {
        const box = svg.getBoundingClientRect();
        return { x: box.left + (x / VIEW_WIDTH) * box.width, y: box.top + box.height / 2 };
      }
      return { x: matrix.a * x + matrix.e, y: matrix.d * y + matrix.f };
    },

    svg: () => svg,
  };
}
