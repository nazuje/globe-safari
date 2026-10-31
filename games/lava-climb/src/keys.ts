export type Button = 'left' | 'right' | 'jump' | 'dash';

const KEYS: Record<string, Button> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyX: 'dash',
  KeyZ: 'dash',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
};

export const buttonOf = (code: string): Button | undefined => KEYS[code];

/** Everything held down, by fingers and keys together. The newest of left and right wins. */
export class Held {
  private readonly sources = new Map<string, Button>();
  private order = 0;
  private readonly lastPressed: Record<'left' | 'right', number> = { left: 0, right: 0 };

  press(source: string, button: Button | null): void {
    const before = this.sources.get(source);
    if (before === button) return;
    if (button === null) {
      this.sources.delete(source);
      return;
    }
    this.sources.set(source, button);
    if (button === 'left' || button === 'right') {
      this.order += 1;
      this.lastPressed[button] = this.order;
    }
  }

  release(source: string): void {
    this.sources.delete(source);
  }

  releaseAll(): void {
    this.sources.clear();
  }

  isSource(source: string): boolean {
    return this.sources.has(source);
  }

  has(button: Button): boolean {
    for (const held of this.sources.values()) if (held === button) return true;
    return false;
  }

  get dir(): -1 | 0 | 1 {
    const left = this.has('left');
    const right = this.has('right');
    if (left && right) return this.lastPressed.left > this.lastPressed.right ? -1 : 1;
    return left ? -1 : right ? 1 : 0;
  }
}
