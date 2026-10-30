# 🐸 Animal Moves

A get-up-and-move game for ages 3 to 7, for a child and a grown-up or the whole family. Put the device on a table and move along with it. There are 28 moves, all safe to do on the spot indoors.

## How to play

Tap **Go!** and the game runs by itself. It shows an animal, says the move, counts to three and plays a beat for 10 seconds, then "Freeze!" and on to the next animal. Choose a parade of 3, 6 or 10 animals. Three takes about a minute.

- **Follow me:** do what the game says.
- **Freeze dance:** dance to the beat, and freeze when it stops.
- **You pick:** the child picks the next animal from three.
- **Your turn:** the game asks "What does it do?", the child invents a move, and the grown-up copies it.

## Tuning

Moves live in `src/moves.ts`, and their words in `src/lang/`. Keep them on the spot, with no jumping off things and no running around the room.

## Run it

Animal Moves is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/animal-moves     # start a local dev server for just this game
npm test -w @playroom/animal-moves        # run the unit tests
```

The root `npm run build` puts the game in `dist/animal-moves/`, live at <https://nazuje.github.io/playroom/animal-moves/>.
