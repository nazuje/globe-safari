import type { Energy, Move } from './moves.ts';

export type Rng = () => number;

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** The rhythm of a parade: energetic and calm take turns, and the last move is always calm. */
export function energyPlan(count: number): Energy[] {
  return Array.from({ length: count }, (_, i) => ((count - 1 - i) % 2 === 0 ? 'calm' : 'energetic'));
}

/**
 * Unused moves, best first: the wanted energy before the other, and within
 * each, moves from the last game after ones the family hasn't just done.
 */
function candidates(moves: readonly Move[], energy: Energy, used: ReadonlySet<string>, recent: ReadonlySet<string>, rng: Rng): Move[] {
  const rank = (move: Move) => (move.energy === energy ? 0 : 2) + (recent.has(move.id) ? 1 : 0);
  return shuffled(
    moves.filter((move) => !used.has(move.id)),
    rng,
  ).sort((a, b) => rank(a) - rank(b));
}

/** A whole parade: no repeats, a mix of energetic and calm, ending calm. */
export function pickParade(moves: readonly Move[], count: number, rng: Rng, recent: readonly string[] = []): Move[] {
  const used = new Set<string>();
  const recentIds = new Set(recent);
  const parade: Move[] = [];
  for (const energy of energyPlan(Math.min(count, moves.length))) {
    const [move] = candidates(moves, energy, used, recentIds, rng);
    used.add(move.id);
    parade.push(move);
  }
  return parade;
}

/** The animals to offer in "You pick". Offering only the slot's energy keeps the parade's rhythm. */
export function pickChoices(moves: readonly Move[], energy: Energy, used: readonly string[], rng: Rng, recent: readonly string[] = [], howMany = 3): Move[] {
  return candidates(moves, energy, new Set(used), new Set(recent), rng).slice(0, howMany);
}

const between = (low: number, high: number, rng: Rng) => Math.round(low + rng() * (high - low));

/** How long the music plays in Freeze dance. Random, so the stop is a surprise. */
export const danceMs = (rng: Rng) => between(4000, 9000, rng);

/** How long everyone stays frozen before the music comes back. */
export const frozenMs = (rng: Rng) => between(2500, 4500, rng);
