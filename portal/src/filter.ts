import { SKILL_LABELS, type Game, type Skill } from './games.ts';

export type Filter = Skill | 'all';

/** The skills at least one game teaches, in the same steady order every time. */
export function skillsIn(games: readonly Game[]): Skill[] {
  const used = new Set(games.flatMap((game) => game.skills));
  return (Object.keys(SKILL_LABELS) as Skill[]).filter((skill) => used.has(skill));
}

export function applyFilter(games: readonly Game[], filter: Filter): Game[] {
  return filter === 'all' ? [...games] : games.filter((game) => game.skills.includes(filter));
}

/** A remembered filter can go stale when the registry changes, so it falls back to everything. */
export function restoreFilter(saved: unknown, skills: readonly Skill[]): Filter {
  return skills.find((skill) => skill === saved) ?? 'all';
}
