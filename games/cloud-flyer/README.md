# ✈️ Cloud Flyer

A 3D flying game for ages 4 to 9, for one child with one finger. Pick a little plane, a dragon, a flying unicorn, a rocket, a hot air balloon or a bumblebee, and fly through a sunny sky of floating islands, waterfalls and tiny villages.

## How to play

1. Tap a flyer and you're off. Before that you can pick a world (Sunny Islands, Sunset, Snow Peaks, Night Sky, Candy Clouds) and how hard: Easy, Swoopy or Wild. Easy is the default, and keeps its rings to one side at a time, so a finger held left or right is enough.
2. Touch and hold anywhere, and the flyer glides to that part of the screen. Let go, and it drifts back to the middle. On a laptop, use the arrow keys or just move the mouse.
3. Fly through glowing rings for points. Each ring in a chain plays the next note of a rising tune. Collect stars and pass under the rainbow arches. Until the first ring, a hand shows where to touch and points at the ring.
4. Miss a ring and it giggles and wiggles at you, and the flyer looks round at it. After two misses in a row, the next ring grows and slides towards the flyer until one is caught.
5. Bump a cloud or an island, and the flyer wobbles and sneezes, slows for a moment and carries on. Nothing stops the flight.
6. After about 75 seconds, you land on a bouncy cloud for up to 3 stars. Stars come from rings you caught yourself, so steering always pays: rings sit away from the middle, and a flyer left alone earns 1 star. One big button flies again.

Now and then there's a surprise: a rainbow tunnel that whooshes you along, a friendly whale floating by, or a flock of birds who join your flight. Stars from landings earn new sparkle trails, and the picker keeps a little album of the surprises found. Nothing is ever locked.

The game also plays in Slovenian as *Let med oblaki*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The rules are pure and have tests: `course.ts` lays out one flight from a seed, `flight.ts` steps it forward, `progress.ts` keeps the stars and bests, and `steering.ts` turns a spot on screen into a place to fly. The rest draws that state. Everything in `src/art/` is built from three.js primitives, with no model or texture files, and the pictures in the picker are drawn by the same code that flies, through a render target. Scenery is merged into one mesh per stretch of sky and built one stretch at a time, so a flight costs about 35 to 50 draw calls.

## Run it

Cloud Flyer is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/cloud-flyer     # start a local dev server for just this game
npm test -w @playroom/cloud-flyer        # run the unit tests
```

The root `npm run build` puts the game in `dist/cloud-flyer/`, live at <https://nazuje.github.io/playroom/cloud-flyer/>.
