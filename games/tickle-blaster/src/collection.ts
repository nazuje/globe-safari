import { FRIENDS, type KindId } from './kinds.ts';
import { LEVEL_IDS, SPEED_IDS, type LevelId, type SpeedId } from './levels.ts';

/** What a device remembers. Levels never lock, so none of this ever gates anything. */
export interface Saved {
  /** Best score for each level and speed, under keys like "moon:easy". */
  best: Partial<Record<string, number>>;
  /** Most stars for each level, at any speed. */
  stars: Partial<Record<LevelId, number>>;
  /** How many times each friend has laughed. */
  met: Partial<Record<KindId, number>>;
}

export interface Run {
  levelId: LevelId;
  speedId: SpeedId;
  score: number;
  stars: number;
}

export function emptySaved(): Saved {
  return { best: {}, stars: {}, met: {} };
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Saved data comes from the device, so anything odd in it is dropped rather than trusted. */
export function cleanSaved(raw: unknown): Saved {
  const source = record(raw);
  const best = record(source.best);
  const stars = record(source.stars);
  const met = record(source.met);
  const clean = emptySaved();
  for (const level of LEVEL_IDS) {
    const earned = Math.min(3, count(stars[level]));
    if (earned > 0) clean.stars[level] = earned;
    for (const speed of SPEED_IDS) {
      const score = count(best[`${level}:${speed}`]);
      if (score > 0) clean.best[`${level}:${speed}`] = score;
    }
  }
  for (const friend of FRIENDS) {
    const times = count(met[friend]);
    if (times > 0) clean.met[friend] = times;
  }
  return clean;
}

export function meetFriend(saved: Saved, friend: KindId): { saved: Saved; isNew: boolean } {
  const times = saved.met[friend] ?? 0;
  return { saved: { ...saved, met: { ...saved.met, [friend]: times + 1 } }, isNew: times === 0 };
}

export function recordRun(saved: Saved, run: Run): { saved: Saved; newBest: boolean } {
  const key = `${run.levelId}:${run.speedId}`;
  const before = saved.best[key] ?? 0;
  const newBest = run.score > before;
  return {
    saved: {
      ...saved,
      best: { ...saved.best, [key]: Math.max(before, run.score) },
      stars: { ...saved.stars, [run.levelId]: Math.max(saved.stars[run.levelId] ?? 0, run.stars) },
    },
    // A first game has nothing to beat, so "new record" only means something from the second go.
    newBest: newBest && before > 0,
  };
}

/** The best score on a level at any speed, for the picker. */
export function bestOnLevel(saved: Saved, level: LevelId): number {
  return Math.max(0, ...SPEED_IDS.map((speed) => saved.best[`${level}:${speed}`] ?? 0));
}

export function friendsMet(saved: Saved): number {
  return FRIENDS.filter((friend) => (saved.met[friend] ?? 0) > 0).length;
}
