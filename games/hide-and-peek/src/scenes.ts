/** Everything the game knows about friends, rooms and hiding places. No logic beyond lookups. */

export interface Friend {
  id: string;
  name: string;
  emoji: string;
}

export const FRIENDS: readonly Friend[] = [
  { id: 'bunny', name: 'Bunny', emoji: '🐰' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
];

export type LevelId = 'easy' | 'middle' | 'hard';

export interface Level {
  id: LevelId;
  spots: number;
}

export const LEVELS: readonly Level[] = [
  { id: 'easy', spots: 6 },
  { id: 'middle', spots: 8 },
  { id: 'hard', spots: 9 },
];

/** Which CSS drawing a hiding place uses. "emoji" is simply a big emoji. */
export type Art =
  | 'bed'
  | 'box'
  | 'chest'
  | 'curtain'
  | 'doors'
  | 'basket'
  | 'tent'
  | 'table'
  | 'pillow'
  | 'barrel'
  | 'house'
  | 'emoji';

export interface Spot {
  id: string;
  /** With its article, ready for a sentence: "the bed". One noun, so spoken clues stay short. */
  name: string;
  /** Where it stands in the room: col 0 to 2 left to right, row 0 to 2 top to bottom. */
  col: number;
  row: number;
  /** 1 appears on every level, 2 from middle up, 3 only on hard. */
  level: 1 | 2 | 3;
  art: Art;
  tint?: string;
  emoji?: string;
}

/** A big thing in the room you can't hide in, along the top. Clues point at it. */
export interface Landmark {
  id: string;
  name: string;
  /** "under" means straight below it. "near" and "by" also reach the top row next door. */
  word: 'near' | 'by' | 'under';
  col: number;
  /** Set for landmarks drawn in CSS; otherwise the emoji is used. */
  art?: 'window' | 'door' | 'gate' | 'barn' | 'fence';
  emoji?: string;
}

export interface Surprise {
  emoji: string;
  /** At most two words: it shares a sentence with a clue. */
  line: string;
}

export interface Scene {
  id: string;
  name: string;
  emoji: string;
  landmarks: readonly Landmark[];
  spots: readonly Spot[];
  surprises: readonly Surprise[];
}

export const SCENES: readonly Scene[] = [
  {
    id: 'bedroom',
    name: 'Bedroom',
    emoji: '🛏️',
    landmarks: [
      { id: 'window', name: 'the window', word: 'near', col: 0, art: 'window' },
      { id: 'clock', name: 'the clock', word: 'under', col: 1, emoji: '🕰️' },
      { id: 'door', name: 'the door', word: 'by', col: 2, art: 'door' },
    ],
    spots: [
      { id: 'curtain', name: 'the curtain', col: 0, row: 0, level: 1, art: 'curtain', tint: '#ff8fab' },
      { id: 'plant', name: 'the plant', col: 1, row: 0, level: 1, art: 'emoji', emoji: '🪴' },
      { id: 'wardrobe', name: 'the wardrobe', col: 2, row: 0, level: 2, art: 'doors', tint: '#b9803f' },
      { id: 'bed', name: 'the bed', col: 0, row: 1, level: 1, art: 'bed', tint: '#6c8cff' },
      { id: 'tent', name: 'the tent', col: 1, row: 1, level: 3, art: 'tent', tint: '#ffb347' },
      { id: 'chest', name: 'the chest', col: 2, row: 1, level: 1, art: 'chest', tint: '#a8652a' },
      { id: 'box', name: 'the box', col: 0, row: 2, level: 2, art: 'box', tint: '#dca76b' },
      { id: 'basket', name: 'the basket', col: 1, row: 2, level: 1, art: 'basket', tint: '#d9a54d' },
      { id: 'pillow', name: 'the pillow', col: 2, row: 2, level: 1, art: 'pillow', tint: '#c9a5ff' },
    ],
    surprises: [
      { emoji: '🐈💤', line: 'Shh! Sleepy!' },
      { emoji: '🧦', line: 'Stinky sock!' },
      { emoji: '🐭', line: 'Not me!' },
      { emoji: '🧸', line: 'Hello, teddy!' },
      { emoji: '🦆', line: 'Quack quack!' },
      { emoji: '🩴', line: 'Silly shoe!' },
      { emoji: '🐞', line: 'Not here!' },
      { emoji: '🪀', line: 'Boing boing!' },
      { emoji: '🐢', line: 'Hello, turtle!' },
    ],
  },
  {
    id: 'garden',
    name: 'Garden',
    emoji: '🌻',
    landmarks: [
      { id: 'tree', name: 'the tree', word: 'under', col: 0, emoji: '🌳' },
      { id: 'kite', name: 'the kite', word: 'under', col: 1, emoji: '🪁' },
      { id: 'gate', name: 'the gate', word: 'by', col: 2, art: 'gate' },
    ],
    spots: [
      { id: 'bush', name: 'the bush', col: 0, row: 0, level: 2, art: 'emoji', emoji: '🌿' },
      { id: 'shed', name: 'the shed', col: 1, row: 0, level: 1, art: 'house', tint: '#58b368' },
      { id: 'flowers', name: 'the flowers', col: 2, row: 0, level: 1, art: 'emoji', emoji: '🌷' },
      { id: 'log', name: 'the log', col: 0, row: 1, level: 1, art: 'emoji', emoji: '🪵' },
      { id: 'rock', name: 'the rock', col: 1, row: 1, level: 3, art: 'emoji', emoji: '🪨' },
      { id: 'pot', name: 'the pot', col: 2, row: 1, level: 1, art: 'emoji', emoji: '🪴' },
      { id: 'mushroom', name: 'the mushroom', col: 0, row: 2, level: 1, art: 'emoji', emoji: '🍄' },
      { id: 'basket', name: 'the basket', col: 1, row: 2, level: 1, art: 'basket', tint: '#d9a54d' },
      { id: 'bucket', name: 'the bucket', col: 2, row: 2, level: 2, art: 'emoji', emoji: '🪣' },
    ],
    surprises: [
      { emoji: '🐌', line: 'Hello, snail!' },
      { emoji: '🐸', line: 'Ribbit ribbit!' },
      { emoji: '🐞', line: 'Not me!' },
      { emoji: '🦋', line: 'Flap flap!' },
      { emoji: '🐝', line: 'Buzz buzz!' },
      { emoji: '🧦', line: 'Stinky sock!' },
      { emoji: '🐭', line: 'Not here!' },
      { emoji: '🐛', line: 'Wiggle wiggle!' },
      { emoji: '🐦', line: 'Tweet tweet!' },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    emoji: '🍳',
    landmarks: [
      { id: 'window', name: 'the window', word: 'near', col: 0, art: 'window' },
      { id: 'clock', name: 'the clock', word: 'under', col: 1, emoji: '🕰️' },
      { id: 'door', name: 'the door', word: 'by', col: 2, art: 'door' },
    ],
    spots: [
      { id: 'cupboard', name: 'the cupboard', col: 0, row: 0, level: 1, art: 'doors', tint: '#ffcf56' },
      { id: 'pot', name: 'the pot', col: 1, row: 0, level: 2, art: 'emoji', emoji: '🍲' },
      { id: 'fridge', name: 'the fridge', col: 2, row: 0, level: 1, art: 'doors', tint: '#bfe3f5' },
      { id: 'oven', name: 'the oven', col: 0, row: 1, level: 1, art: 'doors', tint: '#ff8a65' },
      { id: 'table', name: 'the table', col: 1, row: 1, level: 1, art: 'table', tint: '#ff7b7b' },
      { id: 'bag', name: 'the bag', col: 2, row: 1, level: 3, art: 'emoji', emoji: '🎒' },
      { id: 'basket', name: 'the basket', col: 0, row: 2, level: 2, art: 'basket', tint: '#d9a54d' },
      { id: 'box', name: 'the box', col: 1, row: 2, level: 1, art: 'box', tint: '#dca76b' },
      { id: 'bucket', name: 'the bucket', col: 2, row: 2, level: 1, art: 'emoji', emoji: '🪣' },
    ],
    surprises: [
      { emoji: '🍪', line: 'Yummy cookie!' },
      { emoji: '🍌', line: 'Silly banana!' },
      { emoji: '🐭', line: 'Not me!' },
      { emoji: '🥄', line: 'Just spoons!' },
      { emoji: '🧀', line: 'Stinky cheese!' },
      { emoji: '🐈💤', line: 'Shh! Sleepy!' },
      { emoji: '🥕', line: 'Crunch crunch!' },
      { emoji: '🍋', line: 'Sour face!' },
      { emoji: '🥚', line: 'Not here!' },
    ],
  },
  {
    id: 'farm',
    name: 'Farm',
    emoji: '🚜',
    landmarks: [
      { id: 'barn', name: 'the barn', word: 'by', col: 0, art: 'barn' },
      { id: 'tractor', name: 'the tractor', word: 'near', col: 1, emoji: '🚜' },
      { id: 'fence', name: 'the fence', word: 'by', col: 2, art: 'fence' },
    ],
    spots: [
      { id: 'doghouse', name: 'the doghouse', col: 0, row: 0, level: 1, art: 'house', tint: '#c98a4b' },
      { id: 'hay', name: 'the hay', col: 1, row: 0, level: 1, art: 'emoji', emoji: '🌾' },
      { id: 'barrel', name: 'the barrel', col: 2, row: 0, level: 2, art: 'barrel', tint: '#b9803f' },
      { id: 'truck', name: 'the truck', col: 0, row: 1, level: 3, art: 'emoji', emoji: '🛻' },
      { id: 'corn', name: 'the corn', col: 1, row: 1, level: 1, art: 'emoji', emoji: '🌽' },
      { id: 'box', name: 'the box', col: 2, row: 1, level: 1, art: 'box', tint: '#dca76b' },
      { id: 'bag', name: 'the bag', col: 0, row: 2, level: 1, art: 'emoji', emoji: '🎒' },
      { id: 'bucket', name: 'the bucket', col: 1, row: 2, level: 2, art: 'emoji', emoji: '🪣' },
      { id: 'bush', name: 'the bush', col: 2, row: 2, level: 1, art: 'emoji', emoji: '🌿' },
    ],
    surprises: [
      { emoji: '🐤', line: 'Peep peep!' },
      { emoji: '🐖', line: 'Oink oink!' },
      { emoji: '🐑', line: 'Baa baa!' },
      { emoji: '🐭', line: 'Not me!' },
      { emoji: '🐄', line: 'Moo moo!' },
      { emoji: '🧦', line: 'Stinky sock!' },
      { emoji: '🐐', line: 'Maa maa!' },
      { emoji: '🥚', line: 'Not here!' },
      { emoji: '🐈💤', line: 'Shh! Sleepy!' },
    ],
  },
];

function findById<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown id: ${id}`);
  return found;
}

export function friendById(id: string): Friend {
  return findById(FRIENDS, id);
}

export function sceneById(id: string): Scene {
  return findById(SCENES, id);
}

export function spotById(scene: Scene, id: string): Spot {
  return findById(scene.spots, id);
}

/** The hiding places in play for a level. */
export function activeSpots(scene: Scene, levelId: LevelId): Spot[] {
  const count = findById(LEVELS, levelId).spots;
  const byLevel = [...scene.spots].sort((a, b) => a.level - b.level);
  return byLevel.slice(0, count);
}

/** A spot's surprise shifts each round, so the same box isn't always the same joke. */
export function surpriseFor(scene: Scene, spotId: string, round: number): Surprise {
  const index = scene.spots.findIndex((spot) => spot.id === spotId);
  return scene.surprises[(index + round) % scene.surprises.length];
}
