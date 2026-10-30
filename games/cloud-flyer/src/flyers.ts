export const FLYER_IDS = ['plane', 'dragon', 'unicorn', 'rocket', 'balloon', 'bee'] as const;
export type FlyerId = (typeof FLYER_IDS)[number];

export const FLYER_ICONS: Record<FlyerId, string> = {
  plane: '✈️',
  dragon: '🐉',
  unicorn: '🦄',
  rocket: '🚀',
  balloon: '🎈',
  bee: '🐝',
};
