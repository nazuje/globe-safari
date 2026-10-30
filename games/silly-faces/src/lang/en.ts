import type { Part, Tab } from '../parts.ts';
import type { Reaction } from '../reactions.ts';

/** Every label for one part, by option id. */
type Labels = Record<string, string>;

export const en = {
  title: 'Silly Faces',
  description: 'Dress up a big cuddly creature, tickle it, make it dance and fill a wall with friends. No goals and no wrong choices.',

  intro: 'Tap me, or change my look!',
  delighted: ['Ooh, I love it!', 'So fancy!', 'Yes, yes, yes!', 'Wow, look at me!', 'Silly me!'],
  reactions: {
    burp: 'Oops! Excuse me!',
    sneeze: 'Achoo! Oh dear!',
    toot: 'Oops! So embarrassing!',
    giggle: 'Hee hee, that tickles!',
    yawn: 'Oh, I am so sleepy.',
    spin: 'Wheee, I am spinning!',
    tiny: 'Peekaboo! Look who is here!',
    insideOut: 'Whoa! Look at my new color!',
    float: 'Up, up, up!',
  } satisfies Record<Reaction, string>,
  shuffled: 'Who am I now?',
  dance: "Let's dance!",
  danceAll: 'Everybody dance!',
  saved: 'Click! A new friend!',
  known: 'That one is on the wall!',
  back: 'Here I am again!',
  takePicture: 'Take my picture!',

  // For screen readers and grown-ups. A child never needs these.
  ui: {
    home: 'Back to Playroom',
    creature: 'The creature. Tap it!',
    again: 'Hear it again',
    dice: 'Shuffle everything',
    dance: 'Dance',
    camera: 'Take a picture',
    wall: 'Friends wall',
    wallTitle: 'Friends',
    close: 'Close',
    danceAll: 'Everybody dance',
    empty: 'Empty spot',
    friend: (n: number) => `Friend ${n}`,
  },
  tabs: {
    body: 'Body',
    eyes: 'Eyes',
    mouth: 'Mouth',
    hair: 'Hair and horns',
    hat: 'Hats',
    held: 'Things to hold',
  } satisfies Record<Tab, string>,
  options: {
    shape: { round: 'Round', tall: 'Tall', pear: 'Pear', cloud: 'Fluffy cloud' },
    color: { teal: 'Teal', coral: 'Coral', sun: 'Yellow', grape: 'Purple', leaf: 'Green', sky: 'Blue' },
    eyes: {
      friendly: 'Two friendly eyes',
      one: 'One eye',
      three: 'Three eyes',
      googly: 'Googly eyes',
      sleepy: 'Sleepy eyes',
      sparkly: 'Sparkly eyes',
    },
    mouth: { smile: 'Smile', huge: 'Huge smile', fangs: 'Fangs', tongue: 'Tongue out', kissy: 'Kissy lips', oh: 'Little oh' },
    hair: { none: 'No hair', tuft: 'Tuft', spikes: 'Spikes', curls: 'Curls', bunches: 'Bunches', horns: 'Horns' },
    hat: {
      none: 'No hat',
      crown: 'Crown',
      cowboy: 'Cowboy hat',
      pirate: 'Pirate hat',
      wizard: 'Wizard hat',
      flower: 'Flower',
      helmet: 'Construction helmet',
      unicorn: 'Unicorn horn',
      antennae: 'Antennae',
    },
    held: {
      none: 'Nothing',
      balloon: 'Balloon',
      icecream: 'Ice cream',
      wrench: 'Wrench',
      wand: 'Magic wand',
      teddy: 'Teddy bear',
      guitar: 'Guitar',
    },
  } satisfies Record<Part, Labels>,
};

export type Text = typeof en;
