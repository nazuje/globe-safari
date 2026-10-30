export const FLOWERS = ['🌷', '🌻', '🌼', '🌹', '🌸'] as const;

export interface Friend {
  emoji: string;
  name: string;
}

export const FRIENDS: readonly Friend[] = [
  { emoji: '🐝', name: 'bee' },
  { emoji: '🦋', name: 'butterfly' },
  { emoji: '🐞', name: 'ladybug' },
  { emoji: '🐌', name: 'snail' },
  { emoji: '🐦', name: 'bird' },
];

export const WORDS_PER_FRIEND = 5;

/** The flower for the plant at this place in the garden, so a saved garden always looks the same. */
export function flowerAt(index: number): string {
  return FLOWERS[index % FLOWERS.length];
}

/** Every friend who has come to a garden of this size, oldest first. */
export function friendsFor(plantCount: number): Friend[] {
  const visits = Math.floor(plantCount / WORDS_PER_FRIEND);
  return Array.from({ length: visits }, (_, visit) => FRIENDS[visit % FRIENDS.length]);
}

/** The friend who arrives with the plant that brought the garden to this size, if any. */
export function friendArriving(plantCount: number): Friend | null {
  if (plantCount === 0 || plantCount % WORDS_PER_FRIEND !== 0) return null;
  return friendsFor(plantCount).at(-1) ?? null;
}
