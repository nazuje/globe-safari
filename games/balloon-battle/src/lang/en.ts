import type { CharacterId } from '../characters.ts';
import type { Level } from '../tuning.ts';

export const en = {
  title: 'Balloon Battle',
  description:
    'A two-player tapping race for ages 3 to 9. Pump up your balloon until it goes bang! Little ones and grown-ups can play on equal terms.',
  homeLabel: 'Back to Playroom',
  repeatLabel: 'Say that again',
  sitOpposite: 'Sitting opposite. Tap to sit side by side',
  sitSideBySide: 'Sitting side by side. Tap to sit opposite',
  changePlayers: 'Pick new players',
  start: 'Start',
  rematch: 'Play again',
  playerLabel: (number: number) => `Player ${number}`,
  winsLabel: (wins: number) => (wins === 1 ? '1 win' : `${wins} wins`),

  levels: {
    little: { label: 'Little', ages: '3 to 4' },
    big: { label: 'Big', ages: '5 to 7' },
    grownup: { label: 'Grown-up', ages: '8 and up' },
  } satisfies Record<Level, { label: string; ages: string }>,
  names: {
    dino: 'Dino',
    unicorn: 'Unicorn',
    kitten: 'Kitten',
    robot: 'Robot',
    frog: 'Frog',
    tractor: 'Tractor',
    crown: 'Crown',
    octopus: 'Octopus',
  } satisfies Record<CharacterId, string>,

  pickFriend: 'Pick a friend!',
  pickLevel: 'How big are you?',
  pressGo: 'Press the big button!',
  countdown: ['One!', 'Two!', 'Three!'] as [string, string, string],
  go: 'Go!',
  wins: (name: string) => `${name} wins!`,
  goldRound: 'Golden balloons!',
  again: 'Again?',
  newFriends: 'Two new friends!',
};

export type Text = typeof en;
