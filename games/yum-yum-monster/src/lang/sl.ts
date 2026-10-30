import { slCounted, slNumber, type SlNoun } from '@playroom/kit';
import { COLORS, FOODS, type Color, type FoodId } from '../foods.ts';
import type { ReactionMood } from '../round.ts';
import type { Text } from './en.ts';
import { capitalize, LINE_VARIANTS } from './shared.ts';

const BIGGEST_COUNT = 10;

// Every noun is in the accusative, because each request means "daj mi ...".
// Korenček, not korenje: korenje is the vegetable as a mass, and can't be counted.
const NOUNS: Record<Exclude<FoodId, 'grapes'>, SlNoun> = {
  apple: { gender: 'n', one: 'jabolko', two: 'jabolki', few: 'jabolka', many: 'jabolk' },
  strawberry: { gender: 'f', one: 'jagodo', two: 'jagodi', few: 'jagode', many: 'jagod' },
  banana: { gender: 'f', one: 'banano', two: 'banani', few: 'banane', many: 'banan' },
  lemon: { gender: 'f', one: 'limono', two: 'limoni', few: 'limone', many: 'limon' },
  pear: { gender: 'f', one: 'hruško', two: 'hruški', few: 'hruške', many: 'hrušk' },
  cucumber: { gender: 'f', one: 'kumaro', two: 'kumari', few: 'kumare', many: 'kumar' },
  carrot: { gender: 'm', one: 'korenček', two: 'korenčka', few: 'korenčke', many: 'korenčkov' },
  orange: { gender: 'f', one: 'pomarančo', two: 'pomaranči', few: 'pomaranče', many: 'pomaranč' },
  cookie: { gender: 'm', one: 'piškot', two: 'piškota', few: 'piškote', many: 'piškotov' },
  pizza: { gender: 'f', one: 'pico', two: 'pici', few: 'pice', many: 'pic' },
  egg: { gender: 'n', one: 'jajce', two: 'jajci', few: 'jajca', many: 'jajc' },
};

// Partitive genitive: nekaj rdečega.
const COLOR_WORDS: Record<Color, string> = {
  red: 'rdečega',
  yellow: 'rumenega',
  green: 'zelenega',
  orange: 'oranžnega',
  purple: 'vijoličnega',
};

// Grozdje is one mass, so it never takes a number. The two-word "Hočem grozdje!" would also be too short.
const GRAPE_LINES = ['Daj mi grozdje!', 'Hočem malo grozdja!', 'Malo grozdja, prosim!'];

function wantCount(food: FoodId, count: number, variant: number): string {
  // Grapes are never counted, and the game checks that, so this branch is only for the types.
  if (food === 'grapes') return GRAPE_LINES[variant]!;
  const amount = slCounted(count, NOUNS[food], 'acc');
  return [`Daj mi ${amount}!`, `Hočem ${amount}!`, `${capitalize(amount)}, prosim!`][variant]!;
}

// The voice spells out a word with no vowel, so "Mmmm!" comes out as "mə mə mə mə". These all read cleanly.
const REACTIONS: Record<ReactionMood, string> = {
  mmm: 'Oh, kako dobro!',
  wiggle: 'Njam, njam, njam!',
  burp: 'Rig! Rignila sem!',
  giggle: 'Hi hi, kakšna dobrota!',
};

export const sl: Text = {
  title: 'Lačna pošast',
  description: 'Nahrani ljubko lačno pošast. Govorjena igra za štiriletnike, ki uči poslušanje, barve in štetje do 10.',

  pick: 'Izberi si pošast!',
  hello: 'Tako sem lačna!',
  full: 'Tako sem sita! Hvala ti!',
  again: 'Mi daš še kaj?',
  // Counting bites out loud is bare counting, so it stays ena, dve, tri whatever the food's gender.
  countAloud: (n) => `${capitalize(slNumber(n, 'f'))}!`,
  wantFood: (food, variant) => wantCount(food, 1, variant),
  wantColor: (color, variant) => {
    const word = COLOR_WORDS[color];
    return [`Nekaj ${word}, prosim!`, `Hočem nekaj ${word}!`, `Daj mi nekaj ${word}!`][variant]!;
  },
  wantCount,
  reactions: REACTIONS,
  sneezes: ['Ačiha, ačiha, ačiha!', 'Bljak! Ačiha, ačiha!', 'Ojoj! Ačiha, ačiha!'],

  home: 'Domov',
  sayAgain: 'Povej še enkrat',
  changeMonster: 'Zamenjaj pošast ali stopnjo',
  moreFood: 'Še malo hrane',
  forGrownUps: 'Za odrasle.',
  chooseLevel: 'Za odrasle: izberi stopnjo',
  levels: {
    1: 'Stopnja 1: poimenuj hrano',
    2: 'Stopnja 2: barve',
    3: 'Stopnja 3: štetje do 3',
    4: 'Stopnja 4: štetje do 5',
    5: 'Stopnja 5: štetje do 10',
  },
  foodNames: {
    apple: 'jabolko',
    strawberry: 'jagoda',
    banana: 'banana',
    lemon: 'limona',
    pear: 'hruška',
    cucumber: 'kumara',
    carrot: 'korenček',
    orange: 'pomaranča',
    grapes: 'grozdje',
    cookie: 'piškot',
    pizza: 'pica',
    egg: 'jajce',
  },
  monsters: {
    sky: 'Modra pošast z rogovi',
    coral: 'Roza pošast z okroglimi ušesi',
    grape: 'Vijolična pošast z enim velikim očesom',
    leaf: 'Zelena pošast s tremi očmi',
  },
};

const COUNTS = Array.from({ length: BIGGEST_COUNT }, (_, i) => i + 1);

/** The numbers the monster shouts as it eats, one bite at a time. */
export function tallyLines(): string[] {
  return COUNTS.map(sl.countAloud);
}

function requestLines(): string[] {
  return LINE_VARIANTS.flatMap((variant) => [
    ...FOODS.map((food) => sl.wantFood(food.id, variant)),
    ...COLORS.map((color) => sl.wantColor(color, variant)),
    ...FOODS.filter((food) => food.countable).flatMap((food) => COUNTS.map((count) => sl.wantCount(food.id, count, variant))),
  ]);
}

/** Every line the game can say in Slovenian, including every counted combination. */
export function spokenLines(): string[] {
  const lines = [sl.pick, sl.hello, sl.full, sl.again, ...tallyLines(), ...Object.values(sl.reactions), ...sl.sneezes, ...requestLines()];
  return [...new Set(lines)];
}
