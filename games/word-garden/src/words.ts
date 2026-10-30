export interface PictureWord {
  word: string;
  emoji: string;
}

export interface Level {
  id: number;
  name: string;
  sample: string;
  /** How many wrong letters join the word's own letters in the tray. */
  extras: number;
  words: readonly PictureWord[];
}

export function pictures(entries: Record<string, string>): PictureWord[] {
  return Object.entries(entries).map(([word, emoji]) => ({ word, emoji }));
}

export const LEVELS: readonly Level[] = [
  {
    id: 1,
    name: '3 letters',
    sample: '🐱',
    extras: 1,
    words: pictures({
      cat: '🐱',
      dog: '🐶',
      sun: '☀️',
      pig: '🐷',
      bus: '🚌',
      hat: '🎩',
      bed: '🛏️',
      cup: '☕',
      fox: '🦊',
      hen: '🐔',
      bug: '🐞',
      map: '🗺️',
      web: '🕸️',
      cap: '🧢',
      box: '📦',
      bag: '👜',
      van: '🚐',
      ten: '🔟',
      pen: '🖊️',
    }),
  },
  {
    id: 2,
    name: '4 letters',
    sample: '🐸',
    extras: 2,
    words: pictures({
      frog: '🐸',
      ship: '🚢',
      fish: '🐟',
      duck: '🦆',
      milk: '🥛',
      star: '⭐',
      drum: '🥁',
      tree: '🌳',
      moon: '🌙',
      cake: '🎂',
      bell: '🔔',
      sock: '🧦',
      crab: '🦀',
      corn: '🌽',
      ring: '💍',
      kite: '🪁',
      flag: '🚩',
      tent: '⛺',
    }),
  },
  {
    id: 3,
    name: '5 letters',
    sample: '🍎',
    extras: 3,
    words: pictures({
      apple: '🍎',
      horse: '🐴',
      train: '🚂',
      house: '🏠',
      snake: '🐍',
      chair: '🪑',
      whale: '🐳',
      cloud: '☁️',
      tiger: '🐯',
      robot: '🤖',
      mouse: '🐭',
      sheep: '🐑',
      zebra: '🦓',
      lemon: '🍋',
      clock: '⏰',
      truck: '🚚',
      panda: '🐼',
      spoon: '🥄',
      crown: '👑',
      heart: '❤️',
    }),
  },
];

/** The level and picture for a word, or undefined for a word no longer in the game. */
export function findWord(
  word: string,
  levels: readonly Level[] = LEVELS,
): { level: Level; picture: PictureWord } | undefined {
  for (const level of levels) {
    const picture = level.words.find((entry) => entry.word === word);
    if (picture) return { level, picture };
  }
  return undefined;
}
