export interface ShelfLayout {
  cols: number;
  rows: number;
  slot: number;
  /** Stage height the shelf takes up, from the bottom. */
  height: number;
  left: number;
}

const SIDE = 12;
const PADDING = 10;
const SMALLEST_SLOT = 33;
const BIGGEST_SLOT = 54;
const MOST_ROWS = 4;
/** A phone on its side: the shelf shrinks to one thin row, so the bubbles keep the screen. */
const SHORT_STAGE = 480;
const SHORT_SMALLEST_SLOT = 26;
const SHORT_BIGGEST_SLOT = 34;

/** Uses as few rows as keep the friends recognisable, so the bubbles get the screen. */
export function shelfLayout(width: number, count: number, stageHeight: number): ShelfLayout {
  const short = stageHeight < SHORT_STAGE;
  const smallest = short ? SHORT_SMALLEST_SLOT : SMALLEST_SLOT;
  const room = width - SIDE * 2;
  let rows = 1;
  while (rows < MOST_ROWS && room / Math.ceil(count / rows) < smallest) rows += 1;
  const cols = Math.ceil(count / rows);
  const slot = Math.min(short ? SHORT_BIGGEST_SLOT : BIGGEST_SLOT, room / cols);
  return { cols, rows, slot, height: rows * slot + PADDING * 2, left: (width - cols * slot) / 2 };
}

/** The centre of a friend's own place on the shelf, measured from the top of the stage. */
export function slotCentre(layout: ShelfLayout, index: number, stageHeight: number): { x: number; y: number } {
  const col = index % layout.cols;
  const row = Math.floor(index / layout.cols);
  return {
    x: layout.left + (col + 0.5) * layout.slot,
    y: stageHeight - layout.height + PADDING + (row + 0.5) * layout.slot,
  };
}
