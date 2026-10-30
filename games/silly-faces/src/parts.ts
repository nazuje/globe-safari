/** Everything a creature can be made of. Pure data, so lang/sl.ts and the tests can read it too. */

export const SHAPES = ['round', 'tall', 'pear', 'cloud'] as const;
export const COLORS = ['teal', 'coral', 'sun', 'grape', 'leaf', 'sky'] as const;
/** Only an inside-out surprise paints these, so they are worth saving to the wall. */
export const RARE_COLORS = ['gold', 'rainbow', 'galaxy'] as const;
export const EYES = ['friendly', 'one', 'three', 'googly', 'sleepy', 'sparkly'] as const;
export const MOUTHS = ['smile', 'huge', 'fangs', 'tongue', 'kissy', 'oh'] as const;
export const HAIRS = ['none', 'tuft', 'spikes', 'curls', 'bunches', 'horns'] as const;
export const HATS = ['none', 'crown', 'cowboy', 'pirate', 'wizard', 'flower', 'helmet', 'unicorn', 'antennae'] as const;
export const HELD = ['none', 'balloon', 'icecream', 'wrench', 'wand', 'teddy', 'guitar'] as const;

export type Shape = (typeof SHAPES)[number];
export type Color = (typeof COLORS)[number] | (typeof RARE_COLORS)[number];
export type Eyes = (typeof EYES)[number];
export type Mouth = (typeof MOUTHS)[number];
export type Hair = (typeof HAIRS)[number];
export type Hat = (typeof HATS)[number];
export type Held = (typeof HELD)[number];

export interface Look {
  shape: Shape;
  color: Color;
  eyes: Eyes;
  mouth: Mouth;
  hair: Hair;
  hat: Hat;
  held: Held;
}

export type Part = keyof Look;

export const PARTS: readonly Part[] = ['shape', 'color', 'eyes', 'mouth', 'hair', 'hat', 'held'];

/** The options a child can tap for each part. */
export const OPTIONS: { [P in Part]: readonly Look[P][] } = {
  shape: SHAPES,
  color: COLORS,
  eyes: EYES,
  mouth: MOUTHS,
  hair: HAIRS,
  hat: HATS,
  held: HELD,
};

export const TABS = ['body', 'eyes', 'mouth', 'hair', 'hat', 'held'] as const;
export type Tab = (typeof TABS)[number];

/** The parts each picture tab changes. The body tab holds two, in two rows. */
export const TAB_PARTS: Record<Tab, readonly Part[]> = {
  body: ['shape', 'color'],
  eyes: ['eyes'],
  mouth: ['mouth'],
  hair: ['hair'],
  hat: ['hat'],
  held: ['held'],
};

export const FIRST_LOOK: Look = {
  shape: 'round',
  color: 'teal',
  eyes: 'sparkly',
  mouth: 'huge',
  hair: 'tuft',
  hat: 'crown',
  held: 'balloon',
};

type Random = () => number;

export function pick<T>(items: readonly T[], random: Random = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

/** A fresh creature. Shuffling skips the rare colors, which only a surprise paints. */
export function randomLook(random: Random = Math.random): Look {
  return {
    shape: pick(SHAPES, random),
    color: pick(COLORS, random),
    eyes: pick(EYES, random),
    mouth: pick(MOUTHS, random),
    hair: pick(HAIRS, random),
    hat: pick(HATS, random),
    held: pick(HELD, random),
  };
}

export function sameLook(a: Look, b: Look): boolean {
  return PARTS.every((part) => a[part] === b[part]);
}

function known<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Saved data can be old or broken, so everything read back goes through here. */
export function cleanLook(saved: unknown, fallback: Look = FIRST_LOOK): Look {
  const look = (typeof saved === 'object' && saved !== null ? saved : {}) as Partial<Record<Part, unknown>>;
  return {
    shape: known(look.shape, SHAPES, fallback.shape),
    color: known<Color>(look.color, [...COLORS, ...RARE_COLORS], fallback.color),
    eyes: known(look.eyes, EYES, fallback.eyes),
    mouth: known(look.mouth, MOUTHS, fallback.mouth),
    hair: known(look.hair, HAIRS, fallback.hair),
    hat: known(look.hat, HATS, fallback.hat),
    held: known(look.held, HELD, fallback.held),
  };
}
