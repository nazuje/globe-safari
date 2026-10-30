export type Color = 'red' | 'yellow' | 'green' | 'orange' | 'purple';

export const COLORS: readonly Color[] = ['red', 'yellow', 'green', 'orange', 'purple'];

export type FoodId =
  | 'apple'
  | 'strawberry'
  | 'banana'
  | 'lemon'
  | 'pear'
  | 'cucumber'
  | 'carrot'
  | 'orange'
  | 'grapes'
  | 'cookie'
  | 'pizza'
  | 'egg';

export interface Food {
  id: FoodId;
  emoji: string;
  /** Set only when the food really is that one color. Mixed foods have none. */
  color?: Color;
  /** False when one emoji is really several things, like a bunch of grapes. */
  countable: boolean;
}

export const FOODS: readonly Food[] = [
  { id: 'apple', emoji: '🍎', color: 'red', countable: true },
  { id: 'strawberry', emoji: '🍓', color: 'red', countable: true },
  { id: 'banana', emoji: '🍌', color: 'yellow', countable: true },
  { id: 'lemon', emoji: '🍋', color: 'yellow', countable: true },
  { id: 'pear', emoji: '🍐', color: 'green', countable: true },
  { id: 'cucumber', emoji: '🥒', color: 'green', countable: true },
  { id: 'carrot', emoji: '🥕', color: 'orange', countable: true },
  { id: 'orange', emoji: '🍊', color: 'orange', countable: true },
  { id: 'grapes', emoji: '🍇', color: 'purple', countable: false },
  { id: 'cookie', emoji: '🍪', countable: true },
  { id: 'pizza', emoji: '🍕', countable: true },
  { id: 'egg', emoji: '🥚', countable: true },
];

export function foodById(id: string): Food {
  const food = FOODS.find((candidate) => candidate.id === id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}
