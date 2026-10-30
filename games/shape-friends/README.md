# 🔷 Shape Friends

A shape-sorting game for ages 3 to 5, played alone. Friendly shapes need help getting home. No reading needed. It plays in English and Slovenian (*Prijatelji oblik*): the flag in the top bar switches language, and progress stays.

## How to play

1. Tap the big play button. A grown-up can pick a level with the small buttons at the bottom.
2. A shape hops in and says its name. Tap the door with the matching outline, and it hops home along the stones.
3. After two misses the right door pulses and the others fade.
4. Six friends make a round, then there's a party and a new sticker for the 📖 sticker book, which has 24 to collect.

The levels are circle, square and triangle; star, heart and rectangle; oval and diamond; the same shape in different sizes and colors; and sorting by color or size.

## Run it

Shape Friends is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/shape-friends     # start a local dev server for just this game
npm test -w @playroom/shape-friends        # run the unit tests
```

The root `npm run build` puts the game in `dist/shape-friends/`, live at <https://nazuje.github.io/playroom/shape-friends/>.
