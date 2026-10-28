import { box, polygon, type Region } from '../types.ts';

export const NORTH_AMERICA_REGIONS: Region[] = [
  {
    id: 'north-american-forests',
    name: 'North American Forests',
    emoji: '🌲',
    description:
      'Big leafy and evergreen forests full of rivers and lakes, from Canada all the way down to Florida.',
    anchor: { lat: 45, lng: -72 },
    priority: 1,
    shapes: [
      box(25, 62, -100, -52), // the East and Canada
      box(32, 62, -141, -114), // the West Coast, British Columbia and the Yukon
      box(54, 64, -170, -130), // southern Alaska
    ],
    animals: [
      {
        id: 'american-black-bear',
        name: 'American Black Bear',
        emoji: '🐻',
        wikiTitle: 'American_black_bear',
        clues: [
          'I am big and furry and I love berries.',
          'I am a great tree climber.',
          'I am the most common bear in North America, often black all over.',
        ],
        funFact: 'Black bears sleep through most of the winter in a cozy den, and their cubs are born there.',
      },
      {
        id: 'white-tailed-deer',
        name: 'White-tailed Deer',
        emoji: '🦌',
        wikiTitle: 'White-tailed_deer',
        clues: [
          'I am a shy animal who eats leaves and acorns.',
          'My babies have white spots to help them hide in the forest.',
          'When I’m scared, I lift my white tail up like a flag!',
        ],
        funFact: 'White-tailed deer can jump over a fence taller than a grown-up.',
      },
      {
        id: 'moose',
        name: 'Moose',
        emoji: '🫎',
        wikiTitle: 'Moose',
        clues: [
          'I am very tall with long legs.',
          'I love to wade into lakes and eat water plants.',
          'I am the biggest deer in the world, with huge flat antlers.',
        ],
        funFact: 'Moose are great swimmers and can even dive underwater to munch on plants.',
      },
      {
        id: 'raccoon',
        name: 'Raccoon',
        emoji: '🦝',
        wikiTitle: 'Raccoon',
        clues: [
          'I come out at night.',
          'I have clever little hands and I like to feel my food.',
          'I have a black mask on my face and a stripy tail.',
        ],
        funFact:
          'Raccoons have super-sensitive paws, and their sense of touch gets even better when their paws are wet.',
      },
      {
        id: 'north-american-beaver',
        name: 'Beaver',
        emoji: '🦫',
        wikiTitle: 'North_American_beaver',
        clues: [
          'I am a busy builder.',
          'My orange front teeth never stop growing.',
          'I build dams with sticks and slap my flat tail on the water!',
        ],
        funFact: 'Beaver teeth are orange because they contain iron, which makes them extra strong.',
      },
      {
        id: 'bald-eagle',
        name: 'Bald Eagle',
        emoji: '🦅',
        wikiTitle: 'Bald_eagle',
        clues: [
          'I am a big bird who catches fish.',
          'I build the biggest nests of any bird in North America.',
          'I have a white head and a yellow hooked beak.',
        ],
        funFact: 'Bald eagles aren’t really bald: “bald” is an old word meaning white-headed.',
      },
      {
        id: 'striped-skunk',
        name: 'Striped Skunk',
        emoji: '🦨',
        wikiTitle: 'Striped_skunk',
        clues: [
          'I am small and come out at night.',
          'I stamp my feet to warn you to stay away.',
          'I am black with white stripes, and I can make a very stinky spray!',
        ],
        funFact: 'A skunk can spray its smelly mist about 3 metres (10 feet)!',
      },
      {
        id: 'wild-turkey',
        name: 'Wild Turkey',
        emoji: '🦃',
        wikiTitle: 'Wild_turkey',
        clues: [
          'I am a big bird who walks on the forest floor.',
          'I can fly short distances, and I sleep up in the trees.',
          'I gobble, and the boys fan out their big tail feathers!',
        ],
        funFact: 'A turkey’s head can change color, turning red, white or blue depending on its mood!',
      },
    ],
  },
  {
    id: 'great-plains',
    name: 'Great Plains',
    emoji: '🌾',
    description: 'Wide, open grasslands where the wind blows and the sky seems to go on forever.',
    anchor: { lat: 38.5, lng: -98.5 },
    priority: 2,
    shapes: [
      box(30, 49, -106, -96.5), // the US prairie
      box(49, 55, -114, -96.5), // the Canadian prairie
    ],
    animals: [
      {
        id: 'american-bison',
        name: 'American Bison',
        emoji: '🦬',
        wikiTitle: 'American_bison',
        clues: [
          'I am huge and shaggy and I travel in herds.',
          'I roll in the dirt to keep bugs away.',
          'I am the biggest land animal in North America, sometimes called a buffalo.',
        ],
        funFact: 'Even though they are huge, bison can run almost as fast as a horse.',
      },
      {
        id: 'prairie-dog',
        name: 'Prairie Dog',
        emoji: '🐿️',
        wikiTitle: 'Black-tailed_prairie_dog',
        clues: [
          'I live underground with my big family.',
          'I stand up on my back legs to look out for danger.',
          'I am a chubby ground squirrel who barks like a little dog!',
        ],
        funFact: 'Prairie dog towns can be huge, with tunnels for thousands of prairie dogs.',
      },
      {
        id: 'pronghorn',
        name: 'Pronghorn',
        emoji: '🦌',
        wikiTitle: 'Pronghorn',
        clues: [
          'I eat grass and live in herds.',
          'I have big eyes that can spot danger far away.',
          'I am the fastest runner in North America!',
        ],
        funFact:
          'Pronghorns can run about 90 kilometres (55 miles) an hour, and keep going much longer than a cheetah.',
      },
      {
        id: 'coyote',
        name: 'Coyote',
        emoji: '🐺',
        wikiTitle: 'Coyote',
        clues: [
          'I am a clever animal who can live almost anywhere.',
          'I sing at night with yips and howls.',
          'I look like a small, skinny wolf.',
        ],
        funFact: 'Coyotes sometimes team up with badgers to hunt together!',
      },
      {
        id: 'burrowing-owl',
        name: 'Burrowing Owl',
        emoji: '🦉',
        wikiTitle: 'Burrowing_owl',
        clues: [
          'I am a small bird with long legs.',
          'I make my home in old tunnels under the ground.',
          'I am an owl who lives in a hole in the ground!',
        ],
        funFact:
          'When scared, baby burrowing owls can make a hissing sound like a rattlesnake to trick enemies.',
      },
      {
        id: 'american-badger',
        name: 'American Badger',
        emoji: '🦡',
        wikiTitle: 'American_badger',
        clues: [
          'I am short and flat, with very strong claws.',
          'I am a super fast digger.',
          'I have a white stripe running from my nose over my head.',
        ],
        funFact: 'An American badger can dig itself out of sight in just a few minutes.',
      },
      {
        id: 'western-meadowlark',
        name: 'Western Meadowlark',
        emoji: '🐦',
        wikiTitle: 'Western_meadowlark',
        clues: [
          'I am a bird who sings from fence posts.',
          'I build my nest on the ground, hidden in the grass.',
          'I have a bright yellow chest with a black V on it.',
        ],
        funFact: 'The western meadowlark is the state bird of six different US states!',
      },
    ],
  },
  {
    id: 'rocky-mountains',
    name: 'Rocky Mountains',
    emoji: '⛰️',
    description: 'Tall, rocky mountains with pine forests, flowery meadows and snowy peaks.',
    anchor: { lat: 39.7, lng: -105.6 },
    priority: 3,
    shapes: [
      box(37, 49, -114, -104.5), // the US Rockies
      box(49, 60, -121, -114), // the Canadian Rockies
    ],
    animals: [
      {
        id: 'grizzly-bear',
        name: 'Grizzly Bear',
        emoji: '🐻',
        wikiTitle: 'Grizzly_bear',
        clues: [
          'I am a big bear with a hump on my shoulders.',
          'I dig for roots and catch salmon in rivers.',
          'I am a brown bear with silver-tipped fur.',
        ],
        funFact: 'Grizzly bears can smell food from kilometres away.',
      },
      {
        id: 'bighorn-sheep',
        name: 'Bighorn Sheep',
        emoji: '🐏',
        wikiTitle: 'Bighorn_sheep',
        clues: [
          'I climb steep, rocky cliffs.',
          'The boys crash their heads together to show who is strongest.',
          'I am a wild sheep with huge curly horns.',
        ],
        funFact:
          'A big bighorn ram’s horns can weigh as much as all the other bones in its body put together.',
      },
      {
        id: 'mountain-goat',
        name: 'Mountain Goat',
        emoji: '🐐',
        wikiTitle: 'Mountain_goat',
        clues: [
          'I live high up where few animals can go.',
          'My hooves have soft, grippy pads, like climbing shoes.',
          'I am a white, bearded goat with little black horns.',
        ],
        funFact: 'Mountain goat babies can climb and jump just a few hours after they are born.',
      },
      {
        id: 'elk',
        name: 'Elk',
        emoji: '🦌',
        wikiTitle: 'Elk',
        clues: [
          'I am a big deer who lives in a herd.',
          'In autumn, the boys make a loud whistling call called a bugle.',
          'I am a big deer with huge antlers and a light-colored bottom.',
        ],
        funFact: 'A male elk’s antlers can grow about 2.5 centimetres (1 inch) a day in summer!',
      },
      {
        id: 'american-pika',
        name: 'American Pika',
        emoji: '🐭',
        wikiTitle: 'American_pika',
        clues: [
          'I am tiny and I live among rocks.',
          'In summer I collect grass and flowers to make hay piles for winter.',
          'I look like a small round mouse, but I’m related to rabbits!',
        ],
        funFact: 'Pikas give a loud “eep!” to warn their neighbours about danger.',
      },
      {
        id: 'golden-eagle',
        name: 'Golden Eagle',
        emoji: '🦅',
        wikiTitle: 'Golden_eagle',
        clues: [
          'I am a big bird who soars over mountains.',
          'I can dive through the air super fast to catch my food.',
          'I am a brown eagle with golden feathers on my neck.',
        ],
        funFact: 'Golden eagles can dive at more than 240 km/h (150 mph)!',
      },
      {
        id: 'canada-lynx',
        name: 'Canada Lynx',
        emoji: '🐈',
        wikiTitle: 'Canada_lynx',
        clues: [
          'I am a wild cat of snowy forests.',
          'My big furry paws work like snowshoes.',
          'I have black tufts on my ears and a short stubby tail.',
        ],
        funFact:
          'Canada lynx mostly eat snowshoe hares, so when there are lots of hares, there are lots of lynx too.',
      },
      {
        id: 'wolf',
        name: 'Gray Wolf',
        emoji: '🐺',
        wikiTitle: 'Wolf',
        clues: [
          'I live and hunt with my family.',
          'I howl to call my pack.',
          'I am a big gray wild dog, the biggest in the dog family.',
        ],
        funFact:
          'Wolves came back to Yellowstone Park in 1995, and they helped the whole forest and its rivers get healthier.',
      },
    ],
  },
  {
    id: 'desert-southwest',
    name: 'Deserts of the Southwest & Mexico',
    emoji: '🌵',
    description: 'Hot, sunny deserts full of cactus, plus the mountains, forests and lakes of Mexico.',
    anchor: { lat: 33, lng: -112 },
    priority: 2,
    shapes: [
      box(15, 37, -121, -104.5), // Arizona, Nevada, Southern California and western Mexico
      box(15, 30, -104.5, -97), // central Mexico
    ],
    animals: [
      {
        id: 'greater-roadrunner',
        name: 'Roadrunner',
        emoji: '🐦',
        wikiTitle: 'Greater_roadrunner',
        clues: [
          'I am a bird who would rather run than fly.',
          'I am fast enough to catch lizards and even snakes.',
          'I am a speedy desert bird famous from cartoons. Beep beep!',
        ],
        funFact: 'Roadrunners can run about 30 kilometres (20 miles) an hour.',
      },
      {
        id: 'gila-monster',
        name: 'Gila Monster',
        emoji: '🦎',
        wikiTitle: 'Gila_monster',
        clues: [
          'I am a slow, chunky reptile.',
          'I store fat in my thick tail for hungry times.',
          'I am a lizard with beady orange and black skin.',
        ],
        funFact: 'A Gila monster can eat so much in one meal that it only needs a few meals a year.',
      },
      {
        id: 'western-diamondback-rattlesnake',
        name: 'Rattlesnake',
        emoji: '🐍',
        wikiTitle: 'Western_diamondback_rattlesnake',
        clues: [
          'I have no legs and I like warm rocks.',
          'I have diamond shapes along my back.',
          'I shake the end of my tail to make a warning rattle!',
        ],
        funFact: 'A rattlesnake gets a new piece on its rattle every time it sheds its skin.',
      },
      {
        id: 'collared-peccary',
        name: 'Javelina',
        emoji: '🐗',
        wikiTitle: 'Collared_peccary',
        clues: [
          'I travel in a group and love to eat prickly pear cactus.',
          'I am a little bit stinky on purpose, so my family can smell each other.',
          'I look like a small hairy pig with a white collar.',
        ],
        funFact: 'Javelinas can eat prickly pear cactus, spines and all!',
      },
      {
        id: 'black-tailed-jackrabbit',
        name: 'Jackrabbit',
        emoji: '🐇',
        wikiTitle: 'Black-tailed_jackrabbit',
        clues: [
          'I am fast and I can jump far.',
          'My giant ears help me stay cool in the hot sun.',
          'I am a big desert hare with black on my tail.',
        ],
        funFact:
          'Jackrabbits are really hares, not rabbits, and their babies are born with fur and open eyes.',
      },
      {
        id: 'monarch-butterfly',
        name: 'Monarch Butterfly',
        emoji: '🦋',
        wikiTitle: 'Monarch_butterfly',
        clues: [
          'I start my life as a stripy caterpillar.',
          'Millions of us fly thousands of kilometres to spend the winter in Mexico’s forests.',
          'I am an orange and black butterfly.',
        ],
        funFact: 'Monarch caterpillars eat only milkweed, which makes them taste yucky to birds.',
      },
      {
        id: 'axolotl',
        name: 'Axolotl',
        emoji: '🦎',
        wikiTitle: 'Axolotl',
        clues: [
          'I live in the water around Mexico City.',
          'I have feathery gills that stick out of my head like a crown.',
          'I am a smiley pink or brown salamander.',
        ],
        funFact: 'Axolotls can regrow lost legs, and even parts of their heart and brain!',
      },
      {
        id: 'desert-tortoise',
        name: 'Desert Tortoise',
        emoji: '🐢',
        wikiTitle: 'Desert_tortoise',
        clues: [
          'I am slow and I have a hard shell.',
          'I spend hot days in an underground burrow.',
          'I am a tortoise of the hot, dry desert.',
        ],
        funFact: 'Desert tortoises can store water in their bodies and go a year or more without drinking.',
      },
    ],
  },
  {
    id: 'caribbean',
    name: 'Caribbean & Central American Jungle',
    emoji: '🏝️',
    description:
      'Warm jungles full of colorful birds and frogs, next to bright blue seas and sandy islands.',
    anchor: { lat: 10, lng: -84 },
    priority: 2,
    shapes: [
      box(7, 18.5, -92, -77), // Central America
      box(17, 22, -92, -86), // the Yucatán
      box(10, 27, -85, -59), // the Caribbean islands and coast
      polygon(
        [
          [-89, 21.6],
          [-88.3, 16],
          [-84, 15.6],
          [-83.4, 11],
          [-81.6, 9],
          [-79, 9.35],
          [-77, 8.6],
          [-75, 10.6],
          [-71, 12],
          [-64, 10.6],
          [-60.5, 10.3],
          [-59, 13],
          [-61, 18],
          [-65, 18.8],
          [-73, 20.3],
          [-80, 23.3],
          [-85, 22.2],
        ],
        'sea',
      ), // the Caribbean Sea
    ],
    animals: [
      {
        id: 'resplendent-quetzal',
        name: 'Resplendent Quetzal',
        emoji: '🐦',
        wikiTitle: 'Resplendent_quetzal',
        clues: [
          'I am a shy bird of misty mountain forests.',
          'My tail feathers can be longer than my body.',
          'I am a shiny green bird with a red tummy.',
        ],
        funFact: 'The quetzal is so special in Guatemala that their money is called the quetzal!',
      },
      {
        id: 'keel-billed-toucan',
        name: 'Keel-billed Toucan',
        emoji: '🦜',
        wikiTitle: 'Keel-billed_toucan',
        clues: [
          'I live in the treetops and love fruit.',
          'My beak is huge, but very light, like a sponge inside.',
          'I have a giant rainbow-colored beak!',
        ],
        funFact:
          'Toucans sleep with their beak tucked under a wing and their tail folded over, like a feathery ball.',
      },
      {
        id: 'red-eyed-tree-frog',
        name: 'Red-eyed Tree Frog',
        emoji: '🐸',
        wikiTitle: 'Agalychnis_callidryas',
        clues: [
          'I am small and green and I sleep during the day.',
          'I have orange feet with sticky toes.',
          'I have big, bright red eyes!',
        ],
        funFact:
          'When it sleeps, the red-eyed tree frog hides its colors, then flashes its red eyes to startle hungry animals.',
      },
      {
        id: 'mantled-howler',
        name: 'Howler Monkey',
        emoji: '🐒',
        wikiTitle: 'Mantled_howler',
        clues: [
          'I live high in the treetops with my family.',
          'My tail can hold on to branches, like an extra hand.',
          'I am a monkey with a super loud call!',
        ],
        funFact:
          'Howler monkeys are some of the loudest land animals; their calls can be heard about 5 kilometres (3 miles) away.',
      },
      {
        id: 'green-sea-turtle',
        name: 'Green Sea Turtle',
        emoji: '🐢',
        wikiTitle: 'Green_sea_turtle',
        clues: [
          'I swim in warm seas.',
          'Mothers crawl onto sandy beaches at night to lay eggs.',
          'I am a big sea turtle who loves to eat seagrass.',
        ],
        funFact:
          'Green sea turtles are named for the green color of the fat under their shells, not for their shells.',
      },
      {
        id: 'american-flamingo',
        name: 'American Flamingo',
        emoji: '🦩',
        wikiTitle: 'American_flamingo',
        clues: [
          'I wade in shallow, salty water.',
          'I eat with my head upside down.',
          'I am a bright pink bird who often stands on one leg.',
        ],
        funFact: 'American flamingos are the brightest pink flamingos of all.',
      },
      {
        id: 'west-indian-manatee',
        name: 'Manatee',
        emoji: '🦭',
        wikiTitle: 'West_Indian_manatee',
        clues: [
          'I am big and gentle and I swim slowly.',
          'I spend hours munching on sea grass.',
          'People call me a sea cow!',
        ],
        funFact: 'Manatees are distant cousins of elephants!',
      },
    ],
  },
];
