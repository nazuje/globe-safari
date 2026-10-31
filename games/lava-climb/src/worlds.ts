import type { WorldId } from './levels.ts';

export interface World {
  id: WorldId;
  /** Backdrop, far then near. */
  skyTop: string;
  skyBottom: string;
  brick: string;
  brickLine: string;
  /** Solid rock: body, shaded edge and the lit top. */
  rock: string;
  rockDark: string;
  rockTop: string;
  ledge: string;
  ledgeTop: string;
  accent: string;
}

export const WORLDS: Record<WorldId, World> = {
  shaft: {
    id: 'shaft',
    skyTop: '#1a0a12',
    skyBottom: '#3a1218',
    brick: '#2c1319',
    brickLine: '#1a0a10',
    rock: '#4c2a2c',
    rockDark: '#2e171c',
    rockTop: '#a85a3a',
    ledge: '#8a4a30',
    ledgeTop: '#ffb35c',
    accent: '#ff7a2f',
  },
  ice: {
    id: 'ice',
    skyTop: '#07162e',
    skyBottom: '#123a5c',
    brick: '#0f2d4d',
    brickLine: '#0a2039',
    rock: '#2c6688',
    rockDark: '#173f5e',
    rockTop: '#c9f4ff',
    ledge: '#4aa8cf',
    ledgeTop: '#dffaff',
    accent: '#7fe7ff',
  },
  clock: {
    id: 'clock',
    skyTop: '#14130f',
    skyBottom: '#2f2a1a',
    brick: '#262116',
    brickLine: '#17140c',
    rock: '#5e4a22',
    rockDark: '#3a2d14',
    rockTop: '#e7bb4a',
    ledge: '#2a8f83',
    ledgeTop: '#5fe8d2',
    accent: '#ffd25a',
  },
  top: {
    id: 'top',
    skyTop: '#08052a',
    skyBottom: '#2a1a66',
    brick: '#1a1250',
    brickLine: '#110b3a',
    rock: '#46388c',
    rockDark: '#2a2160',
    rockTop: '#d3c4ff',
    ledge: '#8a5cd8',
    ledgeTop: '#ffd9ff',
    accent: '#ff7ae0',
  },
};
