# 👽 Tickle Blaster

A space arcade game for ages 5 to 9, to play alone. Grumpy little aliens swoop down, and a tiny ship cheers them up with feathers and giggle bubbles. Nobody gets hurt and nobody loses: a tickled alien bursts out laughing, turns a happy color, spins and floats away waving.

## How to play

1. Pick a planet: Moon Base, Ring Planet, Candy Comet, Ice Nebula or Sleepy Star. All five are open from the start. Choose Easy, Fast or Wild at the top.
2. Touch and hold anywhere, and the ship slides to your finger. It fires all by itself, so one finger is enough. On a laptop, use the mouse or the arrow keys.
3. Tickle aliens and catch the stars they drop. Quick tickles build a combo and fill the laugh meter, and a full meter sets off a Tickle Storm where the whole screen laughs.
4. Catch power-ups: triple feathers, a wide giggle wave, a star magnet and a helper ship. Silly aliens drop green goo, and a splat makes the ship wobble and fire slower for a couple of seconds. That's the worst thing that can happen.
5. After about 45 seconds a huge cuddly grumpy alien arrives. It's very hard to make laugh, but it slowly cracks up as you tickle it, and then gives you a high five with a giant hand.

Up to 3 stars for making everyone laugh and catching their stars, with your best score kept for each planet and speed. The ship fires by itself, but waves come down on the left and the right, so moving is what earns stars: a parked ship can't get 3. A level always ends and always gives at least 1 star, because a boss nobody is tickling wanders over to the ship. There are no lives and no game over, and the 🔁 button starts again at once.

The book of laughing friends shows everyone you've met, with shadows for those you haven't. Now and then something rare turns up: a tiny golden alien giggling across the sky, a space cat riding a comet, or a boss who sneezes out little aliens.

The game also plays in Slovenian as *Žgečkaj vesoljčke!*, with the flag in the top bar. Its words are in `src/lang/`.

## How it's built

The rules are plain data with no drawing in them. `waves.ts` holds the swooping paths and plans each level's waves, `game.ts` steps the game at a fixed 60 ticks a second, and `collection.ts` keeps what a device remembers. Their tests play every level at every speed on tall and wide screens with a chasing, a sliding and a parked bot. They check that each level takes 60 to 90 seconds and always ends, that chasing beats sliding beats parking, and that a parked ship never earns 3 stars.

`pool.ts` is a fixed set of 180 particles in flat number arrays, so however much laughing is going on nothing is allocated and the count can't grow. On a slow device `play.ts` drops to 70 particles, fewer stars and fewer pixels. `art.ts` and `sky.ts` paint every picture with canvas shapes, and `sprites.ts` keeps each one in a small hidden canvas to stamp, because shapes are slow to redraw every frame. `draw.ts` turns the game into a frame.

## Run it

Tickle Blaster is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/tickle-blaster     # start a local dev server for just this game
npm test -w @playroom/tickle-blaster        # run the unit tests
```

The root `npm run build` puts the game in `dist/tickle-blaster/`, live at <https://nazuje.github.io/playroom/tickle-blaster/>.
