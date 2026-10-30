import { text, type Text } from './lang/index.ts';

export type Energy = 'energetic' | 'calm';

/** Each one is a CSS class, anim-<name>, in style.css. */
export type Anim =
  | 'hop'
  | 'stomp'
  | 'flap'
  | 'slither'
  | 'waddle'
  | 'sway'
  | 'roar'
  | 'stretch'
  | 'wiggle'
  | 'spin'
  | 'tiptoe'
  | 'swim'
  | 'float';

interface Animal {
  id: keyof Text['moves'];
  emoji: string;
  energy: Energy;
  anim: Anim;
  /** A little picture beside the animal, so the move reads with no sound. */
  puff: string;
  /** Soft background color for this animal's turn. */
  tint: string;
}

/** An animal and its words, which are looked up each time they're read and so always match the language in use. */
export interface Move extends Animal {
  /** "a frog", for lines such as "Dance like a frog!". */
  readonly like: string;
  /** Spoken first. Short enough for a 4-year-old: 3 to 7 words. */
  readonly line: string;
  /** Spoken right before the beat starts. */
  readonly chant: string;
  /** Small print for the grown-up. */
  readonly tip: string;
}

const withWords = (animal: Animal): Move => ({
  ...animal,
  get like() {
    return text().moves[animal.id].like;
  },
  get line() {
    return text().moves[animal.id].line;
  },
  get chant() {
    return text().moves[animal.id].chant;
  },
  get tip() {
    return text().moves[animal.id].tip;
  },
});

// Every move stays on the spot and is safe indoors for a small child:
// no running around, no jumping off things, no holding breath.
const ANIMALS: readonly Animal[] = [
  { id: 'frog', emoji: '🐸', energy: 'energetic', anim: 'hop', puff: '💦', tint: '#c9f2c7' },
  { id: 'elephant', emoji: '🐘', energy: 'energetic', anim: 'stomp', puff: '💥', tint: '#d9dcf5' },
  { id: 'bird', emoji: '🐦', energy: 'energetic', anim: 'flap', puff: '🪶', tint: '#c6e9ff' },
  { id: 'penguin', emoji: '🐧', energy: 'energetic', anim: 'waddle', puff: '❄️', tint: '#d3eefa' },
  { id: 'lion', emoji: '🦁', energy: 'energetic', anim: 'roar', puff: '💬', tint: '#ffe2a8' },
  { id: 'worm', emoji: '🪱', energy: 'energetic', anim: 'wiggle', puff: '〰️', tint: '#ffd9cf' },
  { id: 'monkey', emoji: '🐒', energy: 'energetic', anim: 'wiggle', puff: '🍌', tint: '#f3dcc0' },
  { id: 'kangaroo', emoji: '🦘', energy: 'energetic', anim: 'hop', puff: '💫', tint: '#f7dcae' },
  { id: 'bee', emoji: '🐝', energy: 'energetic', anim: 'flap', puff: '🌼', tint: '#fff3a6' },
  { id: 'puppy', emoji: '🐶', energy: 'energetic', anim: 'waddle', puff: '🦴', tint: '#f6e0c8' },
  { id: 'horse', emoji: '🐴', energy: 'energetic', anim: 'stomp', puff: '🥕', tint: '#ecd9c6' },
  { id: 'crab', emoji: '🦀', energy: 'energetic', anim: 'roar', puff: '🌊', tint: '#ffd3cc' },
  { id: 'duck', emoji: '🦆', energy: 'energetic', anim: 'waddle', puff: '💧', tint: '#d4f1e4' },
  { id: 'chicken', emoji: '🐔', energy: 'energetic', anim: 'stomp', puff: '🌽', tint: '#ffeab8' },

  { id: 'snake', emoji: '🐍', energy: 'calm', anim: 'slither', puff: '〰️', tint: '#d4efc4' },
  { id: 'giraffe', emoji: '🦒', energy: 'calm', anim: 'sway', puff: '🌿', tint: '#fbe7a9' },
  { id: 'cat', emoji: '🐱', energy: 'calm', anim: 'stretch', puff: '💤', tint: '#f8dcea' },
  { id: 'ladybird', emoji: '🐞', energy: 'calm', anim: 'spin', puff: '🍃', tint: '#ffd7d2' },
  { id: 'mouse', emoji: '🐭', energy: 'calm', anim: 'tiptoe', puff: '🧀', tint: '#e8e3f4' },
  { id: 'fish', emoji: '🐟', energy: 'calm', anim: 'swim', puff: '🫧', tint: '#bfe8f7' },
  { id: 'turtle', emoji: '🐢', energy: 'calm', anim: 'sway', puff: '🌱', tint: '#cdeccb' },
  { id: 'sloth', emoji: '🦥', energy: 'calm', anim: 'stretch', puff: '🌳', tint: '#e5dccb' },
  { id: 'butterfly', emoji: '🦋', energy: 'calm', anim: 'float', puff: '🌸', tint: '#dcdcff' },
  { id: 'owl', emoji: '🦉', energy: 'calm', anim: 'sway', puff: '🌙', tint: '#ddd6ee' },
  { id: 'bear', emoji: '🐻', energy: 'calm', anim: 'stretch', puff: '💤', tint: '#ecd6c0' },
  { id: 'bunny', emoji: '🐰', energy: 'calm', anim: 'tiptoe', puff: '🥕', tint: '#fbe0e6' },
  { id: 'flamingo', emoji: '🦩', energy: 'calm', anim: 'float', puff: '🌺', tint: '#ffd6e4' },
  { id: 'octopus', emoji: '🐙', energy: 'calm', anim: 'swim', puff: '🫧', tint: '#f3d4f1' },
];

export const MOVES: readonly Move[] = ANIMALS.map(withWords);
