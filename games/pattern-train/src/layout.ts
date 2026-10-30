export interface TrainFit {
  columns: number;
  rows: number;
  /** Width of one car in pixels. */
  size: number;
}

export const GAP = 6;
export const ROW_GAP = 18;
/** A car is a little taller than wide, because of its wheels. */
export const CAR_HEIGHT = 1.14;
const MAX_SIZE = 128;
/** Another row has to win clearly: one long train reads better than two, if it's nearly as big. */
const WORTH_A_ROW = 1.15;
/** Big enough to play. Past this a pattern reads better in one unbroken line than in bigger cars. */
const ROOMY_SIZE = 88;

function sizeFor(cells: number, rows: number, width: number, height: number): number {
  const columns = Math.ceil(cells / rows);
  const wide = (width - (columns - 1) * GAP) / columns;
  const tall = (height - (rows - 1) * ROW_GAP) / rows / CAR_HEIGHT;
  return Math.floor(Math.min(MAX_SIZE, wide, tall));
}

/** Picks the biggest cars that fit, wrapping the train onto more tracks when that helps. */
export function fitTrain(cells: number, width: number, height: number): TrainFit {
  let best: TrainFit = { columns: cells, rows: 1, size: sizeFor(cells, 1, width, height) };
  for (let rows = 2; rows <= Math.min(4, cells) && best.size < ROOMY_SIZE; rows++) {
    const size = sizeFor(cells, rows, width, height);
    if (size > best.size * WORTH_A_ROW) best = { columns: Math.ceil(cells / rows), rows, size };
  }
  return best;
}
