export type BlockKind = 'plain' | 'face' | 'pop' | 'jelly';

export interface BlockSpec {
  x: number;
  /** Height of the block's center above the table. */
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: number;
  kind: BlockKind;
  /** Turn around the upright axis, in radians. */
  turn: number;
}

export const LEVEL_IDS = [
  'tower',
  'pyramid',
  'wobbly',
  'bridge',
  'wall',
  'robot',
  'stairs',
  'house',
  'rocket',
  'dinosaur',
  'train',
  'castle',
  'smiley',
  'twins',
  'giant',
  'cake',
] as const;

export type LevelId = (typeof LEVEL_IDS)[number];

export interface Level {
  id: LevelId;
  emoji: string;
  blocks: BlockSpec[];
  /** Hidden until enough big crashes have happened. */
  bonus: boolean;
  /** Low and wide, so fewer blocks can reach the edge and the star goals are kinder. */
  sturdy: boolean;
}

export const MAX_BLOCKS = 60;
/** No structure reaches further than this from the table's center. */
export const FURTHEST_REACH = 5.2;

const RED = 0xf0524f;
const ORANGE = 0xff9838;
const YELLOW = 0xffd23f;
const GREEN = 0x4fcf7c;
const TEAL = 0x2fc6c0;
const BLUE = 0x4a9bff;
const PURPLE = 0x9a6bff;
const PINK = 0xff7fb6;
const CREAM = 0xfff0d0;
const BROWN = 0xa8693b;
const INK = 0x3a3350;
const SKY = 0xa6e3ff;
const RAINBOW = [RED, ORANGE, YELLOW, GREEN, TEAL, BLUE, PURPLE, PINK];

const COLOR_BY_LETTER: Record<string, number> = {
  r: RED,
  o: ORANGE,
  y: YELLOW,
  g: GREEN,
  t: TEAL,
  b: BLUE,
  p: PURPLE,
  n: PINK,
  c: CREAM,
  w: BROWN,
  k: INK,
  s: SKY,
};

interface Options {
  kind?: BlockKind;
  turn?: number;
}

/** Collects blocks. `bottom` is where a block sits, so stacks read as plain sums. */
function blocks() {
  const list: BlockSpec[] = [];
  const add = (
    x: number,
    bottom: number,
    z: number,
    size: readonly [number, number, number],
    color: number,
    { kind = 'plain', turn = 0 }: Options = {},
  ): void => {
    const [w, h, d] = size;
    list.push({ x, y: bottom + h / 2, z, w, h, d, color, kind, turn });
  };
  return { list, add };
}

type Add = ReturnType<typeof blocks>['add'];

const pick = (index: number): number => RAINBOW[index % RAINBOW.length] ?? RED;

/** Layers of planks, each layer crossing the one below, like a game of stacking sticks. */
function crossedTower(add: Add, x: number, z: number, layers: number, planks: number, h: number, firstColor = 0): void {
  const span = planks;
  for (let layer = 0; layer < layers; layer += 1) {
    for (let plank = 0; plank < planks; plank += 1) {
      const offset = plank - (planks - 1) / 2;
      const color = pick(firstColor + layer + plank);
      const kind: BlockKind = (layer + plank) % 7 === 3 ? 'face' : 'plain';
      if (layer % 2 === 0) add(x, layer * h, z + offset, [span, h, 1], color, { kind });
      else add(x + offset, layer * h, z, [1, h, span], color, { kind });
    }
  }
}

/**
 * Draws a flat picture in blocks. The last row of text is the row on the table,
 * and a capital letter gives that block a face.
 */
