# Word Garden

A child spells short picture words with big letter tiles, and each word grows a flower in their garden. Made for a new reader with a grown-up beside them.

## Tuning

- Words live in `src/words.ts`. Only add a word if its emoji means that word to a child.
- How letters and words sound lives in `src/speech.ts`. To change how a letter is said, edit `LETTER_SOUNDS`.
- `src/lexicon.ts` is the list of everyday words the extra tiles must not be able to spell.

## Credits

The letter tiles use [Andika](https://fonts.google.com/specimen/Andika) by SIL International, under the SIL Open Font License. It is a typeface made for new readers, with a single-story "a", which Fredoka does not have. `src/fonts/andika-bold-az.woff2` holds only the bold letters a to z, so the tiles work offline.
