export const HAT_IDS = [
  'topHat',
  'bobble',
  'party',
  'bucket',
  'flowerPot',
  'cowboy',
  'chef',
  'viking',
  'unicorn',
  'propeller',
  'dino',
  'cake',
  'crown',
] as const;

export type HatId = (typeof HAT_IDS)[number];

/** Only golden snowmen wear this one. */
export const GOLDEN_HAT: HatId = 'crown';

const NEW_HATS_PER_ROUND = 2;
const OLD_HATS_PER_ROUND = 3;

function pickSome<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const left = [...items];
  const picked: T[] = [];
  while (picked.length < count && left.length > 0) {
    picked.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  }
  return picked;
}

/** The hats on heads this round. A couple are new, so the shelf takes several rounds to fill. */
export function roundHats(owned: readonly HatId[], rng: () => number): HatId[] {
  const everyday = HAT_IDS.filter((hat) => hat !== GOLDEN_HAT);
  const fresh = everyday.filter((hat) => !owned.includes(hat));
  const known = everyday.filter((hat) => owned.includes(hat));
  const picked = [...pickSome(fresh, NEW_HATS_PER_ROUND, rng), ...pickSome(known, OLD_HATS_PER_ROUND, rng)];
  return picked.length > 0 ? picked : [everyday[0]];
}

/** Whatever storage held, as a list of real hats with no repeats. */
export function cleanHats(saved: unknown): HatId[] {
  if (!Array.isArray(saved)) return [];
  return HAT_IDS.filter((hat) => saved.includes(hat));
}
