import { LEXICON } from '../lexicon.ts';
import { ENGLISH_LETTERS } from '../picker.ts';
import { LEVELS } from '../words.ts';

/**
 * What to hand the voice for a lone letter. Capitals nudge most voices into
 * saying the letter's name. "a" alone often comes out as "uh", so it is spelled
 * by sound. Add a line here to tune any letter that sounds wrong.
 */
const LETTER_SOUNDS: Record<string, string> = { a: 'ay' };

export const en = {
  levels: LEVELS,
  lexicon: LEXICON,
  letters: ENGLISH_LETTERS,
  /** How a word or letter looks on screen. Words are always stored in lowercase. */
  show: (letters: string) => letters,
  letterSound: (letter: string) => LETTER_SOUNDS[letter] ?? letter.toUpperCase(),

  title: 'Word Garden',
  description:
    'A spelling game for new readers. Spell short picture words with big letter tiles and grow a garden, with a grown-up beside you.',
  home: 'Back to Playroom',
  lead: 'Spell words. Grow flowers!',
  howToButton: '🔊 How to play',
  howTo: 'Pick a level. Listen to the word, then tap the letters to spell it and grow a flower!',

  tryAnother: 'Try another one!',
  cheers: ['You did it!', 'Well done!', 'Hooray!', 'Great spelling!', 'You spelled it!'],
  noSound: 'No sound here. A grown-up can read the word.',
  hearWord: 'Hear the word',
  tileLabel: (letter: string) => `letter ${letter}`,

  next: 'Next ➜',
  myGarden: 'My garden',
  myGardenButton: '🌻 My garden',
  hint: '💡 Hint',
  showWord: 'Show the word',
  levelsButton: 'Levels',
  grownUps: 'Grown-ups',

  gardenEmpty: 'No flowers yet. Spell a word to plant a seed! 🌱',
  gardenTip: 'Tap a flower to hear its word.',
  spellMore: '🌱 Spell more',
  spellAgain: '✏️ Spell it again',
  back: 'Back',
  flowerLabel: (word: string) => `Flower for ${word}`,

  friendLabel: (name: string) => name,
  friendCame: (name: string) => `A ${name} came to your garden!`,
  friendHello: (name: string) => `A ${name}!`,
};

export type Text = typeof en;
