import type { Animal } from '../animals.ts';

export const en = {
  title: 'Memory Zoo',
  description:
    'A matching-pairs game with zoo animals for a child and a grown-up to play in turns, or solo. Every animal is spoken aloud.',
  homeLabel: 'Back to Playroom',
  repeatLabel: 'Say that again',
  intro: 'Find the animal pairs!',

  whoPlays: "Who's playing?",
  howManyCards: 'How many cards?',
  play: 'Play! 🐾',
  modes: {
    together: { label: 'Together', spoken: 'Together! Take turns.' },
    solo: { label: 'Just me', spoken: 'Just me!' },
  },
  sizes: {
    6: { label: 'Easy', spoken: 'Easy! Six pairs.' },
    8: { label: 'Medium', spoken: 'Medium! Eight pairs.' },
    12: { label: 'Hard', spoken: 'Hard! Twelve pairs.' },
  },
  sizeNote: (pairs: number) => `${pairs} pairs`,
  bestNote: (best: number) => `Best ${best}`,
  playerNames: ['Kid', 'Grown-up'] as [string, string],
  soloName: 'You',
  changeFace: (name: string) => `Change ${name}'s picture`,

  flipCount: (flips: number) => `${flips} flips`,
  cardDown: (position: number) => `Card ${position}, face down`,
  animalName: (animal: Animal) => animal.name,
  findPairs: 'Find the pairs!',
  tryAgain: 'Try again!',
  matchLine: (animal: Animal, goesAgain: boolean) => {
    const line = `Two ${animal.plural.toLowerCase()}!`;
    return goesAgain ? `${line} Go again!` : line;
  },
  turnLine: (name: string) => `${name}'s turn!`,

  mostFound: (name: string) => `${name} found the most!`,
  tie: 'You both win!',
  soloHeadline: 'You found them all!',
  soloSpoken: (flips: number, isNew: boolean) =>
    isNew ? `You found them all! ${flips} flips. A new best!` : `You found them all! ${flips} flips.`,
  newBest: 'New best!',
  bestDetail: (best: number) => `Best: ${best}`,
  playAgain: 'Play again 🔁',
  changeGame: 'Change game',
};

export type Text = typeof en;
