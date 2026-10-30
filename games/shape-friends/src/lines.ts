import type { Door, Friend, Question } from './rounds.ts';

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

/** What a friend says when it arrives. Level 4 adds the disguise; level 5 speaks the rule. */
export function promptLine({ friend, doors, answer }: Question): string {
  const right = doors[answer];
  if (right.kind === 'color') return `Who is ${right.color}? I am!`;
  if (right.kind === 'size') return `Who is ${right.size}? I am!`;
  return friend.size === 'middle' ? `I'm ${withArticle(friend.shape)}!` : `I'm ${withArticle(looks(friend))}!`;
}

export function cheerLine({ friend, doors, answer }: Question): string {
  const right = doors[answer];
  if (right.kind === 'color') return `${capitalized(right.color)} friend is home!`;
  if (right.kind === 'size') return `${capitalized(right.size)} friend is home!`;
  return `${capitalized(friend.shape)} is home!`;
}

/** Sticker friends name themselves in full: color and shape together. */
export function stickerLine(friend: Friend): string {
  return `I'm ${withArticle(looks(friend))}!`;
}

export function doorLabel(door: Door): string {
  if (door.kind === 'shape') return `${door.shape} door`;
  if (door.kind === 'color') return `${door.color} door`;
  return `${door.size} door`;
}

export const WRONG_LINES = ['Not my door!', 'Oopsie! Not my door!', 'Silly me! Not my door!'] as const;
export const HINT_LINE = 'Not my door! Try this one!';
export const INTRO_LINE = 'Help the friends get home!';
export const PLAY_LINE = 'Tap to play!';
export const PARTY_LINE = 'Everyone is home! Hooray!';
export const NEW_STICKER_LINE = 'A new sticker for you!';
export const OLD_STICKER_LINE = 'Your old friend came back!';
export const GIGGLE_LINES = ['Hee hee! That tickles!', 'Ha ha! Hello there!', 'Boop! You found me!'] as const;
