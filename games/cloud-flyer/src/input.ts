import type { Steer } from './flight.ts';
import { KEY_NAMES, NO_KEYS, steerFromKeys, steerFromScreen, type Keys, type Span } from './steering.ts';

interface Spot {
  x: number;
  y: number;
}

export interface Steering {
  /** Where the player wants the flyer right now, or null when nobody is steering. */
  read(): Steer;
  /** The finger on screen, in page pixels, for the little glow under it. */
  touch(): Spot | null;
  onPress(listener: (x: number, y: number) => void): void;
  dispose(): void;
}

/** Fingers, mouse and keys all end up as one thing: a place the flyer should glide to. */
export function bindSteering(canvas: HTMLCanvasElement, span: () => Span): Steering {
  // In order of arrival: the newest finger steers, so a resting palm can't hold the flyer hostage.
  const fingers = new Map<number, Spot>();
  let hover: Spot | null = null;
  let keys: Keys = { ...NO_KEYS };
  let press: (x: number, y: number) => void = () => {};

  function down(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // The finger has already gone, and the pointerup listener tidies up.
    }
    press(event.clientX, event.clientY);
  }

  function move(event: PointerEvent): void {
    const spot = { x: event.clientX, y: event.clientY };
    if (fingers.has(event.pointerId)) fingers.set(event.pointerId, spot);
    if (event.pointerType === 'mouse') hover = spot;
  }

  function up(event: PointerEvent): void {
    fingers.delete(event.pointerId);
  }

  function left(event: PointerEvent): void {
    if (event.pointerType === 'mouse') hover = null;
  }

  function keyed(event: KeyboardEvent, held: boolean): void {
    const name = KEY_NAMES[event.key];
    if (!name) return;
    event.preventDefault();
    keys = { ...keys, [name]: held };
  }

  const keyDown = (event: KeyboardEvent): void => keyed(event, true);
  const keyUp = (event: KeyboardEvent): void => keyed(event, false);

  function letGo(): void {
    keys = { ...NO_KEYS };
    fingers.clear();
    hover = null;
  }

  function latest(): Spot | null {
    let found: Spot | null = null;
    for (const spot of fingers.values()) found = spot;
    return found;
  }

  function fromSpot({ x, y }: Spot): Steer {
    const box = canvas.getBoundingClientRect();
    return steerFromScreen(((x - box.left) / box.width) * 2 - 1, ((y - box.top) / box.height) * 2 - 1, span());
  }

  const stopMenu = (event: Event): void => event.preventDefault();

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', left);
  canvas.addEventListener('contextmenu', stopMenu);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', letGo);

  return {
    read() {
      const finger = latest();
      if (finger) return fromSpot(finger);
      return steerFromKeys(keys) ?? (hover ? fromSpot(hover) : null);
    },
    touch: latest,
    onPress(listener) {
      press = listener;
    },
    dispose() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', left);
      canvas.removeEventListener('contextmenu', stopMenu);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', letGo);
    },
  };
}
