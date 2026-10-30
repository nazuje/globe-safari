import { slCount, slNumber, type SlForms, type SlGender } from '@playroom/kit';
import type { Text } from './en.ts';

/** An animal's plain name, plus the two-of-them form that "Dva ..." or "Dve ..." takes. */
interface SlAnimal {
  name: string;
  gender: SlGender;
  two: string;
}

function animal(name: string, gender: SlGender, two: string): SlAnimal {
  return { name, gender, two };
}

// Keyed by emoji, the one part of an animal that belongs to no language.
export const SL_ANIMALS: Record<string, SlAnimal> = {
  '🦁': animal('Lev', 'm', 'leva'),
  '🐯': animal('Tiger', 'm', 'tigra'),
  '🐵': animal('Opica', 'f', 'opici'),
  '🐘': animal('Slon', 'm', 'slona'),
  '🦒': animal('Žirafa', 'f', 'žirafi'),
  '🦓': animal('Zebra', 'f', 'zebri'),
  '🦛': animal('Povodni konj', 'm', 'povodna konja'),
  '🦏': animal('Nosorog', 'm', 'nosoroga'),
  '🐼': animal('Panda', 'f', 'pandi'),
  '🐨': animal('Koala', 'f', 'koali'),
  '🐻': animal('Medved', 'm', 'medveda'),
  '🦊': animal('Lisica', 'f', 'lisici'),
  '🐺': animal('Volk', 'm', 'volka'),
  '🐰': animal('Zajček', 'm', 'zajčka'),
  '🐭': animal('Miška', 'f', 'miški'),
  '🐸': animal('Žaba', 'f', 'žabi'),
  '🐷': animal('Pujsek', 'm', 'pujska'),
  '🐮': animal('Krava', 'f', 'kravi'),
  '🐴': animal('Konj', 'm', 'konja'),
  '🐑': animal('Ovca', 'f', 'ovci'),
  '🐔': animal('Kokoš', 'f', 'kokoši'),
  '🦆': animal('Raca', 'f', 'raci'),
  '🦉': animal('Sova', 'f', 'sovi'),
  '🐧': animal('Pingvin', 'm', 'pingvina'),
  '🐢': animal('Želva', 'f', 'želvi'),
  '🐍': animal('Kača', 'f', 'kači'),
  '🐊': animal('Krokodil', 'm', 'krokodila'),
  '🐳': animal('Kit', 'm', 'kita'),
  '🐬': animal('Delfin', 'm', 'delfina'),
  '🐙': animal('Hobotnica', 'f', 'hobotnici'),
  '🦋': animal('Metulj', 'm', 'metulja'),
  '🐝': animal('Čebela', 'f', 'čebeli'),
};

const FLIP: SlForms = { one: 'obrat', two: 'obrata', few: 'obrati', many: 'obratov' };
const PAIR: SlForms = { one: 'par', two: 'para', few: 'pari', many: 'parov' };

const ONES = ['', 'ena', 'dva', 'tri', 'štiri', 'pet', 'šest', 'sedem', 'osem', 'devet'];
const TEENS = [
  'deset',
  'enajst',
  'dvanajst',
  'trinajst',
  'štirinajst',
  'petnajst',
  'šestnajst',
  'sedemnajst',
  'osemnajst',
  'devetnajst',
];
const TENS = ['dvajset', 'trideset', 'štirideset', 'petdeset', 'šestdeset', 'sedemdeset', 'osemdeset', 'devetdeset'];

/** A spoken finish names its flips up to here. Past it the line drops the number, so every line stays recorded. */
export const MOST_SPOKEN_FLIPS = 100;
/** The smallest board has 6 pairs, so no game ends in fewer flips. */
const FEWEST_FLIPS = 12;

/** The number as one word, from 10 to 100. Above 20 the ones come first: "štiriindvajset". */
function numberWord(n: number): string {
  if (n === 100) return 'sto';
  if (n < 20) return TEENS[n - 10];
  const tens = TENS[Math.floor(n / 10) - 2];
  return n % 10 === 0 ? tens : `${ONES[n % 10]}in${tens}`;
}

function capitalized(words: string): string {
  return words[0].toUpperCase() + words.slice(1);
}

