export type Color = 'red' | 'yellow' | 'green' | 'orange' | 'purple';

export const COLORS: readonly Color[] = ['red', 'yellow', 'green', 'orange', 'purple'];

export interface Food {
  id: string;
  emoji: string;
  /** How the monster asks for one: "an apple". */
  a: string;
  /** Name for one, in a count: "one apple". */
  one: string;
  /** Name for many, in a count: "two apples". */
  many: string;
  /** Set only when the food really is that one color. Mixed foods have none. */
  color?: Color;
  /** False when one emoji is really several things, like a bunch of grapes. */
  countable: boolean;
}

export const FOODS: readonly Food[] = [
  { id: 'apple', emoji: '🍎', a: 'an apple', one: 'apple', many: 'apples', color: 'red', countable: true },
  { id: 'strawberry', emoji: '🍓', a: 'a strawberry', one: 'strawberry', many: 'strawberries', color: 'red', countable: true },
  { id: 'banana', emoji: '🍌', a: 'a banana', one: 'banana', many: 'bananas', color: 'yellow', countable: true },
  { id: 'lemon', emoji: '🍋', a: 'a lemon', one: 'lemon', many: 'lemons', color: 'yellow', countable: true },
  { id: 'pear', emoji: '🍐', a: 'a pear', one: 'pear', many: 'pears', color: 'green', countable: true },
  { id: 'cucumber', emoji: '🥒', a: 'a cucumber', one: 'cucumber', many: 'cucumbers', color: 'green', countable: true },
  { id: 'carrot', emoji: '🥕', a: 'a carrot', one: 'carrot', many: 'carrots', color: 'orange', countable: true },
  { id: 'orange', emoji: '🍊', a: 'an orange', one: 'orange', many: 'oranges', color: 'orange', countable: true },
  { id: 'grapes', emoji: '🍇', a: 'some grapes', one: 'grapes', many: 'grapes', color: 'purple', countable: false },
  { id: 'cookie', emoji: '🍪', a: 'a cookie', one: 'cookie', many: 'cookies', countable: true },
  { id: 'pizza', emoji: '🍕', a: 'a pizza', one: 'pizza', many: 'pizzas', countable: true },
  { id: 'egg', emoji: '🥚', a: 'an egg', one: 'egg', many: 'eggs', countable: true },
];

export function foodById(id: string): Food {
  const food = FOODS.find((candidate) => candidate.id === id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}
