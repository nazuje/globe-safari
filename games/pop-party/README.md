# 🎈 Pop Party

A silly bubble-popping game for ages 3 to 7, alone or with two kids tapping at once. There's nothing to learn, nothing to lose and no end: the reward is the pop.

## How to play

1. Tap a bubble. It pops, and whoever was inside tumbles out, dances and flies off.
2. Each new friend lands in its own place on the shelf along the bottom, and its name is spoken the first time. The shelf remembers them on this device.
3. Bubbles that float off the top just leave. Nothing happens, and more come.
4. Every pop lights a little flag along the top. When they're all lit, a party breaks out, then play carries on.

Wilder bubbles turn up one by one as friends are popped: a sleepy one that sneezes, a giant one that takes four taps and lets out a shower of small bubbles, a rainbow one that makes it rain bubbles, a cheeky one that toots around the screen, and a golden one with a rare friend. The gold places on the shelf are for those.

The game also plays in Slovenian as *Mehurčkova zabava*, with the flag in the top bar. Its words are in `src/lang/`.

Everything is drawn on one canvas from pre-painted pictures, and all the bubbles and friends are reused, so it stays smooth on an old tablet. If a device still falls behind, the game quietly uses fewer bubbles and less confetti.

## Run it

Pop Party is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/pop-party     # start a local dev server for just this game
npm test -w @playroom/pop-party        # run the unit tests
```

The root `npm run build` puts the game in `dist/pop-party/`, live at <https://nazuje.github.io/playroom/pop-party/>.
