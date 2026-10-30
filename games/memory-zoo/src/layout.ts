export interface Grid {
  cols: number;
  rows: number;
  size: number;
}

/**
 * The biggest square cards that fit the space. Only tidy grids are considered,
 * so every row is full. Past maxSize, the earlier (narrower) grid wins.
 */
export function bestGrid(count: number, width: number, height: number, gap: number, maxSize: number): Grid {
  let best: Grid = { cols: count, rows: 1, size: 0 };
  for (let cols = 1; cols <= count; cols++) {
    if (count % cols !== 0) continue;
    const rows = count / cols;
    const fitsWidth = (width - gap * (cols - 1)) / cols;
    const fitsHeight = (height - gap * (rows - 1)) / rows;
    const size = Math.floor(Math.min(fitsWidth, fitsHeight, maxSize));
    if (size > best.size) best = { cols, rows, size };
  }
  return best;
}
