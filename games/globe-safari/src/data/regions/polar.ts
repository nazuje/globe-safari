import { box, type Region } from '../types.ts';

export const POLAR_REGIONS: Region[] = [
  {
    id: 'arctic',
    name: 'The Arctic',
    emoji: '🧊',
    description:
      'A frozen land of ice and snow at the top of the world, where winter is dark and the summer sun never sets.',
    anchor: { lat: 72, lng: -40 },
    priority: 3,
    shapes: [
      box(66, 90, -180, 180),
      box(59.5, 84, -74, -10), // Greenland
      box(63, 67, -25, -13), // Iceland
      box(62, 90, -141, -60), // Northern Canada
      box(64, 72, -170, -141), // Northern Alaska
    ],
    animals: [
      {
        id: 'polar-bear',
        name: 'Polar Bear',
        emoji: '🐻‍❄️',
        wikiTitle: 'Polar_bear',
        clues: [
          'I am big and I love the cold.',
          'I am a great swimmer and I hunt seals on the sea ice.',
          'I am a big white bear!',
        ],
        funFact:
          'Polar bears have black skin under their white fur, which helps them soak up the warm sunshine.',
      },
      {
        id: 'arctic-fox',
        name: 'Arctic Fox',
        emoji: '🦊',
        wikiTitle: 'Arctic_fox',
        clues: [
          'I am small and fluffy.',
          'My coat turns white in winter and brown in summer.',
          'I am a fox who lives where it is super cold.',
        ],
        funFact: 'Arctic foxes have fur on the bottoms of their paws, like built-in snow boots!',
      },
      {
        id: 'reindeer',
        name: 'Reindeer',
        emoji: '🦌',
        wikiTitle: 'Reindeer',
        clues: [
          'I walk in big herds over the snow.',
          'Both the boys and the girls in my family grow antlers.',
          'Some stories say I help pull Santa’s sleigh!',
        ],
        funFact:
          'Reindeer feet make a clicking sound when they walk, which helps the herd stay together.',
      },
      {
        id: 'snowy-owl',
        name: 'Snowy Owl',
        emoji: '🦉',
        wikiTitle: 'Snowy_owl',
        clues: [
          'I fly without making a sound.',
          'I hunt in the daytime too, and I love to eat lemmings.',
          'I am a big white owl with yellow eyes.',
        ],
        funFact: 'A snowy owl can eat more than 1,000 lemmings in one year!',
      },
      {
        id: 'arctic-hare',
        name: 'Arctic Hare',
        emoji: '🐇',
        wikiTitle: 'Arctic_hare',
        clues: [
          'I have long back legs and love to hop.',
          'I can stand up tall on my back legs to look around.',
          'I am a white bunny of the frozen north.',
        ],
        funFact:
          'Arctic hares can hop at about 60 kilometres (40 miles) an hour when a fox is chasing them!',
      },
      {
        id: 'muskox',
        name: 'Muskox',
        emoji: '🐂',
        wikiTitle: 'Muskox',
        clues: [
          'I am big and shaggy and I live in a herd.',
          'When danger comes, my herd makes a circle with our horns pointing out.',
          'I am a woolly ox with a very long coat.',
        ],
        funFact:
          'A muskox’s coat almost touches the ground, and its soft under-wool is much warmer than sheep’s wool.',
      },
      {
        id: 'arctic-wolf',
        name: 'Arctic Wolf',
        emoji: '🐺',
        wikiTitle: 'Arctic_wolf',
        clues: [
          'I live and hunt with my family, called a pack.',
          'I howl to talk to my family far away.',
          'I am a white wolf of the Arctic.',
        ],
        funFact:
          'In winter the Arctic can stay dark all day long, and Arctic wolves keep hunting through months of darkness.',
      },
    ],
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    emoji: '🐧',
    description:
      'The coldest, windiest place on Earth: a giant land of ice at the very bottom of the world.',
    anchor: { lat: -80, lng: 0 },
    priority: 3,
    shapes: [box(-90, -60, -180, 180)],
    animals: [
      {
        id: 'emperor-penguin',
        name: 'Emperor Penguin',
        emoji: '🐧',
        wikiTitle: 'Emperor_penguin',
        clues: [
          'I cannot fly, but I am a super swimmer.',
          'Dads keep the egg warm on their feet all through the dark winter.',
          'I am the biggest penguin in the world!',
        ],
        funFact:
          'Emperor penguins huddle together in huge groups and take turns standing in the warm middle.',
      },
      {
        id: 'adelie-penguin',
        name: 'Adélie Penguin',
        emoji: '🐧',
        wikiTitle: 'Adélie_penguin',
        clues: [
          'I waddle and I love to swim.',
          'I build my nest out of little stones.',
          'I am a small penguin with a white ring around each eye.',
        ],
        funFact: 'Adélie penguins sometimes sneak pebbles from their neighbours’ nests!',
      },
      {
        id: 'chinstrap-penguin',
        name: 'Chinstrap Penguin',
        emoji: '🐧',
        wikiTitle: 'Chinstrap_penguin',
        clues: [
          'I live in a big, noisy crowd.',
          'I hop across rocks to get to my nest.',
          'I am a penguin with a thin black line under my chin, like a helmet strap.',
        ],
        funFact:
          'Chinstrap penguins take thousands of tiny naps every day, each one lasting just a few seconds!',
      },
      {
        id: 'gentoo-penguin',
        name: 'Gentoo Penguin',
        emoji: '🐧',
        wikiTitle: 'Gentoo_penguin',
        clues: [
          'I live next to the cold sea.',
          'I have a bright orange beak and a white patch over my eyes.',
          'I am the fastest swimming penguin!',
        ],
        funFact: 'Gentoo penguins can swim about 36 kilometres (22 miles) an hour.',
      },
      {
        id: 'weddell-seal',
        name: 'Weddell Seal',
        emoji: '🦭',
        wikiTitle: 'Weddell_seal',
        clues: [
          'I spend lots of time under the ice.',
          'I use my teeth to scrape breathing holes in the ice.',
          'I am a seal that lives farther south than any other mammal.',
        ],
        funFact: 'Weddell seals can hold their breath for more than an hour while swimming under the ice!',
      },
      {
        id: 'leopard-seal',
        name: 'Leopard Seal',
        emoji: '🦭',
        wikiTitle: 'Leopard_seal',
        clues: [
          'I am a fast hunter in the water.',
          'I have a big head and a huge, wide mouth.',
          'I am a seal with spots, like a big cat!',
        ],
        funFact:
          'Leopard seals sing underwater, and their songs can travel a long way through the icy sea.',
      },
      {
        id: 'snow-petrel',
        name: 'Snow Petrel',
        emoji: '🕊️',
        wikiTitle: 'Snow_petrel',
        clues: [
          'I am a bird that loves the cold.',
          'I nest on rocky mountains that poke up out of the ice.',
          'I am pure white, like a flying snowball.',
        ],
        funFact: 'Snow petrels have even been seen at the South Pole, where almost no birds ever go.',
      },
    ],
  },
];
