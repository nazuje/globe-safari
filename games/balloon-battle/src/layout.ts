export type Split = 'stacked' | 'columns';

export interface Layout {
  split: Split;
  /** Whether the first half is turned 180 degrees to face the player across the table. */
  flipFirst: boolean;
}

/**
 * Upright side-by-side players share a screen left and right, in either
 * orientation. Opposite players on a tall screen sit at its two short ends, so the
 * halves stack. Opposite players on a wide screen sit at its two long edges.
 */
export function layoutFor(width: number, height: number, opposite: boolean): Layout {
  return { split: opposite && height > width ? 'stacked' : 'columns', flipFirst: opposite };
}

const TABLET_SHORT_SIDE = 600;

/** Tablets lie flat between two players. Phones and laptops don't, and two people hold one side by side. */
export function defaultOpposite(screenWidth: number, screenHeight: number, touch: boolean): boolean {
  return touch && Math.min(screenWidth, screenHeight) >= TABLET_SHORT_SIDE;
}
