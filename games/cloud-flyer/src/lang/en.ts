import type { LevelId } from '../course.ts';
import type { FlyerId } from '../flyers.ts';
import type { WorldId } from '../worlds.ts';

export const en = {
  title: 'Cloud Flyer',
  description: 'Fly through glowing rings over floating islands in 3D, and land on a bouncy cloud. One finger, no losing, for ages 4 to 9.',
  home: 'Back to Playroom',
  sayAgain: 'Say it again',
  changeFlyer: 'Pick another flyer',
  worldGroup: 'Where to fly',
  levelGroup: 'How hard',
  no3d: 'This device can’t show the sky. Try it on another tablet or computer!',
  pick: 'Who wants to fly?',
  flyers: {
    plane: 'Little plane!',
    dragon: 'Dragon!',
    unicorn: 'Unicorn!',
    rocket: 'Rocket!',
    balloon: 'Balloon!',
    bee: 'Bumblebee!',
  } satisfies Record<FlyerId, string> as Record<FlyerId, string>,
  worlds: {
    sunny: 'Sunny Islands!',
    sunset: 'Sunset!',
    snow: 'Snow Peaks!',
    night: 'Night Sky!',
    candy: 'Candy Clouds!',
  } satisfies Record<WorldId, string> as Record<WorldId, string>,
  levels: {
    easy: 'Easy!',
    swoopy: 'Swoopy!',
    wild: 'Wild!',
  } satisfies Record<LevelId, string> as Record<LevelId, string>,
  steer: 'Hold your finger and fly!',
  chain5: 'Five in a row!',
  chain10: 'Ten in a row!',
  chain20: 'Twenty in a row!',
  whale: 'Look, a whale!',
  birds: 'The birds are flying with you!',
  tunnel: 'Rainbow tunnel!',
  approach: 'Land on the bouncy cloud!',
  catchMe: 'Catch me!',
  blessYou: 'Bless you!',
  achoo: 'Achoo!',
  stars1: 'Nice landing! One star!',
  stars2: 'Great flying! Two stars!',
  stars3: 'Wow! Three stars!',
  newBest: 'Your best score yet!',
  newTrail: 'A new sparkle trail!',
  again: 'Fly again!',
  score: 'Score',
  best: 'Best',
  found: 'Sky friends found',
  starsCount: 'Stars',
};

export type Text = typeof en;
