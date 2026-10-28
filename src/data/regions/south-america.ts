import { box, broad, type Region } from '../types.ts';

export const SOUTH_AMERICA_REGIONS: Region[] = [
  {
    id: 'amazon',
    name: 'Amazon Rainforest',
    emoji: '🌳',
    description:
      'The biggest rainforest on Earth: hot, steamy and full of giant trees around a mighty river.',
    anchor: { lat: -5, lng: -63 },
    priority: 2,
    shapes: [
      box(-15, 5, -79, -44),
      box(0, 8.5, -67, -51), // Venezuela, Guyana, Suriname, French Guiana
      broad(box(-24, -15, -62, -38)), // southern Brazil
      broad(box(-15, 0, -44, -34)), // northeastern Brazil
    ],
    animals: [
      {
        id: 'jaguar',
        name: 'Jaguar',
        emoji: '🐆',
        wikiTitle: 'Jaguar',
        clues: [
          'I am a big cat who loves the water.',
          'My spotty coat has rings with little dots inside.',
          'I am the biggest cat in the Americas!',
        ],
        funFact:
          'Unlike most cats, jaguars love to swim, and they even catch fish and caimans in the river.',
      },
      {
        id: 'scarlet-macaw',
        name: 'Scarlet Macaw',
        emoji: '🦜',
        wikiTitle: 'Scarlet_macaw',
        clues: [
          'I have a big curved beak that can crack nuts.',
          'I live in the treetops and I am very loud.',
          'I am a parrot with bright red, yellow and blue feathers.',
        ],
        funFact: 'Scarlet macaws can live for 40 to 50 years, maybe as long as your grandparents!',
      },
      {
        id: 'three-toed-sloth',
        name: 'Three-toed Sloth',
        emoji: '🦥',
        wikiTitle: 'Three-toed_sloth',
        clues: [
          'I spend almost my whole life up in the trees.',
          'I move very, very slowly.',
          'I hang upside down and have three long claws on each hand.',
        ],
        funFact:
          'Sloths move so slowly that tiny green plants called algae grow in their fur, helping them hide in the leaves.',
      },
      {
        id: 'amazon-river-dolphin',
        name: 'Amazon River Dolphin',
        emoji: '🐬',
        wikiTitle: 'Amazon_river_dolphin',
        clues: [
          'I swim in a river, not in the sea.',
          'I have a long, thin beak and a bendy neck.',
          'I am a pink dolphin!',
        ],
        funFact:
          'Amazon river dolphins can turn their heads from side to side to swim between flooded trees, which ocean dolphins can’t do.',
      },
      {
        id: 'green-anaconda',
        name: 'Green Anaconda',
        emoji: '🐍',
        wikiTitle: 'Green_anaconda',
        clues: [
          'I have no legs.',
          'I hide in swampy water with just my eyes and nose poking out.',
          'I am one of the biggest snakes in the world!',
        ],
        funFact: 'Green anacondas are the heaviest snakes on Earth; a big one can weigh more than a grown-up.',
      },
      {
        id: 'poison-dart-frog',
        name: 'Poison Dart Frog',
        emoji: '🐸',
        wikiTitle: 'Poison_dart_frog',
        clues: [
          'I am very small and live on the rainforest floor.',
          'My bright colors say: don’t eat me!',
          'I am a tiny, colorful frog.',
        ],
        funFact:
          'Some poison dart frog dads carry their tadpoles on their backs to tiny pools of water inside plants.',
      },
      {
        id: 'giant-otter',
        name: 'Giant Otter',
        emoji: '🦦',
        wikiTitle: 'Giant_otter',
        clues: [
          'I live in a noisy family by the river.',
          'I have webbed feet and a flat tail for swimming.',
          'I am the longest otter in the world!',
        ],
        funFact:
          'Every giant otter has its own pattern of cream-colored spots on its throat, like a name tag.',
      },
      {
        id: 'capybara',
        name: 'Capybara',
        emoji: '🐹',
        wikiTitle: 'Capybara',
        clues: [
          'I love to sit in the water to stay cool.',
          'Birds and other animals like to sit on my back.',
          'I am the biggest rodent in the world!',
        ],
        funFact: 'Capybaras have slightly webbed feet, which makes them great swimmers.',
      },
    ],
  },
  {
    id: 'andes',
    name: 'Andes Mountains',
    emoji: '🏔️',
    description:
      'The longest mountain range on Earth, with snowy peaks, high grassy plains and deep valleys.',
    anchor: { lat: -13.5, lng: -71.9 },
    priority: 3,
    shapes: [
      box(0, 8, -78, -72.5), // Colombia
      box(-5, 0, -79.6, -77.3), // Ecuador
      box(-10, -5, -79, -75.5), // northern Peru
      box(-15, -10, -78.5, -69.5), // southern Peru
      box(-23, -15, -71.5, -65.5), // Bolivia and the high plains
      box(-38, -23, -71.5, -66.5), // Chile and Argentina
    ],
    animals: [
      {
        id: 'andean-condor',
        name: 'Andean Condor',
        emoji: '🦅',
        wikiTitle: 'Andean_condor',
        clues: [
          'I am a very big bird who soars over mountains.',
          'I can glide for hours on warm winds without flapping.',
          'I am a giant black vulture with a fluffy white collar.',
        ],
        funFact:
          'One Andean condor flew more than 170 kilometres (100 miles) without flapping its wings even once!',
      },
      {
        id: 'llama',
        name: 'Llama',
        emoji: '🦙',
        wikiTitle: 'Llama',
        clues: [
          'I live with people in the mountains and help carry things.',
          'I have long ears shaped like bananas.',
          'I am a fluffy animal who might spit when I’m cross!',
        ],
        funFact: 'Llamas hum to talk to each other, especially mothers and their babies.',
      },
      {
        id: 'alpaca',
        name: 'Alpaca',
        emoji: '🦙',
        wikiTitle: 'Alpaca',
        clues: [
          'I live high in the mountains.',
          'People love my super soft wool.',
          'I look like a small, fluffy llama with a cute short face.',
        ],
        funFact: 'Alpaca wool comes in more than 20 natural colors, from snowy white to black.',
      },
      {
        id: 'vicuna',
        name: 'Vicuña',
        emoji: '🦙',
        wikiTitle: 'Vicuña',
        clues: [
          'I am wild and live on high, grassy plains.',
          'I am the smallest member of the camel family.',
          'My golden wool is one of the finest in the world.',
        ],
        funFact:
          'Vicuñas have front teeth that never stop growing, like a rabbit’s, so they can nibble tough grass all their lives.',
      },
      {
        id: 'spectacled-bear',
        name: 'Spectacled Bear',
        emoji: '🐻',
        wikiTitle: 'Spectacled_bear',
        clues: [
          'I am a bear who loves to climb trees.',
          'I build nests up in the trees to rest and eat.',
          'I have cream-colored rings around my eyes that look like glasses!',
        ],
        funFact:
          'Spectacled bears are the only bears in South America, and Paddington Bear comes from Peru!',
      },
      {
        id: 'chinchilla',
        name: 'Chinchilla',
        emoji: '🐭',
        wikiTitle: 'Chinchilla',
        clues: [
          'I am small and live among high mountain rocks.',
          'I take dust baths to keep my fur clean.',
          'I have the softest, thickest fur of any land animal!',
        ],
        funFact: 'Chinchillas grow about 50 hairs from each tiny spot in their skin, so their fur is super thick.',
      },
      {
        id: 'andean-flamingo',
        name: 'Andean Flamingo',
        emoji: '🦩',
        wikiTitle: 'Andean_flamingo',
        clues: [
          'I stand on one leg in salty lakes.',
          'I live high in the mountains, where it is cold.',
          'I am a pink bird with yellow legs.',
        ],
        funFact: 'Andean flamingos get their pink color from the tiny algae they eat.',
      },
      {
        id: 'sword-billed-hummingbird',
        name: 'Sword-billed Hummingbird',
        emoji: '🐦',
        wikiTitle: 'Sword-billed_hummingbird',
        clues: [
          'I am a tiny bird who drinks nectar from flowers.',
          'My wings beat so fast they hum.',
          'My beak is longer than my body!',
        ],
        funFact:
          'The sword-billed hummingbird is the only bird with a beak longer than its body (not counting the tail).',
      },
    ],
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    emoji: '🏞️',
    description:
      'A wild, windy land of grassy plains, glaciers and rocky coasts at the bottom of South America.',
    anchor: { lat: -46, lng: -69 },
    priority: 2,
    shapes: [
      box(-56, -38, -76, -62),
      broad(box(-38, -24, -66, -50)), // the Pampas grasslands
    ],
    animals: [
      {
        id: 'guanaco',
        name: 'Guanaco',
        emoji: '🦙',
        wikiTitle: 'Guanaco',
        clues: [
          'I live in herds on windy plains.',
          'I am a wild cousin of the llama.',
          'I am a tan, long-necked animal of Patagonia.',
        ],
        funFact: 'Baby guanacos can stand up and walk within about half an hour of being born.',
      },
      {
        id: 'magellanic-penguin',
        name: 'Magellanic Penguin',
        emoji: '🐧',
        wikiTitle: 'Magellanic_penguin',
        clues: [
          'I am a bird that cannot fly.',
          'I dig a burrow in the ground for my nest.',
          'I am a penguin with two black stripes across my chest.',
        ],
        funFact: 'Magellanic penguins bray like donkeys to call to each other.',
      },
      {
        id: 'darwins-rhea',
        name: 'Darwin’s Rhea',
        emoji: '🐦',
        wikiTitle: "Darwin's_rhea",
        clues: [
          'I am a big bird that cannot fly.',
          'I run very fast and zigzag to escape.',
          'I look like a small ostrich with brown and white feathers.',
        ],
        funFact: 'Rhea dads sit on the eggs and look after the chicks all by themselves.',
      },
      {
        id: 'cougar',
        name: 'Puma',
        emoji: '🐆',
        wikiTitle: 'Cougar',
        clues: [
          'I am a big cat with no spots.',
          'I can jump very high and very far.',
          'People call me puma, mountain lion or cougar.',
        ],
        funFact: 'Pumas can’t roar, but they can purr, hiss and even chirp like birds.',
      },
      {
        id: 'patagonian-mara',
        name: 'Patagonian Mara',
        emoji: '🐇',
        wikiTitle: 'Patagonian_mara',
        clues: [
          'I hop and run across dry grasslands.',
          'I look like a mix of a rabbit and a small deer.',
          'I am a big rodent from Patagonia with long legs.',
        ],
        funFact: 'Mara couples stay together for life, and the dad keeps watch for danger.',
      },
      {
        id: 'southern-right-whale',
        name: 'Southern Right Whale',
        emoji: '🐋',
        wikiTitle: 'Southern_right_whale',
        clues: [
          'I am a huge animal who swims near the coast.',
          'I have rough white bumps on my head.',
          'I am a big whale who loves to slap my tail on the water.',
        ],
        funFact:
          'The bumps on each southern right whale’s head make a different pattern, so scientists use them to tell whales apart.',
      },
      {
        id: 'big-hairy-armadillo',
        name: 'Big Hairy Armadillo',
        emoji: '🦔',
        wikiTitle: 'Big_hairy_armadillo',
        clues: [
          'I dig burrows in the ground.',
          'I have hard plates on my back, like armor.',
          'I am an armadillo with hairs poking out between my plates.',
        ],
        funFact: 'Armadillo means “little armored one” in Spanish.',
      },
    ],
  },
  {
    id: 'galapagos',
    name: 'Galápagos Islands',
    emoji: '🐢',
    description:
      'Volcanic islands in the Pacific Ocean where many animals live nowhere else on Earth.',
    anchor: { lat: -0.7, lng: -90.3 },
    priority: 5,
    shapes: [box(-1.8, 0.9, -92.2, -89, 'any')],
    animals: [
      {
        id: 'galapagos-tortoise',
        name: 'Galápagos Tortoise',
        emoji: '🐢',
        wikiTitle: 'Galápagos_tortoise',
        clues: [
          'I am big, slow and can live a very long time.',
          'I can live for more than 100 years.',
          'I am a giant tortoise, and these islands are named after me!',
        ],
        funFact: 'Galápagos tortoises can go for up to a year without eating or drinking.',
      },
      {
        id: 'marine-iguana',
        name: 'Marine Iguana',
        emoji: '🦎',
        wikiTitle: 'Marine_iguana',
        clues: [
          'I am a reptile who sunbathes on black rocks.',
          'I sneeze salt out of my nose!',
          'I am the only lizard in the world that swims in the sea.',
        ],
        funFact: 'Marine iguanas dive into the cold ocean to nibble seaweed off the rocks.',
      },
      {
        id: 'blue-footed-booby',
        name: 'Blue-footed Booby',
        emoji: '🐦',
        wikiTitle: 'Blue-footed_booby',
        clues: [
          'I am a seabird who dives for fish.',
          'I dance for my partner by lifting my feet up high.',
          'I have bright blue feet!',
        ],
        funFact: 'The bluer a booby’s feet, the healthier it is, and partners love the bluest feet.',
      },
      {
        id: 'galapagos-penguin',
        name: 'Galápagos Penguin',
        emoji: '🐧',
        wikiTitle: 'Galapagos_penguin',
        clues: [
          'I am a small bird who cannot fly.',
          'I live somewhere warm, which is unusual for my family.',
          'I am the only penguin that lives near the equator!',
        ],
        funFact: 'Galápagos penguins hold their flippers over their feet to shade them from the hot sun.',
      },
      {
        id: 'galapagos-sea-lion',
        name: 'Galápagos Sea Lion',
        emoji: '🦭',
        wikiTitle: 'Galápagos_sea_lion',
        clues: [
          'I am playful and love to swim.',
          'I bark loudly and nap on sandy beaches.',
          'I am a sea lion, and sometimes I even sleep on park benches!',
        ],
        funFact: 'Galápagos sea lions are so curious that they often swim right up to snorkelers to play.',
      },
      {
        id: 'darwins-finches',
        name: 'Darwin’s Finches',
        emoji: '🐦',
        wikiTitle: "Darwin's_finches",
        clues: [
          'We are small birds.',
          'Each of us has a beak shaped for the food we eat.',
          'We helped a famous scientist named Charles Darwin have big ideas!',
        ],
        funFact: 'One of Darwin’s finches uses a cactus spine as a tool to poke bugs out of wood.',
      },
      {
        id: 'magnificent-frigatebird',
        name: 'Magnificent Frigatebird',
        emoji: '🐦',
        wikiTitle: 'Magnificent_frigatebird',
        clues: [
          'I am a seabird with long, pointy wings.',
          'I can stay up in the air for days without landing.',
          'The boys puff up a giant red balloon on their throats!',
        ],
        funFact: 'Frigatebirds can’t swim, so they sometimes grab fish from other birds in mid-air.',
      },
    ],
  },
];
