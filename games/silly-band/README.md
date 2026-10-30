# 🎸 Silly Band

A silly stage band for ages 3 to 9, alone or with two children tapping at once. There's nothing to learn and no way to get it wrong: it's a toy that always sounds good.

## How to play

1. Tap the six musicians. The frog plays bass, the dinosaur drums, the cat a tune, the robot sings bleeps, the alien rings a bell and the chicken claps. Tap with as many fingers as you like.
2. Tap ▶️ and the band starts a steady beat. Everything you play joins in on time.
3. Tap 🔴 to record eight bars, with a bar filling up as you go. Then the musicians play your song back by themselves. Record again to add more on top. 🧹 clears the song.
4. Tap ✨ to change style: march, disco, lullaby, robot or circus. Each has its own tempo, beat and stage lights, and your song plays along.

Keep playing and the audience grows. Now and then a spotlight picks out a musician for a funny solo, the crowd goes wild, or the chicken lays an egg on the beat that hatches into a tiny new band member. The band, the crowd and the song are remembered on the device.

## How the music stays nice

Every note comes from a pentatonic scale, which has no notes that clash, and a tap is pulled gently onto the nearest step of a steady grid. The picture reacts at once, even when the note waits a moment for the beat. Notes are booked ahead on the audio clock, so the beat can't drift, and a tab that wakes from sleep skips what it missed instead of playing it all at once. All sound stops when the page is hidden or left.

The music rules are plain tested code in `music.ts`, `pattern.ts`, `styles.ts` and `patches.ts`. There are no sound files except the Slovenian voice clips.

The game also plays in Slovenian as *Smešni orkester*, with the flag in the top bar. Its words are in `src/lang/`.

## Run it

Silly Band is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/silly-band     # start a local dev server for just this game
npm test -w @playroom/silly-band        # run the unit tests
```

The root `npm run build` puts the game in `dist/silly-band/`, live at <https://nazuje.github.io/playroom/silly-band/>.
