import type { ObstacleKind } from './course.ts';

export type SceneId = 'city' | 'farm' | 'beach' | 'space' | 'candy';

export interface Scene {
  id: SceneId;
  /** Ground on each side of the road, with a second tone for the rolling bands. */
  left: [string, string];
  right: [string, string];
  /** Tiny flecks on the ground: grass, sand, stars. */
  speck: string;
  road: string;
  roadEdge: string;
  dash: string;
  kerb: [string, string];
  thingsLeft: readonly string[];
  thingsRight: readonly string[];
  /** Repeats make a kind more likely, so each place has its own favorite obstacles. */
  obstacles: readonly ObstacleKind[];
}

/** One of everything first, so any place can still surprise you with any obstacle. */
const MIX: readonly ObstacleKind[] = ['cow', 'puddle', 'hay', 'duck', 'cone'];

export const SCENES: readonly Scene[] = [
  {
    id: 'city',
    left: ['#a9d8a0', '#9fd096'],
    right: ['#a9d8a0', '#9fd096'],
    speck: '#8cc083',
    road: '#5b6072',
    roadEdge: '#4b4f60',
    dash: '#ffffff',
    kerb: ['#ff6b6b', '#ffffff'],
    thingsLeft: ['🏢', '🏠', '🏬', '🌳', '🏫', '🌳'],
    thingsRight: ['🏡', '🌳', '🏪', '🏰', '🌲', '⛲'],
    obstacles: [...MIX, 'cone', 'cone', 'puddle'],
  },
  {
    id: 'farm',
    left: ['#8fdc6d', '#84d162'],
    right: ['#ffe07a', '#f7d566'],
    speck: '#6dbb4c',
    road: '#b98a58',
    roadEdge: '#a0744a',
    dash: '#f4dfb4',
    kerb: ['#fff1d6', '#8a5a33'],
    thingsLeft: ['🌻', '🌳', '🐑', '🏡', '🐓', '🌷'],
    thingsRight: ['🌾', '🌽', '🌾', '🐖', '🌾', '🐎'],
    obstacles: [...MIX, 'cow', 'cow', 'cow', 'hay', 'hay'],
  },
  {
    id: 'beach',
    left: ['#ffe6a7', '#fbdc94'],
    right: ['#4cc9f0', '#3fbce4'],
    speck: '#e8c678',
    road: '#d7c2a0',
    roadEdge: '#c0a982',
    dash: '#ffffff',
    kerb: ['#ffffff', '#4cb8ff'],
    thingsLeft: ['🌴', '⛱️', '🐚', '🦀', '🌴', '🏖️'],
    thingsRight: ['⛵', '🐬', '🐠', '🏝️', '🐙', '🐳'],
    obstacles: [...MIX, 'duck', 'duck', 'duck', 'puddle', 'puddle'],
  },
  {
    id: 'space',
    left: ['#231a4d', '#2a2058'],
    right: ['#231a4d', '#2a2058'],
    speck: '#fff6c9',
    road: '#463a86',
    roadEdge: '#372c6e',
    dash: '#7ff0ff',
    kerb: ['#7ff0ff', '#c79bff'],
    thingsLeft: ['🪐', '🌙', '☄️', '👽', '🌟', '🛰️'],
    thingsRight: ['🌍', '👾', '🌕', '🛰️', '🪐', '🌟'],
    obstacles: [...MIX, 'duck', 'cow'],
  },
  {
    id: 'candy',
    left: ['#ffc9e3', '#ffbddc'],
    right: ['#c7f5e6', '#b8efdc'],
    speck: '#ff9fce',
    road: '#8a5a44',
    roadEdge: '#744936',
    dash: '#fff3f8',
    kerb: ['#ff6fb5', '#fff3f8'],
    thingsLeft: ['🍭', '🍬', '🧁', '🍩', '🍫', '🍰'],
    thingsRight: ['🍦', '🍪', '🍭', '🍧', '🍬', '🎂'],
    obstacles: [...MIX, 'duck', 'hay', 'puddle'],
  },
];

/** A saved count of races picks the place, so every race goes somewhere new. */
export function sceneForRace(raceNumber: number): Scene {
  const index = Number.isInteger(raceNumber) && raceNumber >= 0 ? raceNumber % SCENES.length : 0;
  return SCENES[index]!;
}

/** Scrambles whole numbers into 0 to 1. The same spot always gets the same thing, so scenery can scroll for ever. */
export function hash(a: number, b = 0): number {
  const n = Math.imul(a ^ Math.imul(b + 1, 0x9e3779b1), 0x85ebca6b);
  return (Math.imul(n ^ (n >>> 13), 0xc2b2ae35) >>> 0) / 2 ** 32;
}

/** What stands at one roadside spot, or null for a gap so it never looks like a fence. */
export function thingAt(things: readonly string[], row: number, column: number): string | null {
  if (hash(row, column) < 0.35) return null;
  return things[Math.floor(hash(row, column + 50) * things.length)] ?? null;
}
