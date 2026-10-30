import type { Landmark } from '../scenes.ts';

const FRIENDS = { bunny: 'Bunny', bear: 'Bear', panda: 'Panda', fox: 'Fox' };

const SCENES = { bedroom: 'Bedroom', garden: 'Garden', kitchen: 'Kitchen', farm: 'Farm' };

/** With the article, ready for a sentence. One noun, so spoken clues stay short. */
const SPOTS = {
  curtain: 'the curtain',
  plant: 'the plant',
  wardrobe: 'the wardrobe',
  bed: 'the bed',
  tent: 'the tent',
  chest: 'the chest',
  box: 'the box',
  basket: 'the basket',
  pillow: 'the pillow',
  bush: 'the bush',
  shed: 'the shed',
  flowers: 'the flowers',
  log: 'the log',
  rock: 'the rock',
  pot: 'the pot',
  mushroom: 'the mushroom',
  bucket: 'the bucket',
  cupboard: 'the cupboard',
  fridge: 'the fridge',
  oven: 'the oven',
  table: 'the table',
  bag: 'the bag',
  doghouse: 'the doghouse',
  hay: 'the hay',
  barrel: 'the barrel',
  truck: 'the truck',
  corn: 'the corn',
};

const LANDMARKS = {
  window: 'the window',
  clock: 'the clock',
  door: 'the door',
  tree: 'the tree',
  kite: 'the kite',
  gate: 'the gate',
  barn: 'the barn',
  tractor: 'the tractor',
  fence: 'the fence',
};

/** At most two words: each shares a sentence with a clue. */
const SURPRISES = {
  sleepy: 'Shh! Sleepy!',
  sock: 'Stinky sock!',
  notMe: 'Not me!',
  teddy: 'Hello, teddy!',
  quack: 'Quack quack!',
  shoe: 'Silly shoe!',
  notHere: 'Not here!',
  boing: 'Boing boing!',
  turtle: 'Hello, turtle!',
  snail: 'Hello, snail!',
  ribbit: 'Ribbit ribbit!',
  flap: 'Flap flap!',
  buzz: 'Buzz buzz!',
  wiggle: 'Wiggle wiggle!',
  tweet: 'Tweet tweet!',
  cookie: 'Yummy cookie!',
  banana: 'Silly banana!',
  spoons: 'Just spoons!',
  cheese: 'Stinky cheese!',
  crunch: 'Crunch crunch!',
  sour: 'Sour face!',
  peep: 'Peep peep!',
  oink: 'Oink oink!',
  baa: 'Baa baa!',
  moo: 'Moo moo!',
  maa: 'Maa maa!',
};

export type FriendId = keyof typeof FRIENDS;
export type SceneId = keyof typeof SCENES;
export type SpotId = keyof typeof SPOTS;
export type LandmarkId = keyof typeof LANDMARKS;
export type SurpriseId = keyof typeof SURPRISES;
export type Neighbor = 'nextTo' | 'under' | 'above';

const NEIGHBOR_WORDS: Record<Neighbor, string> = { nextTo: 'next to', under: 'under', above: 'above' };

export const en = {
  title: 'Hide and Peek',
  description:
    'A pass-the-tablet hide and seek game for a 4-year-old and a grown-up. Practice memory, position words and taking turns.',
  backHome: 'Back to Playroom',
  stars: 'Stars',
  sayAgain: 'Say it again',
  levelsLabel: 'Grown-up: how many hiding places',
  spotCount: (n: number) => `${n} spots`,
  startOverLabel: 'Grown-up: start over',
  startOver: 'Start over',

  eyesShut: 'Eyes shut!',
  ready: 'Ready!',
  hereICome: 'Here I come!',
  next: 'Next!',
  hooray: 'Hooray!',
  playAgain: 'Play again',

  friendName: (friend: FriendId): string => FRIENDS[friend],
  sceneName: (scene: SceneId): string => SCENES[scene],
  spotName: (spot: SpotId): string => SPOTS[spot],

  whoHides: 'Who will hide?',
  wherePlay: 'Where will we play?',
  closeEyes: (swapped: boolean) => (swapped ? 'Your turn to hide! ' : '') + 'Close your eyes, seeker!',
  hideFriend: (friend: FriendId) => `Hide ${FRIENDS[friend]}! Tap a hiding place!`,
  hidden: 'Hee hee! Now tap Ready!',
  pass: 'Pass it over! Ready or not!',
  whereIs: (friend: FriendId) => `Where is ${FRIENDS[friend]}? Tap to look!`,
  // English doesn't say where the friend was, so `_spot` only matters to languages that do.
  found: (friend: FriendId, _spot: SpotId) => `Peekaboo! You found ${FRIENDS[friend]}!`,
  end: 'You both found everyone!',

  landmarkClue: (landmark: Pick<Landmark, 'id' | 'word'>) => `${landmark.word} ${LANDMARKS[landmark.id]}`,
  neighborClue: (neighbor: Neighbor, spot: SpotId) => `${NEIGHBOR_WORDS[neighbor]} ${SPOTS[spot]}`,
  rows: ['up high', 'in the middle', 'down low'],
  look: (clue: string) => `Look ${clue}!`,
  warmer: 'Warmer!',
  seeWiggle: 'See it wiggle?',
  surprises: SURPRISES,

  /** Device voices read a joke and its clue as one sentence, so English keeps them together. */
  speakInParts: false,
};

export type Text = typeof en;
