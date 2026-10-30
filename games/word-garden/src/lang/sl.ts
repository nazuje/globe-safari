import { FRIENDS } from '../garden.ts';
import type { LetterRules } from '../picker.ts';
import type { Text } from './en.ts';
import { SL_LEXICON } from './slLexicon.ts';
import { SL_LEVELS } from './slWords.ts';

const SL_LETTERS: LetterRules = {
  // The 25 letters of the Slovenian alphabet: no q, w, x or y.
  alphabet: 'abcčdefghijklmnoprsštuvzž',
  confusable: [
    // Hissing sounds, which is also what Č, Š and Ž are here to practise.
    'cčsšzž',
    // Pairs that sound the same at the end of a word (zob, pod, sneg), or that a child can swap.
    'bp',
    'dt',
    'gk',
    'fv',
    // L and V can both sound like U (lev, volk). I and J run together.
    'luv',
    'ij',
    // Capitals that look alike, because capitals are what this game shows.
    'bdp',
    'pr',
    'cg',
    'ef',
    'mn',
  ],
};

/*
 * What the voice says for a letter: its sound with a little vowel, as a teacher
 * says it when teaching reading (be, ce, če), not the name from the alphabet
 * song (el, em, er). A child can blend these into a word: pe-e-se, PES.
 */
const LETTER_SOUNDS: Record<string, string> = {
  a: 'a',
  b: 'be',
  c: 'ce',
  č: 'če',
  d: 'de',
  e: 'e',
  f: 'fe',
  g: 'ge',
  h: 'he',
  i: 'i',
  j: 'je',
  k: 'ke',
  l: 'le',
  m: 'me',
  n: 'ne',
  o: 'o',
  p: 'pe',
  r: 're',
  s: 'se',
  š: 'še',
  t: 'te',
  u: 'u',
  v: 've',
  z: 'ze',
  ž: 'že',
};

/** Each garden friend's lines, keyed by the name in garden.ts. Animals have grammatical gender, so the verbs agree. */
const FRIEND_WORDS: Record<string, { name: string; came: string }> = {
  bee: { name: 'Čebela', came: 'Čebela je priletela na tvoj vrt!' },
  butterfly: { name: 'Metulj', came: 'Metulj je priletel na tvoj vrt!' },
  ladybug: { name: 'Pikapolonica', came: 'Pikapolonica je priletela na tvoj vrt!' },
  snail: { name: 'Polž', came: 'Polž je prilezel na tvoj vrt!' },
  bird: { name: 'Ptička', came: 'Ptička je priletela na tvoj vrt!' },
};

export const sl: Text = {
  levels: SL_LEVELS,
  lexicon: SL_LEXICON,
  letters: SL_LETTERS,
  // Slovenian children learn capital block letters first.
  show: (letters) => letters.toUpperCase(),
  letterSound: (letter) => LETTER_SOUNDS[letter] ?? letter,

  title: 'Besedni vrt',
  description: 'Igra za male bralce. Sestavi kratke besede iz velikih tiskanih črk in na svojem vrtu vzgoji rožice.',
  home: 'Domov',
  lead: 'Sestavi besedo in zrasla bo rožica!',
  howToButton: '🔊 Kako se igramo?',
  howTo: 'Izberi, kako dolge besede želiš. Poslušaj besedo, potem tapni črke in jo sestavi. Zrasla bo rožica!',

  tryAnother: 'Poskusi drugo črko!',
  cheers: ['Bravo!', 'Odlično!', 'Juhu!', 'Zelo dobro!', 'Tako se piše!'],
  noSound: 'Tu ni zvoka. Besedo ti lahko prebere odrasla oseba.',
  hearWord: 'Poslušaj besedo',
  tileLabel: (letter) => `črka ${letter}`,

  next: 'Naprej ➜',
  myGarden: 'Moj vrt',
  myGardenButton: '🌻 Moj vrt',
  hint: '💡 Namig',
  showWord: 'Pokaži besedo',
  levelsButton: 'Stopnje',
  grownUps: 'Za odrasle',

  gardenEmpty: 'Tukaj še ni rožic. Sestavi besedo in posadi seme! 🌱',
  gardenTip: 'Tapni rožico in poslušaj njeno besedo.',
  spellMore: '🌱 Sestavi še več',
  spellAgain: '✏️ Sestavi še enkrat',
  back: 'Nazaj',
  flowerLabel: (word) => `Rožica za besedo ${word}`,

  friendLabel: (name) => FRIEND_WORDS[name].name,
  friendCame: (name) => FRIEND_WORDS[name].came,
  friendHello: (name) => `${FRIEND_WORDS[name].name}!`,
};

const allWords = () => SL_LEVELS.flatMap((level) => level.words.map((entry) => entry.word));

/** Every line the game can say in Slovenian. */
export function spokenLines(): string[] {
  return [
    ...Object.values(LETTER_SOUNDS),
    ...allWords(),
    sl.howTo,
    sl.tryAnother,
    ...sl.cheers,
    ...FRIENDS.flatMap((friend) => [sl.friendCame(friend.name), sl.friendHello(friend.name)]),
  ];
}

/** The words, which the game says slowly once they're spelled, and the letters, which are too short at full speed. */
export function slowLines(): string[] {
  return [...Object.values(LETTER_SOUNDS), ...allWords()];
}