function picture(add: Add, rows: readonly string[], w: number, h: number, d: number): void {
  rows.forEach((row, rowIndex) => {
    const bottom = (rows.length - 1 - rowIndex) * h;
    [...row].forEach((letter, column) => {
      if (letter === '.') return;
      const x = (column - (row.length - 1) / 2) * w;
      const special = letter === '*' ? 'pop' : letter === '~' ? 'jelly' : undefined;
      const color = special ? (special === 'pop' ? PINK : GREEN) : (COLOR_BY_LETTER[letter.toLowerCase()] ?? CREAM);
      const isCapital = letter !== letter.toLowerCase();
      add(x, bottom, 0, [w, h, d], color, { kind: special ?? (isCapital ? 'face' : 'plain') });
    });
  });
}

function tower(add: Add): void {
  crossedTower(add, 0, 0, 10, 2, 0.8);
}

function pyramid(add: Add): void {
  const size = 1.2;
  for (let layer = 0; layer < 4; layer += 1) {
    const across = 4 - layer;
    for (let i = 0; i < across; i += 1) {
      for (let j = 0; j < across; j += 1) {
        const x = (i - (across - 1) / 2) * size;
        const z = (j - (across - 1) / 2) * size;
        const front = j === across - 1;
        const kind: BlockKind = layer === 1 && i === 1 && j === 1 ? 'pop' : front && (i + layer) % 3 === 1 ? 'face' : 'plain';
        add(x, layer * size, z, [size, size, size], pick(layer * 2 + (i + j) % 2), { kind });
      }
    }
  }
}

function wobbly(add: Add): void {
  const leans = [0, 0.16, -0.12, 0.2, -0.18, 0.1, 0.24, -0.14, 0.12, -0.2, 0.16, -0.08, 0.14, 0];
  let bottom = 0;
  leans.forEach((lean, index) => {
    const width = 2 - index * 0.07;
    const h = index % 3 === 2 ? 0.6 : 0.8;
    const kind: BlockKind = index % 5 === 3 ? 'jelly' : index % 4 === 1 ? 'face' : 'plain';
    add(lean, bottom, lean * 0.5, [width, h, width], kind === 'jelly' ? GREEN : pick(index * 3), {
      kind,
      turn: lean * 1.2,
    });
    bottom += h;
  });
}

function bridge(add: Add): void {
  const size: [number, number, number] = [1.2, 1, 1.8];
  [-3.4, 0, 3.4].forEach((x, pier) => {
    for (let level = 0; level < 3; level += 1) add(x, level, 0, size, pick(pier * 2 + level));
  });
  add(-2, 3, 0, [4, 0.5, 2], BROWN);
  add(2, 3, 0, [4, 0.5, 2], BROWN);
  [-3.2, -1.6, 0, 1.6, 3.2].forEach((x, index) => {
    add(x, 3.5, 0.5, [1, 0.7, 0.9], pick(index + 3), { kind: index === 2 ? 'pop' : 'plain' });
    add(x, 3.5, -0.5, [1, 0.7, 0.9], pick(index + 5));
  });
  add(-1.6, 4.2, 0.5, [0.9, 0.9, 0.9], YELLOW, { kind: 'face' });
  add(1.6, 4.2, 0.5, [0.9, 0.9, 0.9], TEAL, { kind: 'face' });
}

function wall(add: Add): void {
  picture(add, ['rotBpro', 'ygt~bpy', 'bpRoyGt', 'gt*bprO', 'orygtbp'], 1.1, 0.9, 1.4);
}

function robot(add: Add): void {
  for (const x of [-0.8, 0.8]) {
    add(x, 0, 0, [1, 1, 1.4], INK);
    add(x, 1, 0, [1, 1, 1.2], BLUE);
    add(x, 2, 0, [1, 1, 1.2], BLUE);
  }
  add(0, 3, 0, [2.8, 0.6, 1.4], TEAL);
  for (const x of [-0.9, 0, 0.9]) {
    add(x, 3.6, 0, [0.9, 0.9, 1.3], x === 0 ? PINK : BLUE, { kind: x === 0 ? 'pop' : 'plain' });
    add(x, 4.5, 0, [0.9, 0.9, 1.3], x === 0 ? YELLOW : BLUE);
  }
  for (const x of [-2.1, 2.1]) {
    for (let level = 0; level < 5; level += 1) add(x, level * 1.08, 0, [0.9, 1.08, 1.1], level === 0 ? ORANGE : TEAL);
  }
  add(0, 5.4, 0, [5.1, 0.5, 1.4], ORANGE);
  add(0, 5.9, 0, [2.2, 1.7, 1.4], CREAM, { kind: 'face' });
  add(0, 7.6, 0, [0.4, 0.5, 0.4], INK);
  add(0, 8.1, 0, [0.7, 0.7, 0.7], PINK, { kind: 'pop' });
}

