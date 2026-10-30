# 💎 Treasure Dig

A just-for-fun digging game for ages 3 to 8, played alone with taps only. There is nothing to learn and nothing to lose: the reward is what turns up.

## How to play

1. Pick a small patch (4 by 4, quick digging) or a big one (5 by 6, deeper layers).
2. Tap a tile and the little digger chips at it. A tile takes 1 to 3 taps, and darker ground takes more.
3. The tray at the top shows the shadows of what is buried. Dig them all up for a tada, and the next patch is a new place: beach, forest, snow, moon or under the sea.
4. After a few empty digs the nearest treasure glints through the dirt, so nobody is left hunting.
5. Everything found goes into the Treasure Room behind the chest button, where shadows show what is still missing and dinosaur bones build three skeletons in the museum.

Sleepy moles, giggling worms and other friends pop up along the way, and so do a sock or two. Rarely, a purple **?** in the tray means a giant golden chest or a friendly dragon egg is buried there, and each takes many taps to open.

The game also plays in Slovenian as *Lov na zaklad*, with the flag in the top bar. Its words are in `src/lang/`. To keep the game snappy it speaks by kind of find rather than naming each thing.

Finds are saved on this device with the kit's `store`, the moment they are found. A patch left halfway isn't kept, but nothing already found is lost.

## Run it

Treasure Dig is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/treasure-dig     # start a local dev server for just this game
npm test -w @playroom/treasure-dig        # run the unit tests
```

The root `npm run build` puts the game in `dist/treasure-dig/`, live at <https://nazuje.github.io/playroom/treasure-dig/>.
