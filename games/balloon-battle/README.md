# 🎈 Balloon Battle

A two-player tapping race for ages 3 to 9, on one tablet or phone. Just for fun: nothing to learn, nothing to read.

## How to play

1. Each player taps a friend, then a size: 🐣 Little, 🐥 Big or 🦖 Grown-up. The big button in the middle starts the game.
2. After "3, 2, 1, go!", tap anywhere on your half as fast as you can. Every tap pumps your balloon, and its note climbs as it fills.
3. The first full balloon goes bang, with a huge burst of confetti and a victory dance. The other balloon pops a moment later with a toot, and its friend falls over laughing.
4. The winner's friend earns a silly sticker. Tap 🔁 in the middle for a rematch, or 🎭 to pick new players.

On a tablet the players sit opposite each other by default, and one half turns upside down. The ⬆️⬇️ button changes that. On a tall screen, players sitting opposite get a top and a bottom half. Everyone else gets a left and a right half.

Now and then a round has a surprise: golden balloons with extra confetti, a nosy bird flying past, or a balloon that sputters round the screen instead of popping. After eight rounds on a device, two new friends turn up.

## Keeping it fair

A 6-year-old taps much faster than a 4-year-old, so the size sets how much air a tap gives. `src/tuning.ts` holds every number:

- Little fills in 24 taps, Big in 40 and Grown-up in 56, built around 3, 5 and 7 taps a second. So all three take about 8 seconds.
- The player behind secretly gets up to 50% more air per tap. Someone who stops tapping gets nothing.
- Presses less than 50 ms apart on one half count as one puff, so a flat hand can't beat tapping.

`src/simulate.ts` races these numbers against each other, with children who speed up, slow down and stop to look around. Over 50,000 rounds each:

| Race | First player wins | Second balloon at the bang | Without the comeback |
| --- | --- | --- | --- |
| 3 taps a second (Little) vs 5 (Big) | 53% | 94% full | 87% full |
| 3 taps a second (Little) vs 7 (Grown-up) | 53% | 94% full | 87% full |
| 5 taps a second (Big) vs 7 (Grown-up) | 51% | 95% full | 88% full |

The tuning can only be as good as those speeds. If a Little player taps 3 times a second and a Big player taps 6, the Little player wins about 15% of rounds, though still close, at 91% full. If one child keeps losing, move that child down a size or the other one up.

## Stickers

Wins belong to the friend, not the seat, and stay on the device, so a tally survives children swapping places. There are 16 stickers, and the sheet starts over after the last one.

The game also plays in Slovenian as *Balonski dvoboj*, with the flag in the top bar. Its words are in `src/lang/`. The sizes are worded "Za male", "Za velike" and "Za odrasle", so no word has to agree with a boy or a girl.

## Run it

Balloon Battle is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/balloon-battle     # start a local dev server for just this game
npm test -w @playroom/balloon-battle        # run the unit tests
```

The root `npm run build` puts the game in `dist/balloon-battle/`, live at <https://nazuje.github.io/playroom/balloon-battle/>.