function stairs(add: Add): void {
  for (let step = 0; step < 7; step += 1) {
    for (let level = 0; level <= step; level += 1) {
      const kind: BlockKind = level === step && step % 3 === 1 ? 'face' : 'plain';
      add(step - 3, level, 0, [1, 1, 1.6], pick(step + level * 2), { kind });
    }
  }
}

function house(add: Add): void {
  picture(add, ['cBccc', 'ccwcc', 'c*wcc'], 1.1, 1, 1.6);
  add(0, 3, 0, [6.4, 0.6, 2], RED);
  add(0, 3.6, 0, [5, 0.6, 2], ORANGE);
  add(0, 4.2, 0, [3.6, 0.6, 2], RED);
  add(0, 4.8, 0, [2.2, 0.6, 2], ORANGE);
  add(1.45, 4.8, 0, [0.7, 0.7, 0.7], INK);
  add(0, 5.4, 0, [1, 0.8, 1], YELLOW, { kind: 'face' });
}

function rocket(add: Add): void {
  for (const x of [-1.7, 1.7]) {
    add(x, 0, 0, [1, 1, 1.4], RED);
    add(x, 1, 0, [0.8, 1, 1], ORANGE);
  }
  for (let level = 0; level < 7; level += 1) {
    const middle = level === 4 || level === 3;
    for (const x of [-0.6, 0.6]) {
      add(x, level, 0.6, [1.2, 1, 1.2], middle ? BLUE : CREAM, { kind: level === 5 && x > 0 ? 'face' : 'plain' });
      add(x, level, -0.6, [1.2, 1, 1.2], level === 2 ? PINK : CREAM, { kind: level === 2 && x < 0 ? 'pop' : 'plain' });
    }
  }
  add(0, 7, 0, [2.1, 0.8, 2.1], RED);
  add(0, 7.8, 0, [1.4, 0.8, 1.4], ORANGE);
  add(0, 8.6, 0, [0.7, 0.8, 0.7], YELLOW);
}

function dinosaur(add: Add): void {
  const shift = 0.9;
  for (const x of [-1.4, 1.2]) {
    add(x + shift, 0, 0, [1, 0.9, 1.8], GREEN);
    add(x + shift, 0.9, 0, [1, 0.9, 1.8], GREEN);
  }
  add(-0.1 + shift, 1.8, 0, [5, 0.8, 1.8], TEAL);
  add(-0.1 + shift, 2.6, 0, [4.8, 0.8, 1.8], GREEN);
  for (const x of [-1.4, -0.4, 0.6]) add(x + shift, 3.4, 0, [0.7, 0.5, 0.7], ORANGE);
  for (let level = 0; level < 3; level += 1) add(1.7 + shift, 3.4 + level * 0.9, 0, [1, 0.9, 1.3], GREEN);
  add(2 + shift, 6.1, 0, [1.5, 1, 1.3], TEAL, { kind: 'face' });
  add(-3.1 + shift, 0, 0, [1, 0.9, 1.4], GREEN);
  add(-3.1 + shift, 0.9, 0, [1, 0.9, 1.4], TEAL, { kind: 'pop' });
  add(-4.1 + shift, 0, 0, [1, 0.9, 1.2], GREEN);
  add(-5 + shift, 0, 0, [0.8, 0.5, 1], TEAL);
}

