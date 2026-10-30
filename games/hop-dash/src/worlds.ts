import type { WorldPhysics } from './tuning.ts';

export const WORLD_IDS = ['meadow', 'beach', 'pumpkin', 'ice', 'candy', 'moon'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export interface World {
  id: WorldId;
  art: string;
  physics: WorldPhysics;
  sky: [string, string];
  far: string;
  near: string;
  /** The top line of the ground, and the ground under it. */
  grass: string;
  soil: string;
  soilDeep: string;
  /** What's at the bottom of a gap. */
  pit: string;
  pitShine: string;
  platform: string;
  platformTop: string;
  jelly: string;
  jellyShine: string;
  cap: string;
  /** Art standing about on the ground. */
  decor: string[];
  /** Art drifting across the sky. Empty means clouds. */
  drift: string[];
  dark: boolean;
}

const NORMAL: WorldPhysics = { gravity: 1, jump: 1 };

export const WORLDS: Record<WorldId, World> = {
  meadow: {
    id: 'meadow',
    art: '🌼',
    physics: NORMAL,
    sky: ['#7fd0ff', '#d9f4ff'],
    far: '#a5e29a',
    near: '#7ed07a',
    grass: '#58b947',
    soil: '#a9743f',
    soilDeep: '#8a5a2e',
    pit: '#4cb8ff',
    pitShine: '#b6e6ff',
    platform: '#a9743f',
    platformTop: '#58b947',
    jelly: '#ff7fb0',
    jellyShine: '#ffd3e4',
    cap: '#ff5a5a',
    decor: ['🌼', '🌷', '🌳', '🌻', '🦋'],
    drift: [],
    dark: false,
  },
  beach: {
    id: 'beach',
    art: '🏖️',
    physics: NORMAL,
    sky: ['#58c7f3', '#fff0c9'],
    far: '#5fd3d0',
    near: '#8fe6d8',
    grass: '#ffe08a',
    soil: '#f3c56b',
    soilDeep: '#dba64c',
    pit: '#2fa8e0',
    pitShine: '#a8ecff',
    platform: '#c98a4b',
    platformTop: '#ffe08a',
    jelly: '#7f6bff',
    jellyShine: '#d6d0ff',
    cap: '#ff8a3c',
    decor: ['🌴', '🐚', '🦀', '🏖️', '⛱️', '🐢'],
    drift: [],
    dark: false,
  },
  pumpkin: {
    id: 'pumpkin',
    art: '🎃',
    physics: NORMAL,
    sky: ['#3b2a6b', '#b0619a'],
    far: '#4b3a80',
    near: '#5c3f7a',
    grass: '#7a5bb5',
    soil: '#4d3a70',
    soilDeep: '#3b2c58',
    pit: '#2a1f4a',
    pitShine: '#6d58a8',
    platform: '#6b4a2e',
    platformTop: '#ff9d3c',
    jelly: '#ff9d3c',
    jellyShine: '#ffe0b0',
    cap: '#9dd94a',
    decor: ['🎃', '🌻', '👻', '🍂', '🕸️', '🌙'],
    drift: ['🦇', '👻'],
    dark: true,
  },
  ice: {
    id: 'ice',
    art: '🧊',
    physics: NORMAL,
    sky: ['#2b7fb8', '#bfeeff'],
    far: '#7cc7ea',
    near: '#a8e0f5',
    grass: '#e9fbff',
    soil: '#9fdcf2',
    soilDeep: '#6fbfe0',
    pit: '#1d6ea8',
    pitShine: '#a0e4ff',
    platform: '#6fbfe0',
    platformTop: '#e9fbff',
    jelly: '#4fd6c4',
    jellyShine: '#c9fff4',
    cap: '#5a7bff',
    decor: ['🧊', '⛄', '🐧', '❄️', '🌲'],
    drift: ['❄️'],
    dark: false,
  },
  candy: {
    id: 'candy',
    art: '🍭',
    physics: NORMAL,
    sky: ['#ffb7dd', '#fff0c2'],
    far: '#ff9fce',
    near: '#ffc4a8',
    grass: '#ff7fbf',
    soil: '#c08552',
    soilDeep: '#a06a3c',
    pit: '#e0529a',
    pitShine: '#ffc2e3',
    platform: '#fff4e0',
    platformTop: '#ff7fbf',
    jelly: '#6fdc6f',
    jellyShine: '#d6ffd6',
    cap: '#ffcf3c',
    decor: ['🍭', '🍬', '🧁', '🍩', '🍪', '🍫'],
    drift: ['🍬'],
    dark: false,
  },
  moon: {
    id: 'moon',
    art: '🌙',
    physics: { gravity: 0.52, jump: 0.78 },
    sky: ['#0d1033', '#37306e'],
    far: '#3d3a78',
    near: '#57539a',
    grass: '#d8d6e6',
    soil: '#a8a5bf',
    soilDeep: '#85829e',
    pit: '#090a24',
    pitShine: '#5a58a0',
    platform: '#85829e',
    platformTop: '#d8d6e6',
    jelly: '#7ce0ff',
    jellyShine: '#d6f6ff',
    cap: '#c77dff',
    decor: ['🌑', '🛸', '👽', '🛰️'],
    drift: ['🌍', '🪐', '☄️'],
    dark: true,
  },
};
