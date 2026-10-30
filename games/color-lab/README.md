# 🎨 Color Lab

A paint-mixing game for ages 4 to 9, alone or with a grown-up. Guess first, then pour and see what happens.

## How to play

- **Guess the color:** two paints are shown. Tap the color you think they'll make, then tap **Pour!** and watch them swirl together.
- **Make this color:** a character asks for a color. Tap paints into the beaker and tap **Mix**. If it's not right, add more or empty the beaker, and a hint appears.
- **Free paint:** mix anything and paint a butterfly or a house. There's no scoring, and pictures are saved on the device.

## Tuning

The paint rules are written out at the top of `src/mix.ts`. Colors come from a table of what real paint does, not from averaging screen colors, which gives muddy wrong answers.

## Run it

Color Lab is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/color-lab     # start a local dev server for just this game
npm test -w @playroom/color-lab        # run the unit tests
```

The root `npm run build` puts the game in `dist/color-lab/`, live at <https://nazuje.github.io/playroom/color-lab/>.
