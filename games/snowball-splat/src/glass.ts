import { element } from './ui.ts';

const STAY_MS = 1500;
const WIPE_MS = 650;
const MOST_SPLATS = 3;

/** A soft snowball lands on the glass, sits there looking silly, and a mitten wipes it away. */
export function splatGlass(host: HTMLElement, x: number, y: number, calm: boolean): void {
  if (host.childElementCount >= MOST_SPLATS * 2) return;
  const blob = element('div', 'glass-splat');
  blob.style.left = `${x * 100}%`;
  blob.style.top = `${y * 100}%`;
  blob.style.rotate = `${Math.random() * 60 - 30}deg`;
  const mitten = element('div', 'glass-mitten');
  mitten.textContent = '🧤';
  mitten.style.left = `${x * 100}%`;
  mitten.style.top = `${y * 100}%`;
  host.append(blob, mitten);
  const wipe = (): void => {
    if (!calm) {
      mitten.animate(
        [
          { opacity: 0, transform: 'translate(-180%, -60%) rotate(-20deg)' },
          { opacity: 1, offset: 0.2, transform: 'translate(-110%, -40%) rotate(-10deg)' },
          { opacity: 1, offset: 0.8, transform: 'translate(60%, 30%) rotate(14deg)' },
          { opacity: 0, transform: 'translate(120%, 40%) rotate(20deg)' },
        ],
        { duration: WIPE_MS, easing: 'ease-in-out' },
      );
    }
    blob
      .animate([{ opacity: 1 }, { opacity: 0 }], { duration: WIPE_MS, easing: 'ease-in', fill: 'forwards' })
      .finished.then(
        () => {
          blob.remove();
          mitten.remove();
        },
        () => undefined,
      );
  };
  setTimeout(wipe, STAY_MS);
}
