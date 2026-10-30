# 🌻 Word Garden

A spelling game for ages 5 to 9, alone or with a grown-up beside them. A child spells short picture words with big letter tiles, and each word grows a flower in their garden.

## How to play

1. Pick 3, 4 or 5 letter words. A picture appears and the word is spoken. Tap the picture or 🔊 to hear it again.
2. Tap letters to spell the word. A wrong letter hops back, and nothing is lost.
3. Each finished word plants a flower, and every fifth word brings a garden friend.
4. **My garden** shows every flower. Tap one to hear its word and spell it again.

A small **Grown-ups** button has 💡 Hint, Show the word (faded letters to copy) and Levels.

## Besedni vrt: Word Garden in Slovenian

The flag in the top bar switches language. Slovenian is not a translation, because spelling is the game: it has its own words, its own 25-letter alphabet and its own rules for the extra tiles. Tiles and slots show capitals, which Slovenian children learn first. Each language keeps its own garden, so a Slovenian word always replays in Slovenian and an English garden stays as it was. A round can't change language, so switching gives a new word from the same level, and switching straight back carries on with the old word.

Spoken letters are their sounds with a little vowel (be, ce, če), as a teacher says them when teaching reading, rather than the alphabet names (el, em, er). They play from the slow recording, because at full speed a letter is under a quarter of a second.

## Run it

Word Garden is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/word-garden     # start a local dev server for just this game
npm test -w @playroom/word-garden        # run the unit tests
```

The root `npm run build` puts the game in `dist/word-garden/`, live at <https://nazuje.github.io/playroom/word-garden/>.

## Tuning

- Words live in `src/words.ts` and, for Slovenian, `src/lang/slWords.ts`. Only add a word if its emoji means that word to a child, and run `npm run voice -- word-garden` after changing a Slovenian word.
- All text lives in `src/lang/`. To change how a letter is said, edit `LETTER_SOUNDS` in `en.ts` or `sl.ts`.
- `src/lexicon.ts` and `src/lang/slLexicon.ts` are the lists of everyday words the extra tiles must not be able to spell. The Slovenian list leaves out rarer word forms on purpose: Slovenian is so dense with short words that a fuller list leaves no fair extra tiles at all. If a word can't fill its tray, `sl.test.ts` fails.
- Which letters count as look-alikes or sound-alikes is `letters` in `en.ts` and `sl.ts`.

## Credits

The letter tiles use [Andika](https://fonts.google.com/specimen/Andika) by SIL International, under the SIL Open Font License. It is a typeface made for new readers, with a single-story "a", which Fredoka does not have. `src/fonts/andika-bold-az.woff2` holds only the bold letters a to z, and `src/fonts/andika-bold-caps-sl.woff2` only the bold capitals A to Z with Č, Š and Ž, so the tiles work offline.
