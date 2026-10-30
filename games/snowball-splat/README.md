# ⛄ Snowball Splat

A first-person snowball game in 3D for ages 3 to 9, to play alone. Silly snowmen pop up around a snowy toy village, and every tap sends a snowball to that exact spot. Nobody gets hurt: the snowmen think it's the best game ever.

## How to play

1. Pick Easy, Harder or Hardest, then tap a place: Village Square, Frozen Lake or Lantern Night. The round starts at once.
2. Tap anywhere. A snowball arcs up from the bottom of the screen. Hit a snowman and it goes splat, its hat flies off, its carrot boings away, and it rebuilds itself somewhere else, giggling. On a laptop, click, or use the arrow keys and the space bar.
3. After about a minute a giant snowman appears. It waits as long as it takes, wobbling more and more with every hit, until it bursts into snow and confetti.
4. You get up to three stars and a personal best for that level. A round can't be lost, and there's always at least one star.

On Easy, snowmen are big, slow and close, and a small assist pulls a nearby throw onto its target, so a 4-year-old hits nearly every time. After two misses in a row, on any level, the finger hint comes back and the assist helps a little more until the next hit, while the nearest snowman ducks, sticks out its tongue and giggles. Harder levels move faster, hide more and add small far-off snowmen worth 3 points. On those levels a snowman sometimes lobs a soft snowball at the screen. It lands with a funny splat and a mitten wipes it away, with no penalty.

Now and then something rare turns up: a golden snowman worth 10 points who always wears the crown, a penguin on a sled who waves, or a yeti who waves and dances. Hats knocked off go on a shelf behind the 🎩 button, and each round brings at most two new ones, so the 13 hats take a while to find.

The 🗺️ button leaves a round, and needs two taps so that mashing can't end one by accident. The game also plays in Slovenian as *Kepanje*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The rules are plain data with no 3D in them. `round.ts` steps a round at a fixed 60 ticks a second, so a slow tablet plays the same game as a fast one. `aim.ts` turns a tap into a landing spot and decides which target it was meant for, `throwArc.ts` is the flight path, `layout.ts` says where everything stands in each scene, `tuning.ts` holds the levels and `hats.ts` the collection. All of these have tests, including simulated children who tap sloppily (Easy must hit nearly every time) and a giant that never times out.

The drawing is separate. `world.ts` builds a scene from three.js shapes merged into a few meshes, `models.ts` makes the toys, `actors.ts` poses them, `fx.ts` does the snow and confetti, and `playfield.ts` joins them to a round. On a tall phone the camera climbs and looks down (`cameraFor` in `layout.ts`), so the village fills the screen, and snowmen keep to spots that screen can show. `thumbs.ts` draws each hat's picture for the shelf from its real 3D model. Sizing, pausing and slow devices are handled by [`@playroom/stage3d`](../../packages/stage3d/). A busy moment takes about 35 draw calls.

## Run it

Snowball Splat is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/snowball-splat     # start a local dev server for just this game
npm test -w @playroom/snowball-splat        # run the unit tests
```

The root `npm run build` puts the game in `dist/snowball-splat/`, live at <https://nazuje.github.io/playroom/snowball-splat/>.
