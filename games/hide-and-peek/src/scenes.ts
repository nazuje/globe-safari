/** Everything the game knows about friends, rooms and hiding places. No logic beyond lookups. Their words are in lang/. */
import { en } from './lang/en.ts';
import type { FriendId, LandmarkId, SceneId, SpotId, SurpriseId, Text } from './lang/en.ts';

export interface Friend {
  id: FriendId;
  emoji: string;
}

export const FRIENDS: readonly Friend[] = [
  { id: 'bunny', emoji: '🐰' },
  { id: 'bear', emoji: '🐻' },
  { id: 'panda', emoji: '🐼' },
  { id: 'fox', emoji: '🦊' },
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
  id: SpotId;
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
  id: LandmarkId;
  /** "under" means straight below it. "near" and "by" also reach the top row next door. */
  word: 'near' | 'by' | 'under';
  col: number;
  /** Set for landmarks drawn in CSS; otherwise the emoji is used. */
  art?: 'window' | 'door' | 'gate' | 'barn' | 'fence';
  emoji?: string;
}

/** What opening an empty spot shows and says, in the language in use. */
export interface Surprise {
  emoji: string;
  line: string;
}

export interface Scene {
  id: SceneId;
  emoji: string;
  landmarks: readonly Landmark[];
  spots: readonly Spot[];
  surprises: readonly { emoji: string; id: SurpriseId }[];
}

