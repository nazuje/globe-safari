import type { PlaceId } from './places.ts';

/** Every shelf in the Treasure Room, and the spoken line a find from it gets. */
export type Family = 'gem' | 'pirate' | 'royal' | 'toy' | 'space' | 'nature' | 'friend' | 'gold' | 'dragon' | 'bone';

export interface Item {
  id: string;
  family: Family;
  /** An emoji, or the name of a drawing in art.ts such as "gem:#ff5a7a". */
  art: string;
  /** Only buried in this place. */
  place?: PlaceId;
}

function group(family: Family, entries: Record<string, string>, place?: PlaceId): Item[] {
  return Object.entries(entries).map(([id, art]) => ({ id, family, art, ...(place ? { place } : {}) }));
}

export const PIECES = ['skull', 'neck', 'ribs', 'tail', 'arms', 'legs'] as const;
export type Piece = (typeof PIECES)[number];

export const DINOS = ['longneck', 'threehorn', 'bigtooth'] as const;
export type DinoId = (typeof DINOS)[number];

export const boneId = (dino: DinoId, piece: Piece): string => `${dino}-${piece}`;

const BONES: Item[] = DINOS.flatMap((dino) =>
  PIECES.map((piece) => ({ id: boneId(dino, piece), family: 'bone' as const, art: '🦴' })),
);

export const ITEMS: Item[] = [
  ...group('gem', {
    ruby: 'gem:#ff4d6d',
    sapphire: 'gem:#3f8cff',
    emerald: 'gem:#2fcf83',
    amethyst: 'gem:#a564ff',
    topaz: 'gem:#ffc21f',
    aqua: 'gem:#29d6e0',
  }),
  ...group('pirate', {
    coin: 'coin',
    bag: '💰',
    key: '🗝️',
    compass: '🧭',
    map: '🗺️',
    anchor: '⚓',
  }),
  ...group('royal', { crown: '👑', 'party-crown': 'crown:#ff6fb1', ring: '💍', vase: '🏺' }),
  ...group('toy', {
    teddy: '🧸',
    train: '🚂',
    car: '🚗',
    robot: '🤖',
    unicorn: '🦄',
    dice: '🎲',
    kite: 'kite',
    puzzle: '🧩',
  }),
  ...group('space', { rocket: '🚀' }),
  ...group('space', { saucer: '🛸', planet: '🪐', comet: '☄️' }, 'moon'),
  ...group('nature', { shell: '🐚', sandcastle: '🏰' }, 'beach'),
  ...group('nature', { acorn: '🌰', mushroom: '🍄' }, 'forest'),
  ...group('nature', { mitten: '🧤', sled: '🛷' }, 'snow'),
  ...group('nature', { trident: '🔱', pearl: 'pearl' }, 'sea'),
  ...group('friend', { mole: 'mole', worm: 'worm', snail: '🐌', ladybug: '🐞' }),
  ...group('friend', { crab: '🦀' }, 'beach'),
  ...group('friend', { hedgehog: '🦔' }, 'forest'),
  ...group('friend', { penguin: '🐧' }, 'snow'),
  ...group('friend', { alien: '👾' }, 'moon'),
  ...group('friend', { octopus: '🐙' }, 'sea'),
  ...group('gold', { cup: '🏆', bell: '🔔', trumpet: '🎺', star: '🌟', chick: '🐥' }),
  ...group('dragon', {
    'dragon-mint': 'dragon:#58d6a0',
    'dragon-sky': 'dragon:#6db8ff',
    'dragon-plum': 'dragon:#b98bff',
  }),
  ...BONES,
];

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}

export function itemsIn(family: Family): Item[] {
  return ITEMS.filter((item) => item.family === family);
}

/** Things a plain patch can bury: no bones, friends or the rare prizes, which each have their own rule. */
export function buriable(place: PlaceId): Item[] {
  const plain: Family[] = ['gem', 'pirate', 'royal', 'toy', 'space', 'nature'];
  return ITEMS.filter((item) => plain.includes(item.family) && (!item.place || item.place === place));
}

export function friendsAt(place: PlaceId): Item[] {
  return itemsIn('friend').filter((item) => !item.place || item.place === place);
}

/** Harmless silly finds under a tile. They aren't collected. */
export const SILLIES = ['sock', 'boot', 'potato', 'carrot', 'toot', 'sprout'] as const;
export type Silly = (typeof SILLIES)[number];
