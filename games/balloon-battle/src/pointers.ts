import type { Side } from './round.ts';

/**
 * Which fingers are down right now. A browser sends one pointerdown per finger,
 * and pointer ids are reused once a finger lifts, so a press only counts when its
 * id isn't already down. Each finger belongs to the half it landed on, however
 * far it slides.
 */
export class PointerLedger {
  private readonly held = new Map<number, Side>();

  /** True for a new finger. A repeat of a finger already down returns false. */
  press(id: number, side: Side): boolean {
    if (this.held.has(id)) return false;
    this.held.set(id, side);
    return true;
  }

  release(id: number): void {
    this.held.delete(id);
  }

  /** Forgets every finger, for when the page may have missed a lift. */
  clear(): void {
    this.held.clear();
  }

  heldOn(side: Side): number {
    return [...this.held.values()].filter((held) => held === side).length;
  }
}
