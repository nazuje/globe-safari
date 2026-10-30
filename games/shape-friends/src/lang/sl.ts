import type { SlGender } from '@playroom/kit';
import {
  HOME_COLOR,
  NAMED_COLORS,
  type ColorName,
  type Door,
  type Friend,
  type LevelId,
  type Question,
  type ShapeName,
  type SizeName,
} from '../rounds.ts';
import { STICKERS, type Accessory, type Sticker } from '../stickers.ts';
import type { Text } from './en.ts';

/** An adjective's three singular forms. "Vrata" is neuter plural, whose form always matches the feminine one. */
type Adjective = Record<SlGender, string>;

const SHAPES: Record<ShapeName, { name: string; gender: SlGender }> = {
  circle: { name: 'krog', gender: 'm' },
  square: { name: 'kvadrat', gender: 'm' },
  triangle: { name: 'trikotnik', gender: 'm' },
  star: { name: 'zvezda', gender: 'f' },
  heart: { name: 'srce', gender: 'n' },
  rectangle: { name: 'pravokotnik', gender: 'm' },
  oval: { name: 'oval', gender: 'm' },
  diamond: { name: 'romb', gender: 'm' },
};

const COLORS: Record<ColorName, Adjective> = {
  red: { m: 'rdeč', f: 'rdeča', n: 'rdeče' },
  blue: { m: 'moder', f: 'modra', n: 'modro' },
  yellow: { m: 'rumen', f: 'rumena', n: 'rumeno' },
  green: { m: 'zelen', f: 'zelena', n: 'zeleno' },
  purple: { m: 'vijoličen', f: 'vijolična', n: 'vijolično' },
  orange: { m: 'oranžen', f: 'oranžna', n: 'oranžno' },
  pink: { m: 'rožnat', f: 'rožnata', n: 'rožnato' },
  teal: { m: 'turkizen', f: 'turkizna', n: 'turkizno' },
};

const SIZES: Record<SizeName, Adjective> = {
  big: { m: 'velik', f: 'velika', n: 'veliko' },
  middle: { m: 'srednji', f: 'srednja', n: 'srednje' },
  small: { m: 'majhen', f: 'majhna', n: 'majhno' },
};

// The instrumental after "s" or "z": "s" goes before a voiceless sound, and "z" before anything else.
const WEARING: Record<Accessory, string> = {
  none: '',
  hat: ' s klobukom',
  bow: ' s pentljo',
  crown: ' s krono',
  glasses: ' z očali',
};

const LEVEL_LABELS: Record<LevelId, string> = {
  1: 'Krog, kvadrat, trikotnik',
  2: 'Dodamo zvezdo, srce, pravokotnik',
  3: 'Dodamo oval in romb',
  4: 'Ista oblika, nove velikosti in barve',
  5: 'Razvrščanje po barvi ali velikosti',
};

