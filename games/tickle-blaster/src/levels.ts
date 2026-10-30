import type { KindId } from './kinds.ts';

export type PatternId = 'swoop' | 'zigzag' | 'vee' | 'curtain' | 'ring' | 'dive' | 'figure8' | 'spiral' | 'zip' | 'sneeze';
export type LevelId = 'moon' | 'ring' | 'candy' | 'ice' | 'sleepy';
export type SpeedId = 'easy' | 'fast' | 'wild';

export interface Level {
  id: LevelId;
  kinds: readonly [KindId, KindId];
  boss: KindId;
  /** One pattern a wave. The last wave comes from both sides at once. */
  patterns: readonly PatternId[];
}

export const LEVELS: readonly Level[] = [
  {
    id: 'moon',
    kinds: ['puff', 'bloop'],
    boss: 'bossMoon',
    patterns: ['swoop', 'vee', 'zigzag', 'curtain', 'swoop', 'ring', 'dive', 'figure8', 'swoop'],
  },
  {
    id: 'ring',
    kinds: ['ringo', 'wobbo'],
    boss: 'bossRing',
    patterns: ['ring', 'swoop', 'curtain', 'ring', 'dive', 'vee', 'spiral', 'figure8', 'dive'],
  },
  {
    id: 'candy',
    kinds: ['taffy', 'gummo'],
    boss: 'bossCandy',
    patterns: ['zigzag', 'curtain', 'swoop', 'spiral', 'vee', 'zigzag', 'dive', 'ring', 'zigzag'],
  },
  {
    id: 'ice',
    kinds: ['frosty', 'shiver'],
    boss: 'bossIce',
    patterns: ['vee', 'figure8', 'dive', 'curtain', 'spiral', 'swoop', 'ring', 'zigzag', 'figure8'],
  },
  {
    id: 'sleepy',
    kinds: ['snooze', 'yawny'],
    boss: 'bossSleepy',
    patterns: ['curtain', 'spiral', 'figure8', 'swoop', 'ring', 'vee', 'zigzag', 'spiral', 'dive'],
  },
];

export const LEVEL_IDS: readonly LevelId[] = LEVELS.map((level) => level.id);

export function levelById(id: LevelId): Level {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

export interface SpeedRule {
  /** How fast the aliens fly. */
  pace: number;
  /** How many come in a wave. */
  crowd: number;
  /** The chance that an alien is a silly one that drops goo. */
  silly: number;
  /** How hard a feather steers itself toward an alien. Only Easy gets any help. */
  assist: number;
  /** How many tickles it takes to make the boss laugh. */
  bossTickles: number;
  /** The share of laughs and stars a level needs for 2 and for 3 stars. */
  starGood: readonly [number, number];
  /** The chance that an alien from the fifth wave on takes two tickles. */
  tough: number;
}

export const SPEEDS: Record<SpeedId, SpeedRule> = {
  easy: { pace: 0.75, crowd: 0.8, silly: 0.12, assist: 0.35, bossTickles: 60, starGood: [0.4, 0.7], tough: 0 },
  fast: { pace: 1, crowd: 1, silly: 0.2, assist: 0, bossTickles: 75, starGood: [0.5, 0.93], tough: 0.2 },
  wild: { pace: 1.3, crowd: 1.2, silly: 0.28, assist: 0, bossTickles: 90, starGood: [0.5, 0.9], tough: 0.35 },
};

export const SPEED_IDS: readonly SpeedId[] = ['easy', 'fast', 'wild'];