function train(add: Add): void {
  const wagon = (x: number, color: number, load: number): void => {
    for (const side of [-0.8, 0.8]) add(x + side, 0, 0, [0.8, 0.7, 1.8], INK);
    add(x, 0.7, 0, [2.8, 0.4, 2], color);
    for (const offset of [-0.8, 0, 0.8]) {
      add(x + offset, 1.1, 0, [0.8, 0.8, 1.6], pick(load));
      load += 1;
    }
    add(x, 1.9, 0, [1.6, 0.7, 1.2], pick(load + 2), { kind: 'face' });
  };
  wagon(-3.3, BLUE, 1);
  wagon(0, PURPLE, 4);
  for (const side of [2.4, 4]) add(side, 0, 0, [0.9, 0.7, 1.8], INK);
  add(3.2, 0.7, 0, [3.2, 0.4, 2], RED);
  add(2.4, 1.1, 0, [1.4, 1.4, 1.8], ORANGE);
  add(2.4, 2.5, 0, [1.6, 0.4, 2], RED);
  add(3.8, 1.1, 0, [1.3, 0.9, 1.6], YELLOW, { kind: 'face' });
  add(3.8, 2, 0, [0.7, 0.9, 0.7], INK);
  add(3.8, 2.9, 0, [1, 0.5, 1], PINK, { kind: 'pop' });
}

function castle(add: Add): void {
  const turret = (x: number, z: number, color: number): void => {
    for (let level = 0; level < 5; level += 1) add(x, level, z, [1.4, 1, 1.4], level % 2 === 0 ? color : CREAM);
    add(x, 5, z, [1.9, 0.5, 1.9], RED);
    add(x, 5.5, z, [0.9, 0.8, 0.9], ORANGE);
  };
  const wallWith = (z: number, door: boolean): void => {
    for (const x of [-1.5, 1.5]) {
      add(x, 0, z, [1.2, 1.2, 1], PURPLE);
      add(x, 1.2, z, [1.2, 1.2, 1], CREAM);
    }
    add(0, 2.4, z, [4.2, 0.6, 1], BROWN);
    for (const x of [-1.4, 0, 1.4]) {
      add(x, 3, z, [0.9, 0.9, 1], PURPLE, { kind: door && x === 0 ? 'face' : door && x > 0 ? 'pop' : 'plain' });
    }
  };
  turret(-3.1, 1.6, TEAL);
  turret(3.1, 1.6, TEAL);
  turret(-3.1, -1.6, BLUE);
  turret(3.1, -1.6, BLUE);
  wallWith(1.6, true);
  wallWith(-1.6, false);
  for (let level = 0; level < 4; level += 1) add(0, level, 0, [1.5, 1, 1.5], level % 2 === 0 ? YELLOW : ORANGE);
  add(0, 4, 0, [1, 1, 1], PINK, { kind: 'face' });
}

function smiley(add: Add): void {
  picture(add, ['ssyyyyss', 'syyyyyys', 'yykyykyy', 'yyyyyyyy', 'ykyyyyky', 'syykkyys', 'ssyyyyss'], 1, 1, 1.5);
}

function twins(add: Add): void {
  crossedTower(add, -2, 0, 7, 2, 0.8, 0);
  crossedTower(add, 2, 0, 7, 2, 0.8, 4);
  add(0, 5.6, 0, [6.2, 0.5, 1.6], BROWN);
  add(-1, 6.1, 0, [1, 1, 1], PINK, { kind: 'pop' });
  add(1, 6.1, 0, [1, 1, 1], GREEN, { kind: 'jelly' });
  add(0, 6.1, 0, [1, 1, 1], YELLOW, { kind: 'face' });
}

function giant(add: Add): void {
  crossedTower(add, 0, 0, 20, 3, 0.62, 2);
}

