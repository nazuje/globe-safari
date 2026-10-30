/**
 * The paint science. Everything here is pure, and every color comes from the
 * lookup tables below, because averaging RGB values gives muddy wrong answers
 * (red + yellow would come out a dull tan).
 *
 * How a beaker of paint gets its color. A "part" is one tap on a paint pot.
 *
 * 1. Red, yellow and blue choose the family:
 *      red + yellow = orange, yellow + blue = green, red + blue = purple,
 *      all three = brown. (So red + green is brown too: green is yellow + blue.)
 * 2. One number rules every ratio: a paint OUTWEIGHS another when it has at
 *    least 3 times the parts. If one of two colors outweighs the other, the mix
 *    leans its way: lots of red with a little yellow is red-orange.
 * 3. White that is outweighed by the strongest color is only a drop, and it
 *    doesn't show. Any other white lightens the family: red + white = pink.
 * 4. Black is much stronger than white, so any black at all darkens the family:
 *    red + black = maroon. Darkened orange is brown.
 * 5. White and black together make a soft, muted color: red + white + black is
 *    dusty rose. Leaning (rule 2) only applies when no white or black shows.
 * 6. With no colors at all, white + black = grey, and the same ratio rule
 *    gives light grey or dark grey.
 */

export const PAINTS = ['red', 'yellow', 'blue', 'white', 'black'] as const;
export type Paint = (typeof PAINTS)[number];

/** How many parts of each paint are in the beaker. */
export type Parts = Partial<Record<Paint, number>>;

type HueFamily = 'red' | 'yellow' | 'blue' | 'orange' | 'green' | 'purple' | 'brown';
export type Family = HueFamily | 'grey' | 'white' | 'black';
export type Tone = 'pure' | 'light' | 'dark' | 'muted';

export interface NamedColor {
  /** Lower case, ready for the middle of a sentence. */
  name: string;
  hex: string;
  family: Family;
  tone: Tone;
}

export const COLORS = {
  red: { name: 'red', hex: '#e2232e', family: 'red', tone: 'pure' },
  yellow: { name: 'yellow', hex: '#ffd60a', family: 'yellow', tone: 'pure' },
  blue: { name: 'blue', hex: '#1f5fd8', family: 'blue', tone: 'pure' },
  white: { name: 'white', hex: '#ffffff', family: 'white', tone: 'pure' },
  black: { name: 'black', hex: '#1d1b22', family: 'black', tone: 'pure' },

  orange: { name: 'orange', hex: '#ff8a00', family: 'orange', tone: 'pure' },
  green: { name: 'green', hex: '#2aa84a', family: 'green', tone: 'pure' },
  purple: { name: 'purple', hex: '#7b2fbe', family: 'purple', tone: 'pure' },
  brown: { name: 'brown', hex: '#7c4a21', family: 'brown', tone: 'pure' },

  redOrange: { name: 'red orange', hex: '#f2541b', family: 'orange', tone: 'pure' },
  golden: { name: 'golden yellow', hex: '#ffb300', family: 'orange', tone: 'pure' },
  lime: { name: 'lime green', hex: '#9ccc1f', family: 'green', tone: 'pure' },
  teal: { name: 'teal', hex: '#0d8f80', family: 'green', tone: 'pure' },
  magenta: { name: 'magenta', hex: '#b5179e', family: 'purple', tone: 'pure' },
  indigo: { name: 'indigo', hex: '#4a2bb8', family: 'purple', tone: 'pure' },

  pink: { name: 'pink', hex: '#ff8fb3', family: 'red', tone: 'light' },
  paleYellow: { name: 'pale yellow', hex: '#fff3a3', family: 'yellow', tone: 'light' },
  lightBlue: { name: 'light blue', hex: '#9ad3ff', family: 'blue', tone: 'light' },
  peach: { name: 'peach', hex: '#ffc299', family: 'orange', tone: 'light' },
  mint: { name: 'mint', hex: '#a3ebc3', family: 'green', tone: 'light' },
  lilac: { name: 'lilac', hex: '#cdb4f2', family: 'purple', tone: 'light' },
  tan: { name: 'tan', hex: '#cfa77c', family: 'brown', tone: 'light' },

  maroon: { name: 'maroon', hex: '#7a1530', family: 'red', tone: 'dark' },
  olive: { name: 'olive', hex: '#6e6a1e', family: 'yellow', tone: 'dark' },
  navy: { name: 'navy blue', hex: '#1b2a6b', family: 'blue', tone: 'dark' },
  darkGreen: { name: 'dark green', hex: '#14532d', family: 'green', tone: 'dark' },
  darkPurple: { name: 'dark purple', hex: '#3e1a5e', family: 'purple', tone: 'dark' },
  darkBrown: { name: 'dark brown', hex: '#3b2414', family: 'brown', tone: 'dark' },

  dustyRose: { name: 'dusty rose', hex: '#b5727f', family: 'red', tone: 'muted' },
  khaki: { name: 'khaki', hex: '#b8ad7a', family: 'yellow', tone: 'muted' },
  slateBlue: { name: 'slate blue', hex: '#6f8ba8', family: 'blue', tone: 'muted' },
  sage: { name: 'sage green', hex: '#8fa88e', family: 'green', tone: 'muted' },
  mauve: { name: 'mauve', hex: '#a083a8', family: 'purple', tone: 'muted' },
  taupe: { name: 'taupe', hex: '#9a8877', family: 'brown', tone: 'muted' },

  grey: { name: 'grey', hex: '#8f9096', family: 'grey', tone: 'pure' },
  lightGrey: { name: 'light grey', hex: '#c8c9ce', family: 'grey', tone: 'pure' },
  darkGrey: { name: 'dark grey', hex: '#55565c', family: 'grey', tone: 'pure' },
} as const satisfies Record<string, NamedColor>;

