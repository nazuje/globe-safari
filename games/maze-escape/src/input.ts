import type { Point } from './grid.ts';
import type { Steer } from './run.ts';
import { KEY_NAMES, NO_KEYS, steerFromFinger, steerFromKeys, TAP_STEP_S, type Keys } from './steering.ts';

export interface Controls {
  /** The way the player wants to run, given where the character is on the page and on the maze. */
  read(character: Point, characterOnPage: Point, floorAt: (x: number, y: number) => Point | null, seconds: number): Steer;
  /** The finger on the page, for the little glow under it. */
  finger(): Point | null;
  /** Anything is being held right now. */
  active(): boolean;
  onPress(listener: () => void): void;
  /** Forgets every finger and key, for when the play stops. */
  release(): void;
  dispose(): void;
}

/** Fingers, mouse and keys all end up as one thing: a way to run. */
export function bindControls(canvas: HTMLCanvasElement): Controls {
  // In order of arrival: the newest finger steers, so a resting palm can't hold the character hostage.
  const fingers = new Map<number, Point>();
  let keys: Keys = { ...NO_KEYS };
  let press: () => void = () => {};
  // A quick tap can start and end between two frames, so it's remembered long enough to take a small step.
  let tap: Point | null = null;
  let tapKeys: Keys = { ...NO_KEYS };
  let tapLeft = 0;

  function down(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    tap = { x: event.clientX, y: event.clientY };
    tapKeys = { ...NO_KEYS };
    tapLeft = TAP_STEP_S;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // The finger has already gone, and the pointerup listener tidies up.
    }
    press();
  }

  function move(event: PointerEvent): void {
    if (fingers.has(event.pointerId)) fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }

  function up(event: PointerEvent): void {
    fingers.delete(event.pointerId);
  }

  function keyed(event: KeyboardEvent, held: boolean): void {
    const name = KEY_NAMES[event.key];
    if (!name) return;
    event.preventDefault();
    keys = { ...keys, [name]: held };
  }

  const keyDown = (event: KeyboardEvent): void => {
    const name = KEY_NAMES[event.key];
    if (name && !event.repeat) {
      press();
      tap = null;
      tapKeys = { ...NO_KEYS, [name]: true };
      tapLeft = TAP_STEP_S;
    }
    keyed(event, true);
  };
  const keyUp = (event: KeyboardEvent): void => keyed(event, false);

  function release(): void {
    keys = { ...NO_KEYS };
    fingers.clear();
    tap = null;
    tapKeys = { ...NO_KEYS };
    tapLeft = 0;
  }

  function latest(): Point | null {
    let found: Point | null = null;
    for (const spot of fingers.values()) found = spot;
    return found;
  }

  const stopMenu = (event: Event): void => event.preventDefault();

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('contextmenu', stopMenu);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', release);

  return {
    read(character, onPage, floorAt, seconds) {
      const tapping = tapLeft > 0;
      tapLeft -= seconds;
      const finger = latest() ?? (tapping ? tap : null);
      if (!finger) return steerFromKeys(keys) ?? (tapping ? steerFromKeys(tapKeys) : null);
      const spot = floorAt(finger.x, finger.y);
      if (!spot) return null;
      return steerFromFinger(spot, character, Math.hypot(finger.x - onPage.x, finger.y - onPage.y));
    },
    finger: latest,
    active: () => fingers.size > 0 || Object.values(keys).some(Boolean),
    onPress(listener) {
      press = listener;
    },
    release,
    dispose() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('contextmenu', stopMenu);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', release);
    },
  };
}
