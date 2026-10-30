export type CharacterId = 'dino' | 'unicorn' | 'kitten' | 'robot' | 'frog' | 'tractor' | 'crown' | 'octopus';

export interface Character {
  id: CharacterId;
  emoji: string;
  /** The balloon's color. */
  color: string;
}

export const CHARACTERS: readonly Character[] = [
  { id: 'dino', emoji: '🦕', color: '#3ecf8e' },
  { id: 'unicorn', emoji: '🦄', color: '#b07cff' },
  { id: 'kitten', emoji: '🐱', color: '#ff9f43' },
  { id: 'robot', emoji: '🤖', color: '#4cb8ff' },
  { id: 'frog', emoji: '🐸', color: '#a4d65e' },
  { id: 'tractor', emoji: '🚜', color: '#ff6b6b' },
  { id: 'crown', emoji: '👑', color: '#ffc93c' },
  { id: 'octopus', emoji: '🐙', color: '#ff7ac6' },
];

const STARTERS = 6;
/** After this many rounds on a device, two new friends turn up. */
export const NEW_FRIENDS_AFTER_ROUNDS = 8;

export function availableCharacters(roundsPlayed: number): readonly Character[] {
  return roundsPlayed >= NEW_FRIENDS_AFTER_ROUNDS ? CHARACTERS : CHARACTERS.slice(0, STARTERS);
}

export function characterInfo(id: CharacterId): Character {
  const found = CHARACTERS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown character ${id}`);
  return found;
}

export const STICKERS: readonly string[] = [
  '🍌', '🧦', '🦆', '🥒', '🧀', '🍕', '🐌', '🥦', '🍩', '👃', '🦷', '🎩', '🧸', '🌵', '🦔', '🐷',
];

/** The stickers won so far, newest first. Each win adds the next one, and the sheet starts over after the last. */
export function stickersFor(wins: number, most: number): string[] {
  const shown: string[] = [];
  for (let win = wins; win > 0 && shown.length < most; win--) {
    shown.push(STICKERS[(win - 1) % STICKERS.length]);
  }
  return shown;
}