export type ColorId = keyof typeof COLORS;

/** What white, black, or both do to each family (rules 3 to 5). */
const TONES: Record<HueFamily, Record<Exclude<Tone, 'pure'>, ColorId>> = {
  red: { light: 'pink', dark: 'maroon', muted: 'dustyRose' },
  yellow: { light: 'paleYellow', dark: 'olive', muted: 'khaki' },
  blue: { light: 'lightBlue', dark: 'navy', muted: 'slateBlue' },
  orange: { light: 'peach', dark: 'brown', muted: 'tan' },
  green: { light: 'mint', dark: 'darkGreen', muted: 'sage' },
  purple: { light: 'lilac', dark: 'darkPurple', muted: 'mauve' },
  brown: { light: 'tan', dark: 'darkBrown', muted: 'taupe' },
};

const OUTWEIGHS = 3;

type Lean = 'first' | 'even' | 'second';

function lean(first: number, second: number): Lean {
  if (first >= second * OUTWEIGHS) return 'first';
  if (second >= first * OUTWEIGHS) return 'second';
  return 'even';
}

const ORANGES: Record<Lean, ColorId> = { first: 'redOrange', even: 'orange', second: 'golden' };
const GREENS: Record<Lean, ColorId> = { first: 'lime', even: 'green', second: 'teal' };
const PURPLES: Record<Lean, ColorId> = { first: 'magenta', even: 'purple', second: 'indigo' };
const GREYS: Record<Lean, ColorId> = { first: 'lightGrey', even: 'grey', second: 'darkGrey' };

function hueFamily(red: number, yellow: number, blue: number): HueFamily {
  if (red > 0 && yellow > 0 && blue > 0) return 'brown';
  if (red > 0 && yellow > 0) return 'orange';
  if (yellow > 0 && blue > 0) return 'green';
  if (red > 0 && blue > 0) return 'purple';
  if (red > 0) return 'red';
  return yellow > 0 ? 'yellow' : 'blue';
}

function unshadedColor(family: HueFamily, red: number, yellow: number, blue: number): ColorId {
  if (family === 'orange') return ORANGES[lean(red, yellow)];
  if (family === 'green') return GREENS[lean(yellow, blue)];
  if (family === 'purple') return PURPLES[lean(red, blue)];
  return family;
}

function neutralColor(white: number, black: number): ColorId | null {
  if (white > 0 && black > 0) return GREYS[lean(white, black)];
  if (white > 0) return 'white';
  return black > 0 ? 'black' : null;
}

/** The named color of a beaker of paint, or null when it is empty. */
export function mix(parts: Parts): ColorId | null {
  const { red = 0, yellow = 0, blue = 0, white = 0, black = 0 } = parts;
  const strongest = Math.max(red, yellow, blue);
  if (strongest === 0) return neutralColor(white, black);

  const family = hueFamily(red, yellow, blue);
  const whiteShows = white > 0 && strongest < white * OUTWEIGHS;
  if (whiteShows && black > 0) return TONES[family].muted;
  if (black > 0) return TONES[family].dark;
  if (whiteShows) return TONES[family].light;
  return unshadedColor(family, red, yellow, blue);
}

export function addParts(a: Parts, b: Parts): Parts {
  const total: Parts = {};
  for (const paint of PAINTS) {
    const parts = (a[paint] ?? 0) + (b[paint] ?? 0);
    if (parts > 0) total[paint] = parts;
  }
  return total;
}

export function totalParts(parts: Parts): number {
  return PAINTS.reduce((sum, paint) => sum + (parts[paint] ?? 0), 0);
}

/**
 * Close enough to count in Make This Color: a little more red in an orange still
 * looks orange to a six year old, so leaning never costs a win.
 */
export function sameColor(a: ColorId, b: ColorId): boolean {
  return COLORS[a].family === COLORS[b].family && COLORS[a].tone === COLORS[b].tone;
}

/** Small print for grown-ups, such as "2 red + 1 yellow". */
export function recipeText(parts: Parts): string {
  return PAINTS.filter((paint) => (parts[paint] ?? 0) > 0)
    .map((paint) => `${parts[paint]} ${paint}`)
    .join(' + ');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