function capitalized(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

/** The adjective a level 5 door is sorted by. */
function ruleWord(door: Exclude<Door, { kind: 'shape' }>): Adjective {
  return door.kind === 'color' ? COLORS[door.color] : SIZES[door.size];
}

/** "rdeča zvezda", with every adjective agreeing with the shape. */
function described(shape: ShapeName, ...adjectives: readonly Adjective[]): string {
  const { name, gender } = SHAPES[shape];
  return [...adjectives.map((adjective) => adjective[gender]), name].join(' ');
}

function disguised(friend: Friend): string {
  return friend.size === 'middle'
    ? described(friend.shape)
    : described(friend.shape, SIZES[friend.size], COLORS[friend.color]);
}

export const sl: Text = {
  title: 'Prijatelji oblik',
  description: 'Prijazne oblike potrebujejo pomoč, da pridejo domov. Igra za štiriletnike, ki uči imena oblik, velikosti, barve in razvrščanje.',
  home: 'Nazaj na igre',
  play: 'Igraj',
  keepPlaying: 'Igraj naprej',
  playAgain: 'Igraj še enkrat',
  pause: 'Premor, za odrasle',
  stickerBook: 'Knjiga nalepk',
  closeBook: 'Zapri knjigo nalepk',
  friendLabel: 'Prijatelj. Tapni, da ga požgečkaš.',
  sayAgain: 'Povej še enkrat',
  levelLabel: (id) => `Stopnja ${id}: ${LEVEL_LABELS[id]}`,
  // "Od" takes the genitive, so the number never changes the word.
  stickerCount: (have, total) => `${have} od ${total} nalepk`,

  promptLine({ friend, doors, answer }: Question) {
    const right = doors[answer];
    if (right.kind === 'shape') return `Jaz sem ${disguised(friend)}!`;
    const rule = ruleWord(right);
    return `Jaz sem ${described(friend.shape, rule)}! Poišči ${rule.f} vrata!`;
  },

  cheerLine({ friend, doors, answer }: Question) {
    const right = doors[answer];
    const who = right.kind === 'shape' ? SHAPES[friend.shape].name : described(friend.shape, ruleWord(right));
    return `${capitalized(who)} je doma!`;
  },

  stickerLine: ({ friend, accessory }: Sticker) =>
    `Jaz sem ${described(friend.shape, COLORS[friend.color])}${WEARING[accessory]}!`,

  doorLabel: (door) => (door.kind === 'shape' ? `vrata za ${SHAPES[door.shape].name}` : `${ruleWord(door).f} vrata`),

  wrongLines: ['To niso moja vrata!', 'Ojoj! To niso moja vrata!', 'Hopla! To niso moja vrata!'],
  giggleLines: ['Hi hi! To žgečka!', 'Ha ha! Živjo, živjo!', 'Kuku! Tukaj sem!'],
  hintLine: 'To niso moja vrata! Poskusi tukaj!',
  introLine: 'Pomagaj prijateljem priti domov!',
  playLine: 'Tapni in se igraj!',
  partyLine: 'Vsi so doma! Juhu!',
  newStickerLine: 'Nova nalepka zate!',
  oldStickerLine: 'Tvoj prijatelj je spet tukaj!',
};

const ALL_SHAPES = Object.keys(HOME_COLOR) as ShapeName[];
const RULE_DOORS: readonly Door[] = [
  ...NAMED_COLORS.map((color): Door => ({ kind: 'color', color })),
  { kind: 'size', size: 'big' },
  { kind: 'size', size: 'small' },
];

/** A question for one friend whose right door is the given one. */
function asked(friend: Friend, door: Door): Question {
  return { friend, doors: [door], answer: 0 };
}

/** Every line a friend can say: levels 1 to 3 by name, level 4 in disguise, level 5 by the rule. */
function questions(): Question[] {
  const named = ALL_SHAPES.map((shape) =>
    asked({ shape, color: HOME_COLOR[shape], size: 'middle' }, { kind: 'shape', shape }),
  );
  const sizes = ['big', 'small'] as const;
  const dressed = ALL_SHAPES.flatMap((shape) =>
    NAMED_COLORS.flatMap((color) => sizes.map((size) => asked({ shape, color, size }, { kind: 'shape', shape }))),
  );
  const sorted = ALL_SHAPES.flatMap((shape) =>
    RULE_DOORS.map((door) => asked({ shape, color: 'red', size: 'middle' }, door)),
  );
  return [...named, ...dressed, ...sorted];
}

/** Every line the game can say in Slovenian, including every combination of shape, color and size. */
export function spokenLines(): string[] {
  return [
    ...questions().flatMap((question) => [sl.promptLine(question), sl.cheerLine(question)]),
    ...STICKERS.map(sl.stickerLine),
    ...sl.wrongLines,
    ...sl.giggleLines,
    sl.hintLine,
    sl.introLine,
    sl.playLine,
    sl.partyLine,
    sl.newStickerLine,
    sl.oldStickerLine,
  ];
}
