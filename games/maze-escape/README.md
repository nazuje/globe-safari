# 🚨 Maze Escape

A 3D stealth game for ages 5 to 9, for one child with one finger. Pick a fox, a robot kid, a ninja cat, an astronaut, a unicorn or a dino, and sneak out of a glowing neon secret base, past goofy patrol robots, sweeping cameras, floor sensors and laser turrets.

## How to play

1. Tap a character, then a level. Every level is open from the start. Easy is the default, with slower robots, narrower cones and wider gaps. Hard is faster and sharper.
2. Touch and hold anywhere, and the character runs towards your finger. Let go and they stop, which is the stealth skill: a robot's cone reaches only half as far, and hiding in a side path lets it walk past. On a laptop, use the arrow keys or WASD.
3. Follow the glowing arrows to the green door. They start under your feet and lead along a route that works. At a red ✋ sign, wait in that safe spot. It turns green when the way ahead is really clear.
4. Robots patrol with a yellow cone. If one notices you it shouts "!" and chases you, but you're faster, and if you stay out of sight for long enough it scratches its head and goes back to work. Being caught ends the run.
5. Cameras sweep a red cone. Stand in it for a quarter of a second and you're seen, with a flash of warning first. Floor plates blink orange, then turn red. Turrets glow before every shot, and their lanes are marked on the floor.
6. This is the one Playroom game with real losing, because a parent asked for it. Losing is a cartoon zap and puff with dizzy stars, then one big button to try again at once. On Easy, the bigger mazes have safe spots with a flag to restart from. Nothing is ever lost. After three losses in a row on a level, robots quietly slow down and cones narrow. After five, every wait sign also becomes a safe spot and the trail grows brighter. A win with help earns 1 star, and a win resets it.
7. At the door: confetti, tada and up to 3 stars. One for getting out, one for good time, and one for never being noticed. One big button goes to the next level.

Rare surprises: a shimmering wall that hides a secret room with a treasure for your shelf, a cardboard box disguise that fools robots for a few seconds, and a disco button that sets robots dancing.

The game also plays in Slovenian as *Pobeg iz labirinta*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The rules are pure and have tests. `grid.ts` holds walls, line of sight, cones and sliding along walls. `hazards.ts` turns the clock into each hazard's state, `robots.ts` runs patrol and chase, and `run.ts` steps one try forward in fixed slices, so every frame rate plays the same. `levels.ts` is twelve text maps, read by `level.ts`, and `tuning.ts` holds the numbers for Easy and Hard.

`guide.ts` runs the trail and wait signs: a sign plays the next stretch forward several ways, prompt and slow, and only says go if every walk gets through with no robot close. `bots.ts` is the fairness proof. Its child-like bot follows only the trail and signs, reacts 0.4 to 1.1 seconds late, hesitates, and must win every Easy level within 5 tries. It was tuned against a bot that plays the real build by touch and sight, which remains the true judge. Its skilled bot sees only the hazards within the view radius, and it must win every level on both settings at the first try, from the start and from each checkpoint. `rig.ts` proves the camera always shows that radius on any screen shape and that no wall can hide the player, and a test keeps every hazard's reach shorter than the view. A hands-off player never wins.

Everything in `src/art/` is three.js primitives, with no model or texture files. The maze is one mesh and repeats are instanced, so the busiest level peaks at about 25 draw calls.

## Run it

Maze Escape is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/maze-escape     # start a local dev server for just this game
npm test -w @playroom/maze-escape        # run the unit tests
```

The root `npm run build` puts the game in `dist/maze-escape/`, live at <https://nazuje.github.io/playroom/maze-escape/>.
