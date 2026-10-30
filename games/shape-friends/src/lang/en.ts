import type { Door, Friend, LevelId, Question } from '../rounds.ts';
import type { Sticker } from '../stickers.ts';

function capitalized(word: string): string {
  return word[0].toUpperCase() + word.slice(1);
}

function withArticle(words: string): string {
  return `${/^[aeiou]/.test(words) ? 'an' : 'a'} ${words}`;
}

function looks(friend: Friend): string {
  const size = friend.size === 'middle' ? '' : `${friend.size} `;
  return `${size}${friend.color} ${friend.shape}`;
}

const LEVEL_LABELS: Record<LevelId, string> = {
  1: 'Circle, square, triangle',
  2: 'Adds star, heart, rectangle',
  3: 'Adds oval and diamond',
  4: 'Same shape, new sizes and colors',
  5: 'Sort by color or size',
};

const WRONG_LINES: readonly string[] = ['Not my door!', 'Oopsie! Not my door!', 'Silly me! Not my door!'];
const GIGGLE_LINES: readonly string[] = ['Hee hee! That tickles!', 'Ha ha! Hello there!', 'Boop! You found me!'];

export const en = {
  title: 'Shape Friends',
  description: 'Friendly shapes need help getting home. A tap-only game for 4-year-olds that teaches shape names, sizes, colors and sorting.',
  home: 'Back to Playroom',
  play: 'Play',
  keepPlaying: 'Keep playing',
  playAgain: 'Play again',
  pause: 'Pause, for grown-ups',
  stickerBook: 'Sticker book',
  closeBook: 'Close sticker book',
  friendLabel: 'The friend. Tap to tickle.',
  sayAgain: 'Say it again',
  /** Small print for the grown-up who picks the level. */
  levelLabel: (id: LevelId): string => `Level ${id}: ${LEVEL_LABELS[id]}`,
  stickerCount: (have: number, total: number): string => `${have} of ${total} stickers`,

  /** What a friend says when it arrives. Level 4 adds the disguise; level 5 speaks the rule. */
  promptLine({ friend, doors, answer }: Question): string {
    const right = doors[answer];
    if (right.kind === 'color') return `Who is ${right.color}? I am!`;
    if (right.kind === 'size') return `Who is ${right.size}? I am!`;
    return friend.size === 'middle' ? `I'm ${withArticle(friend.shape)}!` : `I'm ${withArticle(looks(friend))}!`;
  },

  cheerLine({ friend, doors, answer }: Question): string {
    const right = doors[answer];
    if (right.kind === 'color') return `${capitalized(right.color)} friend is home!`;
    if (right.kind === 'size') return `${capitalized(right.size)} friend is home!`;
    return `${capitalized(friend.shape)} is home!`;
  },

  /** Sticker friends name themselves in full: color and shape together. */
  stickerLine: ({ friend }: Sticker): string => `I'm ${withArticle(looks(friend))}!`,

  doorLabel(door: Door): string {
    if (door.kind === 'shape') return `${door.shape} door`;
    if (door.kind === 'color') return `${door.color} door`;
    return `${door.size} door`;
  },

  wrongLines: WRONG_LINES,
  giggleLines: GIGGLE_LINES,
  hintLine: 'Not my door! Try this one!',
  introLine: 'Help the friends get home!',
  playLine: 'Tap to play!',
  partyLine: 'Everyone is home! Hooray!',
  newStickerLine: 'A new sticker for you!',
  oldStickerLine: 'Your old friend came back!',
};

export type Text = typeof en;