function cake(add: Add): void {
  const ring = (bottom: number, across: number, size: number, h: number, colors: readonly number[]): void => {
    for (let i = 0; i < across; i += 1) {
      for (let j = 0; j < across; j += 1) {
        const x = (i - (across - 1) / 2) * size;
        const z = (j - (across - 1) / 2) * size;
        const kind: BlockKind = (i + j) % 2 === 0 ? 'pop' : (i + j) % 4 === 1 ? 'jelly' : 'plain';
        const color = kind === 'pop' ? PINK : kind === 'jelly' ? GREEN : (colors[i % colors.length] ?? CREAM);
        add(x, bottom, z, [size, h, size], color, { kind });
      }
    }
  };
  ring(0, 4, 1.4, 1, [CREAM, YELLOW]);
  ring(1, 3, 1.3, 1, [YELLOW, ORANGE]);
  ring(2, 2, 1.2, 1, [CREAM, PINK]);
  add(0, 3, 0, [0.5, 1.2, 0.5], BLUE);
  add(0, 4.2, 0, [0.5, 0.5, 0.5], ORANGE, { kind: 'pop' });
}

const BUILDERS: Record<LevelId, { emoji: string; build: (add: Add) => void }> = {
  tower: { emoji: '🧱', build: tower },
  pyramid: { emoji: '🔺', build: pyramid },
  wobbly: { emoji: '🥴', build: wobbly },
  bridge: { emoji: '🌉', build: bridge },
  wall: { emoji: '🟥', build: wall },
  robot: { emoji: '🤖', build: robot },
  stairs: { emoji: '🪜', build: stairs },
  house: { emoji: '🏠', build: house },
  rocket: { emoji: '🚀', build: rocket },
  dinosaur: { emoji: '🦕', build: dinosaur },
  train: { emoji: '🚂', build: train },
  castle: { emoji: '🏰', build: castle },
  smiley: { emoji: '😀', build: smiley },
  twins: { emoji: '👯', build: twins },
  giant: { emoji: '🗼', build: giant },
  cake: { emoji: '🎂', build: cake },
};

const BONUS_LEVEL: LevelId = 'cake';
const STURDY_LEVELS: readonly LevelId[] = ['pyramid', 'wall', 'stairs', 'dinosaur', 'train', 'castle'];

export const LEVELS: readonly Level[] = LEVEL_IDS.map((id) => {
  const { list, add } = blocks();
  const { emoji, build } = BUILDERS[id];
  build(add);
  return { id, emoji, blocks: list, bonus: id === BONUS_LEVEL, sturdy: STURDY_LEVELS.includes(id) };
});

/** The highest ordinary block, where a tiny visitor can sit. */
export function topPlainBlock(level: Level): number {
  let best = -1;
  let bestTop = -Infinity;
  level.blocks.forEach((block, index) => {
    const top = block.y + block.h / 2;
    if (block.kind !== 'pop' && block.kind !== 'jelly' && top > bestTop) {
      best = index;
      bestTop = top;
    }
  });
  return best;
}

export interface Bounds {
  width: number;
  height: number;
  /** The middle of the structure, left to right. */
  middleX: number;
  depth: number;
  /** How far the structure reaches from the table's center in any direction. */
  reach: number;
}

export function boundsOf(level: Level): Bounds {
  let left = Infinity;
  let right = -Infinity;
  let front = 0;
  let top = 0;
  for (const { x, y, z, w, h, d, turn } of level.blocks) {
    const reach = turn === 0 ? w / 2 : Math.hypot(w, d) / 2;
    left = Math.min(left, x - reach);
    right = Math.max(right, x + reach);
    front = Math.max(front, Math.abs(z) + d / 2);
    top = Math.max(top, y + h / 2);
  }
  const reach = Math.max(-left, right, front);
  return { width: right - left, height: top, middleX: (left + right) / 2, depth: front * 2, reach };
}
