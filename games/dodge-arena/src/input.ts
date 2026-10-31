const KEYS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
const LEAP_KEYS = new Set(['Space', 'ShiftLeft', 'ShiftRight', 'Enter']);

export interface Controls {
  /** Where the finger or mouse is held, in screen pixels, or null. */
  held(): { x: number; y: number } | null;
  /** The arrow keys' direction, or null when none is down. */
  keys(): { x: number; z: number } | null;
  /** Called for each leap press while listening. */
  onLeap(listener: (() => void) | null): void;
  /** Forgets anything held, for between screens. */
  release(): void;
  dispose(): void;
}

/** Hold anywhere on the arena to run there, with a finger or a mouse. Arrows or WASD on a laptop, Space to leap. */
export function bindControls(surface: HTMLElement): Controls {
  const pointers = new Map<number, { x: number; y: number }>();
  const pressed = new Set<string>();
  let order: number[] = [];
  let leap: (() => void) | null = null;

  function down(event: PointerEvent): void {
    event.preventDefault();
    surface.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    order.push(event.pointerId);
  }

  function move(event: PointerEvent): void {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  function up(event: PointerEvent): void {
    pointers.delete(event.pointerId);
    order = order.filter((id) => id !== event.pointerId);
  }

  function keyDown(event: KeyboardEvent): void {
    if (event.code in KEYS) {
      event.preventDefault();
      pressed.add(event.code);
    } else if (LEAP_KEYS.has(event.code) && leap) {
      event.preventDefault();
      if (!event.repeat) leap();
    }
  }

  const keyUp = (event: KeyboardEvent): void => void pressed.delete(event.code);

  function release(): void {
    pointers.clear();
    pressed.clear();
    order = [];
  }

  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', up);
  surface.addEventListener('pointercancel', up);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', release);

  return {
    held() {
      const newest = order.at(-1);
      return newest === undefined ? null : (pointers.get(newest) ?? null);
    },
    keys() {
      let x = 0;
      let z = 0;
      for (const code of pressed) {
        const [keyX = 0, keyZ = 0] = KEYS[code] ?? [];
        x += keyX;
        z += keyZ;
      }
      const length = Math.hypot(x, z);
      return length ? { x: x / length, z: z / length } : null;
    },
    onLeap(listener) {
      leap = listener;
    },
    release,
    dispose() {
      surface.removeEventListener('pointerdown', down);
      surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up);
      surface.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', release);
    },
  };
}