function flipsSpoken(flips: number): string {
  if (flips > MOST_SPOKEN_FLIPS) return '';
  return ` ${capitalized(numberWord(flips))} ${slCount(flips, FLIP)}.`;
}

function pairLine(animal: SlAnimal, goesAgain: boolean): string {
  const line = `${capitalized(slNumber(2, animal.gender))} ${animal.two}!`;
  return goesAgain ? `${line} Spet si na vrsti!` : line;
}

export const sl: Text = {
  title: 'Živalski spomin',
  description:
    'Igra spomin z živalmi za otroka in odraslega, ki igrata po vrsti, ali za enega igralca. Vsako žival slišiš na glas.',
  homeLabel: 'Nazaj na seznam iger',
  repeatLabel: 'Povej še enkrat',
  intro: 'Poišči enake živali!',

  whoPlays: 'Kdo igra?',
  howManyCards: 'Koliko kartic?',
  play: 'Igrajmo! 🐾',
  modes: {
    together: { label: 'Skupaj', spoken: 'Skupaj! Igrajta po vrsti.' },
    solo: { label: 'Samo jaz', spoken: 'Samo jaz!' },
  },
  sizes: {
    6: { label: 'Lahko', spoken: 'Lahko! Šest parov.' },
    8: { label: 'Srednje', spoken: 'Srednje! Osem parov.' },
    12: { label: 'Težko', spoken: 'Težko! Dvanajst parov.' },
  },
  sizeNote: (pairs) => `${pairs} ${slCount(pairs, PAIR)}`,
  bestNote: (best) => `Rekord ${best}`,
  playerNames: ['Otrok', 'Odrasli'],
  soloName: 'Ti',
  changeFace: (name) => `Zamenjaj sliko: ${name}`,

  flipCount: (flips) => `${flips} ${slCount(flips, FLIP)}`,
  cardDown: (position) => `Kartica ${position}, obrnjena navzdol`,
  animalName: ({ emoji }) => SL_ANIMALS[emoji].name,
  findPairs: 'Poišči pare!',
  tryAgain: 'Poskusi še enkrat!',
  matchLine: ({ emoji }, goesAgain) => pairLine(SL_ANIMALS[emoji], goesAgain),
  turnLine: (name) => `Na vrsti je ${name.toLowerCase()}!`,

  // Present tense on purpose: a past tense here ("je našel", "je našla") would give the winner a gender.
  mostFound: (name) => `Največ parov ima ${name.toLowerCase()}!`,
  tie: 'Izenačeno! Bravo obema!',
  soloHeadline: 'Bravo! Imaš vse pare!',
  soloSpoken: (flips, isNew) => `Bravo! Imaš vse pare!${flipsSpoken(flips)}${isNew ? ' Nov rekord!' : ''}`,
  newBest: 'Nov rekord!',
  bestDetail: (best) => `Rekord: ${best}`,
  playAgain: 'Še enkrat 🔁',
  changeGame: 'Spremeni igro',
};

function everyFinish(flips: number): string[] {
  return [sl.soloSpoken(flips, false), sl.soloSpoken(flips, true)];
}

/** Every line the game can say in Slovenian. Cards turn up in twos, so a finished game's flips are always even. */
export function spokenLines(): string[] {
  const animals = Object.values(SL_ANIMALS);
  const flipCounts: number[] = [];
  for (let flips = FEWEST_FLIPS; flips <= MOST_SPOKEN_FLIPS; flips += 2) flipCounts.push(flips);

  return [
    sl.intro,
    sl.modes.together.spoken,
    sl.modes.solo.spoken,
    ...Object.values(sl.sizes).map((size) => size.spoken),
    ...sl.playerNames,
    ...sl.playerNames.map(sl.turnLine),
    ...sl.playerNames.map(sl.mostFound),
    sl.tie,
    sl.findPairs,
    sl.tryAgain,
    ...animals.map((one) => one.name),
    ...animals.map((one) => pairLine(one, false)),
    ...animals.map((one) => pairLine(one, true)),
    ...flipCounts.flatMap(everyFinish),
    ...everyFinish(MOST_SPOKEN_FLIPS + 2),
  ];
}
