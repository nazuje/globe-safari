/** Everyone a child can make laugh, as plain data, so the rules and the art can share it. */

export type KindId =
  | 'puff'
  | 'bloop'
  | 'ringo'
  | 'wobbo'
  | 'taffy'
  | 'gummo'
  | 'frosty'
  | 'shiver'
  | 'snooze'
  | 'yawny'
  | 'goober'
  | 'achoo'
  | 'goldie'
  | 'cat'
  | 'bossMoon'
  | 'bossRing'
  | 'bossCandy'
  | 'bossIce'
  | 'bossSleepy';

export type Body = 'round' | 'bean' | 'cloud' | 'cube' | 'pear' | 'star' | 'squid';
export type Top = 'antenna' | 'horns' | 'ears' | 'tuft' | 'cap' | 'none';

export interface Look {
  body: Body;
  eyes: 1 | 2 | 3;
  top: Top;
  /** Grumpy colors are soft and dull, so turning happy is a real change. */
  grumpy: string;
  happy: string;
  /** Horns, antennae and the belly patch. */
  accent: string;
}

export const LOOKS: Record<KindId, Look> = {
  puff: { body: 'cloud', eyes: 2, top: 'tuft', grumpy: '#8f9bb8', happy: '#ff8fc7', accent: '#ffe066' },
  bloop: { body: 'round', eyes: 1, top: 'antenna', grumpy: '#7fa39a', happy: '#3ee0a0', accent: '#ffc93c' },
  ringo: { body: 'squid', eyes: 2, top: 'none', grumpy: '#a08fb5', happy: '#ffb02e', accent: '#ff6b6b' },
  wobbo: { body: 'pear', eyes: 3, top: 'horns', grumpy: '#8a93a8', happy: '#4cc9ff', accent: '#ffe066' },
  taffy: { body: 'bean', eyes: 2, top: 'ears', grumpy: '#b08f9f', happy: '#ff6fb5', accent: '#fff1a8' },
  gummo: { body: 'cube', eyes: 2, top: 'antenna', grumpy: '#93a388', happy: '#a4e22c', accent: '#ff7ab8' },
  frosty: { body: 'star', eyes: 2, top: 'none', grumpy: '#8fa7bd', happy: '#57e6e0', accent: '#ffffff' },
  shiver: { body: 'bean', eyes: 3, top: 'tuft', grumpy: '#8497b5', happy: '#9b8cff', accent: '#bdf3ff' },
  snooze: { body: 'round', eyes: 2, top: 'cap', grumpy: '#8c8aa8', happy: '#ffc145', accent: '#ff7a7a' },
  yawny: { body: 'squid', eyes: 1, top: 'ears', grumpy: '#9a8fa0', happy: '#ff9d5c', accent: '#ffe9a8' },
  goober: { body: 'pear', eyes: 2, top: 'antenna', grumpy: '#8fae74', happy: '#c6f24a', accent: '#ff7ab8' },
  achoo: { body: 'round', eyes: 2, top: 'none', grumpy: '#a9a3c0', happy: '#ff9ad5', accent: '#ffffff' },
  goldie: { body: 'star', eyes: 2, top: 'antenna', grumpy: '#ffd34d', happy: '#ffd34d', accent: '#fff6c9' },
  cat: { body: 'round', eyes: 2, top: 'ears', grumpy: '#ffb25c', happy: '#ffb25c', accent: '#fff1dd' },
  bossMoon: { body: 'cloud', eyes: 2, top: 'ears', grumpy: '#8d8fb0', happy: '#c58cff', accent: '#ffe066' },
  bossRing: { body: 'round', eyes: 3, top: 'antenna', grumpy: '#94809f', happy: '#ff8a5c', accent: '#ffd166' },
  bossCandy: { body: 'bean', eyes: 2, top: 'ears', grumpy: '#ad8598', happy: '#ff5fa8', accent: '#fff1a8' },
  bossIce: { body: 'cube', eyes: 2, top: 'tuft', grumpy: '#7f9cb5', happy: '#4fd8ff', accent: '#ffffff' },
  bossSleepy: { body: 'pear', eyes: 2, top: 'cap', grumpy: '#85829f', happy: '#ffcf4a', accent: '#ff7a7a' },
};

/** The order of the saved collection: each planet's friends, then the rare ones. */
export const FRIENDS: readonly KindId[] = [
  'puff',
  'bloop',
  'bossMoon',
  'ringo',
  'wobbo',
  'bossRing',
  'taffy',
  'gummo',
  'bossCandy',
  'frosty',
  'shiver',
  'bossIce',
  'snooze',
  'yawny',
  'bossSleepy',
  'goober',
  'achoo',
  'goldie',
  'cat',
];
