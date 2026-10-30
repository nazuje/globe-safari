# 🦁 Memory Zoo

A pairs game with 32 animals, for ages 4 to 9. Play together, taking turns, or alone. It plays in English and Slovenian (*Živalski spomin*), with a flag in the top bar to switch.

## How to play

1. Pick **Together** or **Just me**, then **Easy** (6 pairs), **Medium** (8) or **Hard** (12). In Together mode, tap a side's face to change its emoji.
2. Tap two cards. Each one flips over and says the animal's name.
3. A match earns a star and you go again. If the cards don't match, they stay up for a moment to memorize, then flip back and the turn passes.
4. Together mode ends by saying who found the most, or "You both win!" on a tie. Just me counts flips and remembers your best for each board size.

## Run it

Memory Zoo is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/memory-zoo     # start a local dev server for just this game
npm test -w @playroom/memory-zoo        # run the unit tests
```

The root `npm run build` puts the game in `dist/memory-zoo/`, live at <https://nazuje.github.io/playroom/memory-zoo/>.
