# 🏎️ Zoom Road

A driving game for ages 4 to 9, to play alone. There is nothing to learn and no way to lose: a child picks a ride and zooms down a silly road collecting stars.

## How to play

1. Pick a ride: a race car, unicorn, tractor, rocket, dragon, bicycle, fire engine or flying carpet to begin with. Choose Slow, Fast or Super Zoom at the top.
2. The lights count down. Tap the left or right half of the screen to move one lane that way. On a laptop the arrow keys work too.
3. Collect stars and treats. Bump a cow, puddle, hay bale, rubber duck or cone and you spin, go "bonk", slow down for a moment and carry on.
4. After about a minute comes the checkered flag, confetti and a trophy. Your stars fill the garage, where ten more rides are waiting to unlock.

Each race goes somewhere new: city, farm, beach, space or candy land. Now and then a rainbow ramp sends you flying through a stream of stars, or a friendly UFO drops a giant star. Both come to you, so nobody can miss one.

The game also plays in Slovenian as *Brm brm!*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The race is plain data: `course.ts` lays out a race from a random source, and `race.ts` steps it at a fixed 60 ticks a second, so it plays the same on any screen. `garage.ts` works out what's unlocked. All three have tests, and those tests check that a race takes 45 to 75 seconds whether a child dodges everything, hits everything or never touches the screen. `draw.ts` paints the race onto a canvas, and `sprites.ts` keeps each emoji in a small hidden canvas because drawing emoji text every frame is slow on tablets.

## Run it

Zoom Road is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/zoom-road     # start a local dev server for just this game
npm test -w @playroom/zoom-road        # run the unit tests
```

The root `npm run build` puts the game in `dist/zoom-road/`, live at <https://nazuje.github.io/playroom/zoom-road/>.
