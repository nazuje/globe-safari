export interface Point {
  x: number;
  y: number;
}

const FIRST_STONE = 0.3;
const STONE_SPACING = 75;
const MIN_STONES = 3;
const MAX_STONES = 6;

/** Where the feet land between two points: a gently curved line of stones, ending at the door. */
export function pathStones(from: Point, to: Point, bend: number): Point[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const count = Math.max(MIN_STONES, Math.min(MAX_STONES, Math.round(distance / STONE_SPACING)));
  const bow = { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend };

  return Array.from({ length: count }, (_, i) => {
    const t = FIRST_STONE + ((1 - FIRST_STONE) * i) / (count - 1);
    const rest = 1 - t;
    return {
      x: rest * rest * from.x + 2 * rest * t * bow.x + t * t * to.x,
      y: rest * rest * from.y + 2 * rest * t * bow.y + t * t * to.y,
    };
  });
}
