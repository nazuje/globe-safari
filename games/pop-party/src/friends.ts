/**
 * Everyone who can tumble out of a bubble. Emoji stay at Unicode 11 or older, so an old
 * tablet shows the friend and not an empty box. Rare friends only come out of golden bubbles.
 */
export const FRIENDS = [
  { id: 'kitten', emoji: '🐱', rare: false },
  { id: 'puppy', emoji: '🐶', rare: false },
  { id: 'dinosaur', emoji: '🦖', rare: false },
  { id: 'rocket', emoji: '🚀', rare: false },
  { id: 'crown', emoji: '👑', rare: false },
  { id: 'donut', emoji: '🍩', rare: false },
  { id: 'duck', emoji: '🦆', rare: false },
  { id: 'robot', emoji: '🤖', rare: false },
  { id: 'unicorn', emoji: '🦄', rare: false },
  { id: 'tractor', emoji: '🚜', rare: false },
  { id: 'butterfly', emoji: '🦋', rare: false },
  { id: 'frog', emoji: '🐸', rare: false },
  { id: 'fireTruck', emoji: '🚒', rare: false },
  { id: 'iceCream', emoji: '🍦', rare: false },
  { id: 'octopus', emoji: '🐙', rare: false },
  { id: 'helicopter', emoji: '🚁', rare: false },
  { id: 'bunny', emoji: '🐰', rare: false },
  { id: 'ball', emoji: '⚽', rare: false },
  { id: 'penguin', emoji: '🐧', rare: false },
  { id: 'rainbow', emoji: '🌈', rare: false },
  { id: 'lion', emoji: '🦁', rare: false },
  { id: 'turtle', emoji: '🐢', rare: false },
  { id: 'ladybug', emoji: '🐞', rare: false },
  { id: 'elephant', emoji: '🐘', rare: false },
  { id: 'dragon', emoji: '🐲', rare: true },
  { id: 'saucer', emoji: '🛸', rare: true },
  { id: 'alien', emoji: '👽', rare: true },
  { id: 'peacock', emoji: '🦚', rare: true },
  { id: 'diamond', emoji: '💎', rare: true },
  { id: 'trophy', emoji: '🏆', rare: true },
] as const;

export type Friend = (typeof FRIENDS)[number];
export type FriendId = Friend['id'];
