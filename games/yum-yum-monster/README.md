# 👾 Yum Yum Monster

A feeding game for ages 3 to 5, played alone. A cuddly monster asks for food out loud, and the child taps to feed it. No reading needed.

## How to play

1. Tap a monster to choose it. A grown-up can pick a level with the small buttons at the bottom.
2. The monster asks for something, like "I want two apples!" or "Something red, please!". The speech bubble shows the same request as a picture.
3. Tap food to feed it. It chomps and counts out loud as it eats.
4. Wrong food makes it sneeze the food back, and after two misses the right food pulses. After five requests it does a big dance.

The levels are naming foods, colors, counting to 3, counting to 5, and counting to 10.

## Tuning

Foods live in `src/foods.ts`. Only give a food a color it really is, and don't count foods whose emoji shows a bunch, like grapes.

## Languages

The game plays in English and Slovenian, where it is called Lačna pošast. A flag in the top bar switches language at any time, and the round carries on. All the words are in `src/lang/`: `en.ts` and `sl.ts` have the same shape. A request holds only which food, color, count and wording it wants, so its line is always built in the current language.

After changing a Slovenian line, run `npm run voice -- yum-yum-monster` and commit the new clips. Every Slovenian sentence is 3 to 7 words. The bite-by-bite numbers (`Ena!`, `Dve!`) are the one exception, because they are a count, not a sentence. Avoid words with no vowel, like `Mmmm!`, because the voice spells them out.

## Run it

Yum Yum Monster is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/yum-yum-monster     # start a local dev server for just this game
npm test -w @playroom/yum-yum-monster        # run the unit tests
```

The root `npm run build` puts the game in `dist/yum-yum-monster/`, live at <https://nazuje.github.io/playroom/yum-yum-monster/>.
