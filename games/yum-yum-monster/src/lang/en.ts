import type { Color, FoodId } from '../foods.ts';
import type { MonsterId } from '../monsters.ts';
import type { ReactionMood } from '../round.ts';
import { capitalize } from './shared.ts';

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

interface FoodWords {
  /** How the monster asks for one: "an apple". */
  a: string;
  /** Name for one, in a count: "one apple". */
  one: string;
  /** Name for many, in a count: "two apples". */
  many: string;
}

export const FOOD_WORDS: Record<FoodId, FoodWords> = {
  apple: { a: 'an apple', one: 'apple', many: 'apples' },
  strawberry: { a: 'a strawberry', one: 'strawberry', many: 'strawberries' },
  banana: { a: 'a banana', one: 'banana', many: 'bananas' },
  lemon: { a: 'a lemon', one: 'lemon', many: 'lemons' },
  pear: { a: 'a pear', one: 'pear', many: 'pears' },
  cucumber: { a: 'a cucumber', one: 'cucumber', many: 'cucumbers' },
  carrot: { a: 'a carrot', one: 'carrot', many: 'carrots' },
  orange: { a: 'an orange', one: 'orange', many: 'oranges' },
  grapes: { a: 'some grapes', one: 'grapes', many: 'grapes' },
  cookie: { a: 'a cookie', one: 'cookie', many: 'cookies' },
  pizza: { a: 'a pizza', one: 'pizza', many: 'pizzas' },
  egg: { a: 'an egg', one: 'egg', many: 'eggs' },
};

const FOOD_NAMES = Object.fromEntries(Object.entries(FOOD_WORDS).map(([food, words]) => [food, words.one])) as Record<FoodId, string>;

export const en = {
  title: 'Yum Yum Monster',
  description: 'Feed a cuddly hungry monster. A tap-only, spoken game for 4-year-olds that teaches listening, colors and counting to 10.',

  // Spoken.
  pick: 'Pick a monster!',
  hello: 'I am so hungry!',
  full: 'I am so full! Thank you!',
  again: 'More food?',
  /** "Three!", the word the monster shouts as it eats. */
  countAloud: (n: number): string => `${capitalize(NUMBER_WORDS[n] ?? String(n))}!`,
  wantFood: (food: FoodId, variant: number): string => {
    const { a } = FOOD_WORDS[food];
    return [`Feed me ${a}!`, `I want ${a}!`, `${capitalize(a)}, please!`][variant]!;
  },
  wantColor: (color: Color, variant: number): string =>
    [`Something ${color}, please!`, `I want something ${color}!`, `Feed me something ${color}!`][variant]!,
  wantCount: (food: FoodId, count: number, variant: number): string => {
    const { one, many } = FOOD_WORDS[food];
    const amount = `${NUMBER_WORDS[count]} ${count === 1 ? one : many}`;
    return [`I want ${amount}!`, `Feed me ${amount}!`, `${capitalize(amount)}, please!`][variant]!;
  },
  reactions: {
    mmm: 'Mmmm!',
    wiggle: 'Yum yum yum!',
    burp: 'Burp! Oops!',
    giggle: 'Hee hee! So tasty!',
  } as Record<ReactionMood, string>,
  sneezes: ['Ah-choo!', 'Yucky! Ah-choo!', 'Oh no! Ah-choo!'] as readonly string[],

  // Shown to grown-ups and read by screen readers.
  home: 'Back to Playroom',
  sayAgain: 'Say it again',
  changeMonster: 'Change monster or level',
  moreFood: 'More food',
  forGrownUps: 'For grown-ups.',
  chooseLevel: 'For grown-ups: choose a level',
  levels: {
    1: 'Level 1: name a food',
    2: 'Level 2: colors',
    3: 'Level 3: count to 3',
    4: 'Level 4: count to 5',
    5: 'Level 5: count to 10',
  },
  foodNames: FOOD_NAMES,
  monsters: {
    sky: 'Blue monster with horns',
    coral: 'Pink monster with round ears',
    grape: 'Purple monster with one big eye',
    leaf: 'Green monster with three eyes',
  } as Record<MonsterId, string>,
};

export type Text = typeof en;
