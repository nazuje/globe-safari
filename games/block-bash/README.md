# 🧱 Block Bash

A crashing game in real 3D for ages 4 to 9, alone or taking turns. A tower of colorful toy blocks stands on a table. Tap it, and a heavy ball flies out of the camera and everything comes tumbling down.

## How to play

1. Tap the tower. A pulsing finger shows where. On Easy a tap can't really miss, because the ball finds the nearest block.
2. Each turn has 6 balls, and each flies harder than the last. The sixth is a big one. Let each crash finish and the finger comes back.
3. Blocks count when they fall off the table, topple over or get shoved aside. The bar fills towards three stars.
4. When most of a structure is down, and always at halfway and before the last ball, a new pile of blocks thumps down from the sky.
5. Tap ↻ to try again straight away, or ▶ for the next structure. Every level is open from the start: tap 🗺️ to pick one.

A throw that moves nothing makes the blocks shake with laughter. After two in a row, the next tap is steered to the surest block.

Pick a ball at the bottom: the bowling ball, the floaty beach ball, the tiny heavy ball that punches through, the slime ball that grabs blocks and drags them along, or the basketball that loops in and bounces around.

Silly-faced blocks go "whoa" and giggle. Pop blocks, the ones with a star, burst into confetti and shove their neighbors, and one can set off the next. Jelly blocks wobble and bounce.

In 🗺️ you can also choose Tricky, with a wider table, less aiming help and higher goals, and two players. The fox and the frog each get a full turn on a fresh tower, each keeps a tally, and the end screen adds them up. There is no winner on purpose.

Now and then something rare happens: a really big crash goes into slow motion, a tiny mouse sits on top and rides a block down, and five big crashes reveal a secret level.

On a laptop, the arrow keys aim, space throws, 1 to 5 pick a ball and R starts again. A mouse click works like a tap.

The game also plays in Slovenian as *Podri stolp!*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

`levels.ts` holds the 16 structures as data, and `scoring.ts`, `round.ts`, `tally.ts`, `surprises.ts`, `aim.ts`, `impact.ts` and `stepper.ts` are plain rules. All have tests, and `physics.test.ts` runs the real physics to check that every structure stands perfectly still before a throw, and still stands if it's woken.

`turn.ts` joins the rules and physics into one player's go, with no drawing, so a test can play it. `looseThrower.ts` plays a whole turn the way a small child does, tapping loosely around the structure, and `looseThrower.test.ts` uses it to check that every level gives a good crash, at least one star and a long enough turn on Easy.

`physics.ts` wraps [cannon-es](https://github.com/pmndrs/cannon-es) and reports what happened as a list of events. It knows nothing about drawing or sound. Three things keep it safe on a slow tablet. Every level has 60 blocks or fewer, and a new wave reuses knocked-down blocks, so that never grows. Blocks start asleep and go back to sleep, so a quiet tower costs nothing and can't fall by itself. And `stepper.ts` runs physics at a fixed 60 steps a second with a cap of two steps per frame, so a slow tablet shows slower action rather than wild action.

`blocksView.ts` draws all the blocks, faces and blob shadows with a few instanced meshes, about a dozen draw calls in all. `play.ts` runs the turn and connects everything.

## Run it

Block Bash is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/block-bash     # start a local dev server for just this game
npm test -w @playroom/block-bash        # run the unit tests
```

The root `npm run build` puts the game in `dist/block-bash/`, live at <https://nazuje.github.io/playroom/block-bash/>.
