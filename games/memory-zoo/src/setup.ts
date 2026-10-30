export type Mode = 'together' | 'solo';

export const SETUP_KEY = 'memory-zoo:setup';
export const BESTS_KEY = 'memory-zoo:bests';

export const BOARD_SIZES = [
  { pairs: 6, label: 'Easy', emoji: '🐭', spoken: 'Easy! Six pairs.' },
  { pairs: 8, label: 'Medium', emoji: '🦊', spoken: 'Medium! Eight pairs.' },
  { pairs: 12, label: 'Hard', emoji: '🦁', spoken: 'Hard! Twelve pairs.' },
] as const;

export const PLAYER_NAMES = ['Kid', 'Grown-up'] as const;
export const SOLO_NAME = 'You';

/** The faces a player can swap to. The list starts with the two defaults. */
export const FACES = ['🧒', '🧑', '👧', '👦', '👩', '👨', '👵', '👴', '🦸', '🧙'] as const;

export interface Setup {
  mode: Mode;
  pairs: number;
  faces: [string, string];
}

/** Lowest flip count per board size, keyed by pairs. Sizes not played yet are absent. */
export type Bests = Record<string, number>;

export const DEFAULT_SETUP: Setup = { mode: 'together', pairs: 6, faces: [FACES[0], FACES[1]] };

function isFace(value: unknown): value is string {
  return typeof value === 'string' && (FACES as readonly string[]).includes(value);
}

function readFaces(value: unknown): [string, string] {
  if (!Array.isArray(value)) return DEFAULT_SETUP.faces;
  const [first, second] = value as unknown[];
  if (!isFace(first) || !isFace(second) || first === second) return DEFAULT_SETUP.faces;
  return [first, second];
}

/** Saved data can be old or edited by hand, so each field is checked on its way in. */
export function readSetup(saved: unknown): Setup {
  if (typeof saved !== 'object' || saved === null) return DEFAULT_SETUP;
  const { mode, pairs, faces } = saved as Partial<Record<keyof Setup, unknown>>;
  return {
    mode: mode === 'solo' ? 'solo' : 'together',
    pairs: BOARD_SIZES.find((size) => size.pairs === pairs)?.pairs ?? DEFAULT_SETUP.pairs,
    faces: readFaces(faces),
  };
}

export function readBests(saved: unknown): Bests {
  if (typeof saved !== 'object' || saved === null) return {};
  const bests: Bests = {};
  for (const { pairs } of BOARD_SIZES) {
    const flips = (saved as Bests)[pairs];
    if (Number.isInteger(flips) && flips >= pairs * 2) bests[pairs] = flips;
  }
  return bests;
}

/** Fewer flips is better. The first finish on a board is always a new best. */
export function recordBest(bests: Bests, pairs: number, flips: number): { bests: Bests; isNew: boolean } {
  const previous = bests[pairs];
  if (previous !== undefined && previous <= flips) return { bests, isNew: false };
  return { bests: { ...bests, [pairs]: flips }, isNew: true };
}

/** The next face in the list, skipping the one the other player already has. */
export function nextFace(current: string, other: string): string {
  const start = (FACES as readonly string[]).indexOf(current);
  for (let step = 1; step < FACES.length; step++) {
    const face = FACES[(start + step) % FACES.length];
    if (face !== other) return face;
  }
  return current;
}
