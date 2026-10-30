# 🙈 Hide and Peek

A hide-and-seek game for ages 3 to 6, for a child and a grown-up passing one device back and forth. It teaches memory, position words and taking turns.

## How to play

1. Pick a friend to hide and a room. A grown-up can choose 6, 8 or 9 hiding spots.
2. The seeker closes their eyes while the hider taps a spot, then taps **Ready!** and passes the device over.
3. The seeker taps hiding spots. Empty ones show a funny surprise and give a spoken clue, like "Look near the window!".
4. After three tries the right spot wiggles, so nobody gets stuck. "Peekaboo!" earns a star, then you swap.
5. After four rounds, the game says "You both found everyone!". Nobody loses.

## Run it

Hide and Peek is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/hide-and-peek     # start a local dev server for just this game
npm test -w @playroom/hide-and-peek        # run the unit tests
```

The root `npm run build` puts the game in `dist/hide-and-peek/`, live at <https://nazuje.github.io/playroom/hide-and-peek/>.
