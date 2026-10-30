# 🐇 Hop Dash

A side-scrolling running and jumping game for ages 4 to 9, to play alone. A mistake costs a moment and never the run, so nobody can lose. In Slovenian it's *Hopsasa!*

## How to play

1. Pick a runner: bunny, fox, robot, kitten, little dino or penguin. Choose Easy, Fast or Turbo at the top. Easy is the default.
2. Pick a level. All twelve are open from the start, two each in the Meadow, Beach, Pumpkin Patch, Ice Caves, Candy Land and on the Moon, where you float.
3. The runner runs by itself. Tap anywhere to jump, and tap again in the air for a double jump with a spin. Hold a little longer to jump a little higher. On a laptop use Space or the up arrow.
4. Collect the stars and carrots. Their arcs are real jumps, so following them shows you where a good jump goes.
5. A springy mushroom throws you high. Land on a wobbly jelly and you bounce off it with a squeak. Run into one from the side and you do a comic tumble and lose a moment's speed.
6. Fall in a gap and a friendly stork or cloud scoops you up and sets you down just ahead, with a giggle.
7. Each level takes 45 to 75 seconds to the flag, which earns up to 3 stars, a score and a personal best. Retrying is one tap.

On Easy there are fewer gaps, and the runner makes a low hop over the ones that remain if the child doesn't tap in time, so a 4-year-old is never stuck. That hop stays under the stars, so the stars still go to the child who taps: hands off reaches the flag with 1 star, loose tapping earns about 2, and good jumping earns 3. Speed rises towards the flag on every setting.

Rare surprises: a golden mushroom with sparkles climbing from it marks a hidden high path. Tap at the glowing ring at the top of the bounce to reach the clouds and a treasure for the shelf. Rocket boots hang at the top of a hop and zoom you along a stream of stars, and the second level of each world ends in a giant bouncy castle, where a tap at the top of each bounce reaches the most stars.

The game also plays in Slovenian, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The game itself has no drawing in it. `run.ts` steps everything at a fixed 120 ticks a second, so a slow tablet plays the same game as a fast laptop. `flight.ts` holds the one piece of code that moves anything through the air, with the hand-tuned jump: the float while the finger is down, the hang at the top and the quicker fall. `run.ts` adds the small kindnesses: a jump still works just after running off an edge, and a tap just before landing is remembered.

Levels are handcrafted lists of pieces in `levels.ts`, in the words of `pieces.ts`. `build.ts` turns a list into a real level for one speed and gravity, and lays out each star arc by flying the jump with the same `flight.ts` code the runner uses. It also records the taps the level was designed around.

`bots.ts` has simulated players, and `levels.test.ts` runs them through every level on every setting. They check that the designed route gets 3 stars in 45 to 75 seconds with no falls, that each treasure can be reached from a tap near its ring, that a child who never taps still reaches the flag with 1 star, and on Easy never falls, and that mashing can't break anything. They also check that the taps decide the stars: on every level and setting, skilled play beats random tapping, and random tapping clearly beats hands off.

`draw.ts`, `things.ts`, `backdrop.ts` and `runnerArt.ts` paint it on a canvas, and the runners are drawn in code, with no image files. `sprites.ts` keeps each emoji in a small hidden canvas because drawing emoji text every frame is slow on tablets.

## Run it

Hop Dash is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/hop-dash     # start a local dev server for just this game
npm test -w @playroom/hop-dash        # run the unit tests
```

The root `npm run build` puts the game in `dist/hop-dash/`, live at <https://nazuje.github.io/playroom/hop-dash/>.
