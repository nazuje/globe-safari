import { box, polygon, type Region } from '../types.ts';

/**
 * The Red Sea's middle line, shared by the Sahara (west side) and the
 * Arabian Desert (east side) so the two regions meet without a gap.
 */
export const RED_SEA_LINE: ReadonlyArray<readonly [number, number]> = [
  [34.3, 31.4],
  [32.6, 29.9],
  [34.5, 27],
  [37.8, 22],
  [40, 18],
];

export const AFRICA_REGIONS: Region[] = [
  {
    id: 'sahara',
    name: 'Sahara Desert',
    emoji: '🐪',
    description:
      'The biggest hot desert in the world, with giant sand dunes, rocky mountains and hardly any rain.',
    anchor: { lat: 23, lng: 10 },
    priority: 2,
    shapes: [
      polygon([
        [-17.8, 15.5],
        [-17.3, 21],
        [-15, 24],
        [-13.5, 27.5],
        [-10.5, 29.5],
        [-10, 31],
        [-9.5, 33],
        [-6.2, 35.95],
        [-2, 35.5],
        [0, 36.2],
        [3, 37],
        [11.5, 37.6],
        [12, 33.5],
        [20, 33.2],
        [25, 32.8],
        [30, 31.8],
        ...RED_SEA_LINE,
        [40, 16],
        [38, 15],
        [15, 15],
        [-12, 15.5],
      ]), // the Atlantic coast, the Mediterranean coast, then down the Red Sea
    ],
    animals: [
      {
        id: 'dromedary',
        name: 'Camel',
        emoji: '🐪',
        wikiTitle: 'Dromedary',
        clues: [
          'I can walk a long way across hot sand.',
          'I can go many days without drinking water.',
          'I am a camel with one hump.',
        ],
        funFact:
          'A camel’s hump is full of fat, not water, and it gives the camel energy when food is hard to find.',
      },
      {
        id: 'fennec-fox',
        name: 'Fennec Fox',
        emoji: '🦊',
        wikiTitle: 'Fennec_fox',
        clues: [
          'I am small and I sleep in a cool burrow during the hot day.',
          'Fur on my feet stops them from burning on the hot sand.',
          'I am a tiny fox with GIANT ears!',
        ],
        funFact:
          'A fennec fox’s huge ears help it hear bugs moving underground, and help it cool down too.',
      },
      {
        id: 'addax',
        name: 'Addax',
        emoji: '🦌',
        wikiTitle: 'Addax',
        clues: [
          'I live in the deepest, sandiest parts of the desert.',
          'I hardly ever need to drink, because I get water from plants.',
          'I am a pale antelope with long twisty horns.',
        ],
        funFact: 'Addax have wide, flat hooves that help them walk on soft sand without sinking.',
      },
      {
        id: 'dorcas-gazelle',
        name: 'Dorcas Gazelle',
        emoji: '🦌',
        wikiTitle: 'Dorcas_gazelle',
        clues: [
          'I am small, quick and graceful.',
          'I get most of my water from the plants I eat.',
          'I am a little sandy-colored gazelle.',
        ],
        funFact:
          'When a Dorcas gazelle is chased, it bounces high with stiff legs to show it is strong and fast.',
      },
      {
        id: 'sand-cat',
        name: 'Sand Cat',
        emoji: '🐈',
        wikiTitle: 'Sand_cat',
        clues: [
          'I am small and I hunt at night.',
          'Thick fur on my paws protects me from the hot sand.',
          'I look like a little pet cat, but I live in the desert!',
        ],
        funFact: 'Sand cats can go for months without drinking, getting water from the food they eat.',
      },
      {
        id: 'deathstalker',
        name: 'Yellow Scorpion',
        emoji: '🦂',
        wikiTitle: 'Deathstalker',
        clues: [
          'I have eight legs.',
          'I hold my tail up high over my back.',
          'I am a yellow scorpion with a stinger!',
        ],
        funFact: 'Like all scorpions, this one glows blue-green under a special ultraviolet light!',
      },
      {
        id: 'lesser-egyptian-jerboa',
        name: 'Jerboa',
        emoji: '🐭',
        wikiTitle: 'Lesser_Egyptian_jerboa',
        clues: [
          'I am tiny and I come out at night.',
          'I have a long tail with a tuft at the end.',
          'I hop on my long back legs like a mini kangaroo!',
        ],
        funFact: 'Jerboas plug the door of their burrow during the day to keep out the heat.',
      },
    ],
  },
  {
    id: 'african-savanna',
    name: 'African Savanna',
    emoji: '🦁',
    description: 'Wide grassy plains dotted with acacia trees, home to Africa’s biggest animals.',
    anchor: { lat: -2.3, lng: 34.8 },
    priority: 1,
    shapes: [
      box(-35, 15, 15, 52), // East and Southern Africa
      box(4, 16, -18, 15), // West Africa and the Sahel
    ],
    animals: [
      {
        id: 'african-bush-elephant',
        name: 'African Elephant',
        emoji: '🐘',
        wikiTitle: 'African_bush_elephant',
        clues: [
          'I am very big and I love to splash in mud.',
          'I use my long nose to drink, eat and say hello.',
          'I am the biggest land animal on Earth, with huge flappy ears!',
        ],
        funFact: 'Elephants flap their big ears to cool down, like a giant fan.',
      },
      {
        id: 'lion',
        name: 'Lion',
        emoji: '🦁',
        wikiTitle: 'Lion',
        clues: [
          'I live in a family group called a pride.',
          'I sleep up to 20 hours a day.',
          'I am a big cat, and the boys have a fluffy mane.',
        ],
        funFact: 'A lion’s roar can be heard up to 8 kilometres (5 miles) away!',
      },
      {
        id: 'giraffe',
        name: 'Giraffe',
        emoji: '🦒',
        wikiTitle: 'Giraffe',
        clues: [
          'I eat leaves from the tops of trees.',
          'My tongue is long and dark blue-purple.',
          'I am the tallest animal in the world!',
        ],
        funFact: 'A giraffe’s neck is very long, but it has the same number of neck bones as you: seven!',
      },
      {
        id: 'plains-zebra',
        name: 'Zebra',
        emoji: '🦓',
        wikiTitle: 'Plains_zebra',
        clues: [
          'I live in a big herd and eat grass.',
          'I look a lot like a horse.',
          'I have black and white stripes!',
        ],
        funFact: 'No two zebras have exactly the same stripes, just like fingerprints.',
      },
      {
        id: 'hippopotamus',
        name: 'Hippo',
        emoji: '🦛',
        wikiTitle: 'Hippopotamus',
        clues: [
          'I spend my days in rivers and lakes.',
          'I come out at night to eat grass.',
          'I am big and round with a huge mouth, and my name means “river horse”.',
        ],
        funFact: 'Hippos can’t really swim; they walk or bounce along the bottom of the river.',
      },
      {
        id: 'cheetah',
        name: 'Cheetah',
        emoji: '🐆',
        wikiTitle: 'Cheetah',
        clues: [
          'I am a cat with black spots.',
          'I have black lines running down from my eyes, like tear marks.',
          'I am the fastest land animal in the world!',
        ],
        funFact: 'A cheetah can go from standing still to 100 km/h (60 mph) in about three seconds!',
      },
      {
        id: 'common-ostrich',
        name: 'Ostrich',
        emoji: '🐦',
        wikiTitle: 'Common_ostrich',
        clues: [
          'I have long legs and I run really fast.',
          'I lay the biggest eggs in the world.',
          'I am the biggest bird in the world, and I cannot fly.',
        ],
        funFact: 'An ostrich’s eye is bigger than its brain!',
      },
      {
        id: 'blue-wildebeest',
        name: 'Wildebeest',
        emoji: '🐃',
        wikiTitle: 'Blue_wildebeest',
        clues: [
          'I live in a huge herd.',
          'Every year, millions of us travel in a giant loop to find fresh grass.',
          'I look like a cow with a beard and curved horns, and I am also called a gnu.',
        ],
        funFact: 'Wildebeest babies can stand up and run just minutes after they are born.',
      },
    ],
  },
  {
    id: 'congo-rainforest',
    name: 'Congo Rainforest',
    emoji: '🦍',
    description: 'Africa’s giant, steamy jungle, where a huge river winds between the trees.',
    anchor: { lat: -1, lng: 22 },
    priority: 2,
    shapes: [box(-6, 5, 9, 30)],
    animals: [
      {
        id: 'western-lowland-gorilla',
        name: 'Gorilla',
        emoji: '🦍',
        wikiTitle: 'Western_lowland_gorilla',
        clues: [
          'I live in a family led by a big, strong dad.',
          'I walk on my knuckles.',
          'I am the biggest ape, and grown-up dads have silver backs.',
        ],
        funFact: 'Gorillas build a fresh bed of leaves to sleep in every single night.',
      },
      {
        id: 'okapi',
        name: 'Okapi',
        emoji: '🦓',
        wikiTitle: 'Okapi',
        clues: [
          'I am shy and hide deep in the forest.',
          'I have a long blue tongue that can lick my own ears.',
          'I have stripy legs like a zebra, but I am really a giraffe’s cousin!',
        ],
        funFact: 'Okapis were so hard to find that scientists only learned about them in 1901!',
      },
      {
        id: 'bonobo',
        name: 'Bonobo',
        emoji: '🐒',
        wikiTitle: 'Bonobo',
        clues: [
          'I am an ape who lives in a big, friendly group.',
          'I can walk on two legs for a while.',
          'I look like a chimpanzee, but slimmer, with a parting in my hair.',
        ],
        funFact: 'Bonobos live in only one country in the world: the Democratic Republic of the Congo.',
      },
      {
        id: 'african-forest-elephant',
        name: 'Forest Elephant',
        emoji: '🐘',
        wikiTitle: 'African_forest_elephant',
        clues: [
          'I am big, but I live among the trees.',
          'I have small round ears and straight tusks.',
          'I am a smaller elephant that lives in the rainforest.',
        ],
        funFact:
          'Forest elephants are the rainforest’s gardeners: they eat fruit and spread the seeds, so new trees grow.',
      },
      {
        id: 'grey-parrot',
        name: 'African Grey Parrot',
        emoji: '🦜',
        wikiTitle: 'Grey_parrot',
        clues: [
          'I live in noisy flocks.',
          'I am very smart and I can copy sounds.',
          'I am a grey parrot with a bright red tail.',
        ],
        funFact: 'Grey parrots are amazing talkers, and one named Alex learned more than 100 words!',
      },
      {
        id: 'mandrill',
        name: 'Mandrill',
        emoji: '🐒',
        wikiTitle: 'Mandrill',
        clues: [
          'I live in a big group on the forest floor.',
          'I keep snacks in pouches in my cheeks.',
          'I am a monkey with a colorful red and blue face!',
        ],
        funFact: 'Mandrills are the biggest monkeys in the world.',
      },
      {
        id: 'chimpanzee',
        name: 'Chimpanzee',
        emoji: '🐒',
        wikiTitle: 'Chimpanzee',
        clues: [
          'I am very smart and live in a family group.',
          'I use sticks as tools to fish for termites.',
          'I am an ape, and one of your closest animal cousins.',
        ],
        funFact: 'Chimpanzees hug and kiss to make friends again after an argument.',
      },
      {
        id: 'goliath-frog',
        name: 'Goliath Frog',
        emoji: '🐸',
        wikiTitle: 'Goliath_frog',
        clues: [
          'I live next to rushing rivers.',
          'I can jump far, and I am almost as heavy as a pet cat.',
          'I am the biggest frog in the world!',
        ],
        funFact: 'Goliath frogs push rocks around to build little ponds for their tadpoles.',
      },
    ],
  },
  {
    id: 'madagascar',
    name: 'Madagascar',
    emoji: '🐒',
    description: 'A big island off Africa where most of the animals live nowhere else in the world.',
    anchor: { lat: -18.9, lng: 47.5 },
    priority: 5,
    shapes: [box(-26, -11.5, 43, 51)],
    animals: [
      {
        id: 'ring-tailed-lemur',
        name: 'Ring-tailed Lemur',
        emoji: '🐒',
        wikiTitle: 'Ring-tailed_lemur',
        clues: [
          'I love to sunbathe with my arms out wide.',
          'I live in a big group led by the girls.',
          'I have a long black and white striped tail!',
        ],
        funFact: 'Ring-tailed lemurs have “stink fights”, waving their smelly tails at each other!',
      },
      {
        id: 'fossa',
        name: 'Fossa',
        emoji: '🐈',
        wikiTitle: 'Fossa_(animal)',
        clues: [
          'I am a hunter who climbs trees really well.',
          'My ankles can turn around so I can climb down trees head-first.',
          'I look like a mix of a cat and a mongoose.',
        ],
        funFact: 'The fossa is the biggest meat-eater on Madagascar, and its favourite food is lemurs.',
      },
      {
        id: 'aye-aye',
        name: 'Aye-aye',
        emoji: '🐒',
        wikiTitle: 'Aye-aye',
        clues: [
          'I come out at night.',
          'I tap on trees and listen for bugs hiding inside.',
          'I have big eyes, big ears, and one super long, thin middle finger!',
        ],
        funFact: 'The aye-aye is the biggest primate in the world that is awake at night.',
      },
      {
        id: 'panther-chameleon',
        name: 'Panther Chameleon',
        emoji: '🦎',
        wikiTitle: 'Panther_chameleon',
        clues: [
          'I move slowly along branches.',
          'My eyes can look in two different directions at once.',
          'I am a lizard who changes colors!',
        ],
        funFact: 'A chameleon’s tongue can shoot out longer than its whole body to catch a bug.',
      },
      {
        id: 'verreauxs-sifaka',
        name: 'Dancing Sifaka',
        emoji: '🐒',
        wikiTitle: "Verreaux's_sifaka",
        clues: [
          'I live in trees and leap from trunk to trunk.',
          'On the ground, I hop sideways like I’m dancing.',
          'I am a white lemur with a dark face.',
        ],
        funFact: 'Sifakas can leap about 10 metres (30 feet) from one tree to the next!',
      },
      {
        id: 'indri',
        name: 'Indri',
        emoji: '🐒',
        wikiTitle: 'Indri',
        clues: [
          'I live high in the rainforest trees.',
          'My family sings loud songs every morning.',
          'I am the biggest lemur, black and white, with almost no tail.',
        ],
        funFact: 'Indri songs can be heard more than 2 kilometres (1 mile) away.',
      },
      {
        id: 'hissing-cockroach',
        name: 'Hissing Cockroach',
        emoji: '🪳',
        wikiTitle: 'Madagascar_hissing_cockroach',
        clues: [
          'I live on the forest floor and eat fallen fruit.',
          'I don’t have any wings.',
          'When I’m surprised, I push out air to make a loud hiss!',
        ],
        funFact: 'This cockroach hisses by squeezing air out of tiny breathing holes along its body.',
      },
      {
        id: 'lowland-streaked-tenrec',
        name: 'Streaked Tenrec',
        emoji: '🦔',
        wikiTitle: 'Lowland_streaked_tenrec',
        clues: [
          'I am small and spiky.',
          'I rub special quills on my back to make a buzzing sound.',
          'I look like a stripy black and yellow hedgehog.',
        ],
        funFact: 'Streaked tenrecs are the only mammals known to “talk” by rubbing their quills together.',
      },
    ],
  },
];
