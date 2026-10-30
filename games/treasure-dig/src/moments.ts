import { burst, playSound, speak } from '@playroom/kit';
import { CHEST, EGG, itemArt } from './art.ts';
import { calm, sounds } from './fx.ts';
import { text } from './lang/index.ts';

export interface Moment {
  /** Lives over the patch while it plays. */
  element: HTMLElement;
  stop(): void;
}

interface Big {
  art: string;
  className: string;
  tapsNeeded: number;
  promptLine(): string;
  onTap(step: number, stage: HTMLElement): void;
  onBurst(stage: HTMLElement): void;
  /** How long the reward stays before the patch comes back. */
  stayMs: number;
}

/**
 * The shared shape of the two big surprises: something huge that takes many taps
 * anywhere on it, then bursts. A tap anywhere on the overlay counts, so a small
 * hand can't miss, and the only way out is the fun way.
 */
function bigMoment(big: Big, onDone: () => void): Moment {
  const element = document.createElement('div');
  element.className = `moment ${big.className}`;
  element.innerHTML = `<div class="moment-stage">${big.art}<div class="finger" aria-hidden="true">👆</div></div>`;
  const stage = element.firstElementChild as HTMLElement;
  let taps = 0;
  let opened = false;
  let timer = 0;
  let hintTimer = window.setTimeout(() => speak(big.promptLine()), 1300);

  element.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (opened) return;
    window.clearTimeout(hintTimer);
    hintTimer = 0;
    taps += 1;
    stage.classList.add('tapped');
    stage.style.setProperty('--grow', String(1 + (taps / big.tapsNeeded) * 0.3));
    element.dataset.taps = String(taps);
    if (!calm()) {
      stage.animate(
        [
          { rotate: '-5deg', translate: '0 4px' },
          { rotate: '5deg', translate: '0 -4px' },
          { rotate: '0deg', translate: '0 0' },
        ],
        { duration: 160 },
      );
    }
    big.onTap(taps, stage);
    if (taps < big.tapsNeeded) return;
    opened = true;
    element.classList.add('open');
    big.onBurst(stage);
    timer = window.setTimeout(onDone, big.stayMs);
  });

  return {
    element,
    stop() {
      window.clearTimeout(timer);
      window.clearTimeout(hintTimer);
    },
  };
}

function shower(stage: HTMLElement, id: string, x: number, y: number): void {
  const coin = document.createElement('span');
  coin.className = 'shower';
  coin.innerHTML = itemArt(id);
  coin.setAttribute('aria-hidden', 'true');
  stage.append(coin);
  const dx = (Math.random() - 0.5) * 220;
  void coin
    .animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(0.6)`, opacity: 1 },
        { transform: `translate(${x + dx * 0.6}px, ${y - 130}px) scale(1.2)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${x + dx}px, ${y + 60}px) scale(1)`, opacity: 0 },
      ],
      { duration: calm() ? 1 : 640, easing: 'ease-out' },
    )
    .finished.catch(() => undefined)
    .then(() => coin.remove());
}

function burstAt(element: HTMLElement): void {
  const box = element.getBoundingClientRect();
  burst(box.left + box.width / 2, box.top + box.height / 2, 28);
}

/** A gigantic golden chest. Every tap knocks a coin loose, and then it bursts open with prizes. */
export function chestMoment(tapsNeeded: number, prizes: string[], onOpen: () => void, onDone: () => void): Moment {
  return bigMoment(
    {
      art: CHEST,
      className: 'moment-chest',
      tapsNeeded,
      stayMs: 2600,
      promptLine: () => text().chestTap,
      onTap(step, stage) {
        playSound('dig');
        sounds.climb(step);
        shower(stage, 'coin', 0, -20);
      },
      onBurst(stage) {
        playSound('tada');
        speak(text().chestOpen);
        burstAt(stage);
        for (let i = 0; i < 10; i++) shower(stage, 'coin', 0, -20);
        const prizeRow = document.createElement('div');
        prizeRow.className = 'prizes';
        prizeRow.innerHTML = prizes.map((id) => `<div class="prize">${itemArt(id)}</div>`).join('');
        stage.append(prizeRow);
        onOpen();
      },
    },
    onDone,
  );
}

/** A very rare dragon egg. It cracks a little with every tap, then a friendly baby dragon pops out. */
export function eggMoment(dragon: string, onHatch: () => void, onDone: () => void): Moment {
  return bigMoment(
    {
      art: EGG,
      className: 'moment-egg',
      tapsNeeded: 7,
      stayMs: 3200,
      promptLine: () => text().eggTap,
      onTap(step, stage) {
        playSound('bonk');
        sounds.climb(step);
        stage.dataset.cracks = String(Math.ceil(step / 2));
      },
      onBurst(stage) {
        sounds.hatch();
        speak(text().eggHatch);
        burstAt(stage);
        const baby = document.createElement('div');
        baby.className = 'baby';
        baby.innerHTML = itemArt(dragon);
        stage.append(baby);
        for (let i = 0; i < 6; i++) shower(stage, 'star', 0, -30);
        onHatch();
      },
    },
    onDone,
  );
}
