# 🌻 Word Garden

A spelling game for ages 5 to 9, alone or with a grown-up beside them. A child spells short picture words with big letter tiles, and each word grows a flower in their garden.

## How to play

1. Pick 3, 4 or 5 letter words. A picture appears and the word is spoken. Tap the picture or 🔊 to hear it again.
2. Tap letters to spell the word. A wrong letter hops back, and nothing is lost.
3. Each finished word plants a flower, and every fifth word brings a garden friend.
4. **My garden** shows every flower. Tap one to hear its word and spell it again.

A small **Grown-ups** button has 💡 Hint, Show the word (faded letters to copy) and Levels.

## Run it

Word Garden is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/word-garden     # start a local dev server for just this game
npm test -w @playroom/word-garden        # run the unit tests
```

The root `npm run build` puts the game in `dist/word-garden/`, live at <https://nazuje.github.io/playroom/word-garden/>.

## Tuning

- Words live in `src/words.ts`. Only add a word if its emoji means that word to a child.
- How letters and words sound lives in `src/speech.ts`. To change how a letter is said, edit `LETTER_SOUNDS`.
- `src/lexicon.ts` is the list of everyday words the extra tiles must not be able to spell.

## Credits

The letter tiles use [Andika](https://fonts.google.com/specimen/Andika) by SIL International, under the SIL Open Font License. It is a typeface made for new readers, with a single-story "a", which Fredoka does not have. `src/fonts/andika-bold-az.woff2` holds only the bold letters a to z, so the tiles work offline.
