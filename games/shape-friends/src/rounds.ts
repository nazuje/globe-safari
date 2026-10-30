export type ShapeName = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'rectangle' | 'oval' | 'diamond';
export type ColorName = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
export type SizeName = 'big' | 'middle' | 'small';
export type LevelId = 1 | 2 | 3 | 4 | 5;
export type Rng = () => number;

export interface Friend {
  shape: ShapeName;
  color: ColorName;
  size: SizeName;
}

export type Door = { kind: 'shape'; shape: ShapeName } | { kind: 'color'; color: ColorName } | { kind: 'size'; size: SizeName };

export interface Question {
  friend: Friend;
  doors: Door[];
  /** Index into doors of the one door this friend lives behind. */
  answer: number;
}

export interface Round {
  level: LevelId;
  questions: Question[];
}

export interface Level {
  id: LevelId;
  fresh: readonly ShapeName[];
  familiar: readonly ShapeName[];
}

export const ROUND_LENGTH = 6;
export const DOORS_PER_QUESTION = 3;
export const HINT_AFTER_MISSES = 2;

const FIRST_SHAPES = ['circle', 'square', 'triangle'] as const;
const MORE_SHAPES = ['star', 'heart', 'rectangle'] as const;
const LAST_SHAPES = ['oval', 'diamond'] as const;
const ALL_SHAPES = [...FIRST_SHAPES, ...MORE_SHAPES, ...LAST_SHAPES];

/** Each shape's own color on levels 1 to 3, where color is not the lesson. */
export const HOME_COLOR: Record<ShapeName, ColorName> = {
  circle: 'red',
  square: 'blue',
  triangle: 'green',
  star: 'yellow',
  heart: 'pink',
  rectangle: 'purple',
  oval: 'orange',
  diamond: 'teal',
};

/** Colors a 4-year-old can name, used when the color changes or is the rule. */
export const NAMED_COLORS: readonly ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export const LEVELS: readonly Level[] = [
  { id: 1, fresh: FIRST_SHAPES, familiar: [] },
  { id: 2, fresh: MORE_SHAPES, familiar: FIRST_SHAPES },
  { id: 3, fresh: LAST_SHAPES, familiar: [...FIRST_SHAPES, ...MORE_SHAPES] },
  { id: 4, fresh: [], familiar: ALL_SHAPES },
  { id: 5, fresh: [], familiar: ALL_SHAPES },
];

export function isLevelId(value: unknown): value is LevelId {
  return LEVELS.some((level) => level.id === value);
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffled(items, rng).slice(0, count);
}

function askAmong(friend: Friend, right: Door, wrong: readonly Door[], rng: Rng): Question {
  const doors = shuffled([right, ...wrong.slice(0, DOORS_PER_QUESTION - 1)], rng);
  return { friend, doors, answer: doors.indexOf(right) };
}

function shapeDoor(shape: ShapeName): Door {
  return { kind: 'shape', shape };
}

function shapeQuestion(friend: Friend, doorShapes: readonly ShapeName[], rng: Rng): Question {
  const others = doorShapes.filter((shape) => shape !== friend.shape);
  return askAmong(friend, shapeDoor(friend.shape), sample(others, DOORS_PER_QUESTION - 1, rng).map(shapeDoor), rng);
}

/** Every new shape appears each round, and a bag never ends on the shape the next one starts with. */
function shapeOrder(level: Level, rng: Rng): ShapeName[] {
  const order: ShapeName[] = [];
  while (order.length < ROUND_LENGTH) {
    const extras = sample(level.familiar, ROUND_LENGTH - level.fresh.length, rng);
    const bag = shuffled([...level.fresh, ...extras], rng);
    if (bag[0] === order.at(-1)) bag.push(bag.shift() as ShapeName);
    order.push(...bag);
  }
  return order.slice(0, ROUND_LENGTH);
}

function namingQuestions(level: Level, rng: Rng): Question[] {
  const doorShapes = [...level.fresh, ...level.familiar];
  return shapeOrder(level, rng).map((shape) => {
    const friend: Friend = { shape, color: HOME_COLOR[shape], size: 'middle' };
    return shapeQuestion(friend, doorShapes, rng);
  });
}

/** Three shapes, each seen twice looking different, all on one street: the door stays the same. */
function disguiseQuestions(level: Level, rng: Rng): Question[] {
  const street = sample(level.familiar, DOORS_PER_QUESTION, rng);
  const friends = street.flatMap((shape): Friend[] => {
    const [first, second] = sample(NAMED_COLORS, 2, rng);
    const sizes: SizeName[] = rng() < 0.5 ? ['big', 'small'] : ['small', 'big'];
    return [
      { shape, color: first, size: sizes[0] },
      { shape, color: second, size: sizes[1] },
    ];
  });
  return shuffled(friends, rng).map((friend) => shapeQuestion(friend, street, rng));
}

function colorQuestions(count: number, level: Level, rng: Rng): Question[] {
  const shapes = sample(level.familiar, count, rng);
  return sample(NAMED_COLORS, count, rng).map((color, i) => {
    const wrong = sample(
      NAMED_COLORS.filter((other) => other !== color),
      DOORS_PER_QUESTION - 1,
      rng,
    ).map((other): Door => ({ kind: 'color', color: other }));
    return askAmong({ shape: shapes[i], color, size: 'middle' }, { kind: 'color', color }, wrong, rng);
  });
}

function sizeQuestions(count: number, level: Level, rng: Rng): Question[] {
  const shapes = sample(level.familiar, count, rng);
  const firstBig = rng() < 0.5;
  return shapes.map((shape, i) => {
    const size: SizeName = i % 2 === 0 === firstBig ? 'big' : 'small';
    const color = NAMED_COLORS[Math.floor(rng() * NAMED_COLORS.length)];
    const wrong = (['big', 'middle', 'small'] as const)
      .filter((other) => other !== size)
      .map((other): Door => ({ kind: 'size', size: other }));
    return askAmong({ shape, color, size }, { kind: 'size', size }, wrong, rng);
  });
}

/** Half the round sorts by one rule, then the rule changes once, out loud. */
function sortingQuestions(level: Level, rng: Rng): Question[] {
  const half = ROUND_LENGTH / 2;
  const blocks = [colorQuestions(half, level, rng), sizeQuestions(half, level, rng)];
  return rng() < 0.5 ? blocks.flat() : blocks.reverse().flat();
}

export function levelOf(id: LevelId): Level {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

export function makeRound(id: LevelId, rng: Rng = Math.random): Round {
  const level = levelOf(id);
  const build = id === 4 ? disguiseQuestions : id === 5 ? sortingQuestions : namingQuestions;
  return { level: id, questions: build(level, rng) };
}

/** Two questions with the same key would look and sound the same to the child. */
export function questionKey({ friend, doors, answer }: Question): string {
  const right = doors[answer];
  if (right.kind === 'color') return `color:${right.color}`;
  if (right.kind === 'size') return `size:${right.size}`;
  return `shape:${friend.shape}:${friend.color}:${friend.size}`;
}

export function doorFits(door: Door, friend: Friend): boolean {
  if (door.kind === 'shape') return door.shape === friend.shape;
  if (door.kind === 'color') return door.color === friend.color;
  return door.size === friend.size;
}

export interface TapResult {
  home: boolean;
  misses: number;
  hint: boolean;
}

export function judgeTap(question: Question, doorIndex: number, misses: number): TapResult {
  if (doorIndex === question.answer) return { home: true, misses, hint: false };
  const missed = misses + 1;
  return { home: false, misses: missed, hint: missed >= HINT_AFTER_MISSES };
}
