export type PlaceId = 'beach' | 'forest' | 'snow' | 'moon' | 'sea';

export interface Place {
  id: PlaceId;
  /** Top and bottom of the background. */
  sky: [string, string];
  /** Ground color for a tile with 1, 2 and 3 layers left. */
  ground: [string, string, string];
  hole: string;
  /** Colors of the bits that fly when digging. */
  flecks: [string, string];
  /** Sometimes flies with the bits. */
  fleckEmoji: string;
  /** Scenery around the patch. */
  scenery: string[];
}

export const PLACES: Place[] = [
  {
    id: 'beach',
    sky: ['#7fd8f5', '#fff0c2'],
    ground: ['#f8dc94', '#eec36b', '#d9a24e'],
    hole: '#a8763a',
    flecks: ['#f4d27e', '#d9a24e'],
    fleckEmoji: '🐚',
    scenery: ['☀️', '🌴', '⛱️', '🌊'],
  },
  {
    id: 'forest',
    sky: ['#9fe3a8', '#3f9b62'],
    ground: ['#a9794d', '#8a5d38', '#6d4529'],
    hole: '#3c2616',
    flecks: ['#8a5d38', '#5fae4f'],
    fleckEmoji: '🍂',
    scenery: ['🌲', '🌳', '🍄', '🌲'],
  },
  {
    id: 'snow',
    sky: ['#bfe3ff', '#f4fbff'],
    ground: ['#ffffff', '#dcecfb', '#b4d3ef'],
    hole: '#7fa8cc',
    flecks: ['#ffffff', '#c7e0f6'],
    fleckEmoji: '❄️',
    scenery: ['🏔️', '⛄', '🌨️', '🌲'],
  },
  {
    id: 'moon',
    sky: ['#1c1a4a', '#4a3f8f'],
    ground: ['#d3d2e0', '#adabc2', '#8583a3'],
    hole: '#4b4968',
    flecks: ['#e5e4ef', '#a2a0bc'],
    fleckEmoji: '✨',
    scenery: ['🌍', '⭐', '🛰️', '🌟'],
  },
  {
    id: 'sea',
    sky: ['#2bb5d8', '#0f6fa8'],
    ground: ['#f2d9a0', '#d4b478', '#ad8c58'],
    hole: '#5c4a30',
    flecks: ['#e8cf96', '#bfe9ff'],
    fleckEmoji: '🐟',
    scenery: ['🐠', '🌿', '🐟', '🐡'],
  },
];
