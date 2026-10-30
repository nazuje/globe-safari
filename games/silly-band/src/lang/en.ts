import type { MemberId } from '../band.ts';
import type { StyleId } from '../styles.ts';

export const en = {
  title: 'Silly Band',
  description: 'Tap six silly musicians to play, start the band, record a song and go wild.',
  home: 'Back to Playroom',
  names: {
    frog: 'Frog',
    robot: 'Robot',
    dino: 'Dinosaur',
    cat: 'Cat',
    alien: 'Alien',
    chicken: 'Chicken',
  } satisfies Record<MemberId, string>,
  styles: {
    march: 'March',
    disco: 'Disco',
    lullaby: 'Lullaby',
    robot: 'Robot',
    circus: 'Circus',
  } satisfies Record<StyleId, string>,
  play: 'Play',
  pause: 'Stop',
  record: 'Record',
  recording: 'Recording',
  clear: 'Clear the song',
  say: {
    name: (name: string): string => `${name}!`,
    cheers: ['Hooray!', 'Bravo!', 'Yay!', 'Wow!'],
    record: 'Recording!',
    listen: 'Listen to your band!',
    egg: 'An egg!',
    friend: 'A new friend!',
    solo: 'Solo time!',
    crowd: 'The crowd goes wild!',
  },
};

export type Text = typeof en;
