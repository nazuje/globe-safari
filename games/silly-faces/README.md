# 🤪 Silly Faces

A dress-up toy for ages 3 to 9, alone or with a sibling or grown-up. There is no goal and no wrong choice: just a big cuddly creature that reacts to everything.

## How to play

1. Tap a picture tab, then a picture, to change the creature's body, eyes, mouth, hair, hat or the thing it holds. Every part fits every other part.
2. Tap 🎲 and everything whirls like a slot machine.
3. Tap the creature. It burps, sneezes its hat off, toots and blushes, giggles, yawns or spins.
4. Keep tapping and something wild happens now and then. A tiny copy may pop out and wave, it may float to the ceiling, or it may turn inside out into a color you can't pick from the tray.
5. Tap 🎶 to dance with confetti, and 📷 to hang the creature on the Friends Wall. Tap 🖼️ to see the wall, where a friend comes back with one tap and everyone can dance together. The music gets fuller as the wall fills up.

The wall holds 24 friends on this device. When it's full, the oldest friend makes room for the new one.

The game also plays in Slovenian as *Smešni obrazi*, with the flag in the top bar. Its words are in `src/lang/`. The creature is drawn in `src/art.ts`: each body shape says where its head, face and arms are, and each part is drawn around its own center, which is why any combination lines up.

## Run it

Silly Faces is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/silly-faces     # start a local dev server for just this game
npm test -w @playroom/silly-faces        # run the unit tests
```

The root `npm run build` puts the game in `dist/silly-faces/`, live at <https://nazuje.github.io/playroom/silly-faces/>.
