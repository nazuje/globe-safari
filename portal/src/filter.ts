import { SKILL_LABELS, type Game, type Mode, type Skill } from './games.ts';

export const AGES = [4, 6] as const;

export interface Filters {
  mode: Mode | 'all';
  age: (typeof AGES)[number] | 'all';
  skill: Skill | 'all';
}

export const NO_FILTERS: Filters = { mode: 'all', age: 'all', skill: 'all' };

/** The skills at least one game teaches, in the same steady order every time. */
export function skillsIn(games: readonly Game[]): Skill[] {
  const used = new Set(games.flatMap((game) => game.skills));
  return (Object.keys(SKILL_LABELS) as Skill[]).filter((skill) => used.has(skill));
}

/** Reads a range such as "4-9". Anything else gives null. */
export function parseAges(ages: string): { min: number; max: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(ages);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : null;
}

function suitsAge(game: Game, age: number): boolean {
  const range = parseAges(game.ages);
  return range !== null && range.min <= age && age <= range.max;
}

/** Every filter must agree for a game to show. */
export function applyFilter(games: readonly Game[], { mode, age, skill }: Filters): Game[] {
  return games.filter(
    (game) =>
      (mode === 'all' || game.modes.includes(mode)) &&
      (age === 'all' || suitsAge(game, age)) &&
      (skill === 'all' || game.skills.includes(skill)),
  );
}

/** A remembered filter can go stale when the registry changes, so it falls back to everything. */
export function restoreFilter<T>(saved: unknown, options: readonly T[]): T | 'all' {
  return options.find((option) => option === saved) ?? 'all';
}
