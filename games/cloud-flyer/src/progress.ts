import { LEVEL_IDS, SURPRISE_KINDS, type LevelId, type SurpriseKind } from './course.ts';

/** Sparkle trails, earned by stars from landings. Trails change nothing in the game, so no child is locked out. */
export const TRAIL_STEPS = [0, 6, 15, 30, 50] as const;

export interface Progress {
  /** Stars from every landing so far. */
  stars: number;
  best: Record<LevelId, number>;
  found: SurpriseKind[];
  flightsSinceSurprise: number;
  flights: number;
}

export interface Landing {
  stars: number;
  score: number;
  levelId: LevelId;
  surprises: SurpriseKind[];
}

export interface LandingNews {
  progress: Progress;
  newBest: boolean;
  newTrail: boolean;
  newFinds: SurpriseKind[];
}

const whole = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/** Stored values can be anything an older version or a cleared browser left, so each is checked. */
export function cleanProgress(saved: unknown): Progress {
  const raw = (typeof saved === 'object' && saved !== null ? saved : {}) as Record<string, unknown>;
  const best = (typeof raw.best === 'object' && raw.best !== null ? raw.best : {}) as Record<string, unknown>;
  const found = Array.isArray(raw.found) ? raw.found : [];
  return {
    stars: whole(raw.stars),
    best: Object.fromEntries(LEVEL_IDS.map((id) => [id, whole(best[id])])) as Record<LevelId, number>,
    found: SURPRISE_KINDS.filter((kind) => found.includes(kind)),
    flightsSinceSurprise: whole(raw.flightsSinceSurprise),
    flights: whole(raw.flights),
  };
}

export function trailFor(stars: number): number {
  return TRAIL_STEPS.filter((step) => stars >= step).length - 1;
}

export function addLanding(before: Progress, landing: Landing): LandingNews {
  const stars = before.stars + landing.stars;
  const newBest = landing.score > before.best[landing.levelId] && before.flights > 0;
  const newFinds = landing.surprises.filter((kind) => !before.found.includes(kind));
  return {
    progress: {
      stars,
      best: { ...before.best, [landing.levelId]: Math.max(before.best[landing.levelId], landing.score) },
      found: SURPRISE_KINDS.filter((kind) => before.found.includes(kind) || landing.surprises.includes(kind)),
      flightsSinceSurprise: landing.surprises.length > 0 ? 0 : before.flightsSinceSurprise + 1,
      flights: before.flights + 1,
    },
    newBest,
    newTrail: trailFor(stars) > trailFor(before.stars),
    newFinds,
  };
}
