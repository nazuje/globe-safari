export const CHARACTER_IDS = ['fox', 'robotKid', 'ninjaCat', 'astronaut', 'unicorn', 'dino'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** Shown only if the 3D pictures can't be drawn. */
export const CHARACTER_ICONS: Record<CharacterId, string> = {
  fox: '🦊',
  robotKid: '🤖',
  ninjaCat: '🐱',
  astronaut: '🧑‍🚀',
  unicorn: '🦄',
  dino: '🦖',
};