export const SCENES: readonly Scene[] = [
  {
    id: 'bedroom',
    emoji: '🛏️',
    landmarks: [
      { id: 'window', word: 'near', col: 0, art: 'window' },
      { id: 'clock', word: 'under', col: 1, emoji: '🕰️' },
      { id: 'door', word: 'by', col: 2, art: 'door' },
    ],
    spots: [
      { id: 'curtain', col: 0, row: 0, level: 1, art: 'curtain', tint: '#ff8fab' },
      { id: 'plant', col: 1, row: 0, level: 1, art: 'emoji', emoji: '🪴' },
      { id: 'wardrobe', col: 2, row: 0, level: 2, art: 'doors', tint: '#b9803f' },
      { id: 'bed', col: 0, row: 1, level: 1, art: 'bed', tint: '#6c8cff' },
      { id: 'tent', col: 1, row: 1, level: 3, art: 'tent', tint: '#ffb347' },
      { id: 'chest', col: 2, row: 1, level: 1, art: 'chest', tint: '#a8652a' },
      { id: 'box', col: 0, row: 2, level: 2, art: 'box', tint: '#dca76b' },
      { id: 'basket', col: 1, row: 2, level: 1, art: 'basket', tint: '#d9a54d' },
      { id: 'pillow', col: 2, row: 2, level: 1, art: 'pillow', tint: '#c9a5ff' },
    ],
    surprises: [
      { emoji: '🐈💤', id: 'sleepy' },
      { emoji: '🧦', id: 'sock' },
      { emoji: '🐭', id: 'notMe' },
      { emoji: '🧸', id: 'teddy' },
      { emoji: '🦆', id: 'quack' },
      { emoji: '🩴', id: 'shoe' },
      { emoji: '🐞', id: 'notHere' },
      { emoji: '🪀', id: 'boing' },
      { emoji: '🐢', id: 'turtle' },
    ],
  },
  {
    id: 'garden',
    emoji: '🌻',
    landmarks: [
      { id: 'tree', word: 'under', col: 0, emoji: '🌳' },
      { id: 'kite', word: 'under', col: 1, emoji: '🪁' },
      { id: 'gate', word: 'by', col: 2, art: 'gate' },
    ],
    spots: [
      { id: 'bush', col: 0, row: 0, level: 2, art: 'emoji', emoji: '🌿' },
      { id: 'shed', col: 1, row: 0, level: 1, art: 'house', tint: '#58b368' },
      { id: 'flowers', col: 2, row: 0, level: 1, art: 'emoji', emoji: '🌷' },
      { id: 'log', col: 0, row: 1, level: 1, art: 'emoji', emoji: '🪵' },
      { id: 'rock', col: 1, row: 1, level: 3, art: 'emoji', emoji: '🪨' },
      { id: 'pot', col: 2, row: 1, level: 1, art: 'emoji', emoji: '🪴' },
      { id: 'mushroom', col: 0, row: 2, level: 1, art: 'emoji', emoji: '🍄' },
      { id: 'basket', col: 1, row: 2, level: 1, art: 'basket', tint: '#d9a54d' },
      { id: 'bucket', col: 2, row: 2, level: 2, art: 'emoji', emoji: '🪣' },
    ],
    surprises: [
      { emoji: '🐌', id: 'snail' },
      { emoji: '🐸', id: 'ribbit' },
      { emoji: '🐞', id: 'notMe' },
      { emoji: '🦋', id: 'flap' },
      { emoji: '🐝', id: 'buzz' },
      { emoji: '🧦', id: 'sock' },
      { emoji: '🐭', id: 'notHere' },
      { emoji: '🐛', id: 'wiggle' },
      { emoji: '🐦', id: 'tweet' },
    ],
  },
  {
    id: 'kitchen',
    emoji: '🍳',
    landmarks: [
      { id: 'window', word: 'near', col: 0, art: 'window' },
      { id: 'clock', word: 'under', col: 1, emoji: '🕰️' },
      { id: 'door', word: 'by', col: 2, art: 'door' },
    ],
    spots: [
      { id: 'cupboard', col: 0, row: 0, level: 1, art: 'doors', tint: '#ffcf56' },
      { id: 'pot', col: 1, row: 0, level: 2, art: 'emoji', emoji: '🍲' },
      { id: 'fridge', col: 2, row: 0, level: 1, art: 'doors', tint: '#bfe3f5' },
      { id: 'oven', col: 0, row: 1, level: 1, art: 'doors', tint: '#ff8a65' },
      { id: 'table', col: 1, row: 1, level: 1, art: 'table', tint: '#ff7b7b' },
      { id: 'bag', col: 2, row: 1, level: 3, art: 'emoji', emoji: '🎒' },
      { id: 'basket', col: 0, row: 2, level: 2, art: 'basket', tint: '#d9a54d' },
      { id: 'box', col: 1, row: 2, level: 1, art: 'box', tint: '#dca76b' },
      { id: 'bucket', col: 2, row: 2, level: 1, art: 'emoji', emoji: '🪣' },
    ],
    surprises: [
      { emoji: '🍪', id: 'cookie' },
      { emoji: '🍌', id: 'banana' },
      { emoji: '🐭', id: 'notMe' },
      { emoji: '🥄', id: 'spoons' },
      { emoji: '🧀', id: 'cheese' },
      { emoji: '🐈💤', id: 'sleepy' },
      { emoji: '🥕', id: 'crunch' },
      { emoji: '🍋', id: 'sour' },
      { emoji: '🥚', id: 'notHere' },
    ],
  },
  {
    id: 'farm',
    emoji: '🚜',
    landmarks: [
      { id: 'barn', word: 'by', col: 0, art: 'barn' },
      { id: 'tractor', word: 'near', col: 1, emoji: '🚜' },
      { id: 'fence', word: 'by', col: 2, art: 'fence' },
    ],
    spots: [
      { id: 'doghouse', col: 0, row: 0, level: 1, art: 'house', tint: '#c98a4b' },
      { id: 'hay', col: 1, row: 0, level: 1, art: 'emoji', emoji: '🌾' },
      { id: 'barrel', col: 2, row: 0, level: 2, art: 'barrel', tint: '#b9803f' },
      { id: 'truck', col: 0, row: 1, level: 3, art: 'emoji', emoji: '🛻' },
      { id: 'corn', col: 1, row: 1, level: 1, art: 'emoji', emoji: '🌽' },
      { id: 'box', col: 2, row: 1, level: 1, art: 'box', tint: '#dca76b' },
      { id: 'bag', col: 0, row: 2, level: 1, art: 'emoji', emoji: '🎒' },
      { id: 'bucket', col: 1, row: 2, level: 2, art: 'emoji', emoji: '🪣' },
      { id: 'bush', col: 2, row: 2, level: 1, art: 'emoji', emoji: '🌿' },
    ],
    surprises: [
      { emoji: '🐤', id: 'peep' },
      { emoji: '🐖', id: 'oink' },
      { emoji: '🐑', id: 'baa' },
      { emoji: '🐭', id: 'notMe' },
      { emoji: '🐄', id: 'moo' },
      { emoji: '🧦', id: 'sock' },
      { emoji: '🐐', id: 'maa' },
      { emoji: '🥚', id: 'notHere' },
      { emoji: '🐈💤', id: 'sleepy' },
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
export function surpriseFor(scene: Scene, spotId: string, round: number, words: Text = en): Surprise {
  const index = scene.spots.findIndex((spot) => spot.id === spotId);
  const { emoji, id } = scene.surprises[(index + round) % scene.surprises.length];
  return { emoji, line: words.surprises[id] };
}
