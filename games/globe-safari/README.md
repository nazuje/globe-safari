# 🌍 Globe Safari

A gentle geography game for parents and young kids (about 3 to 9). Spin a realistic 3D Earth, tap anywhere, land or sea, and meet the wild animals that live there.

## How to play

1. **Spin the Earth.** Drag to turn it, and pinch or scroll to zoom. It slowly turns by itself when nobody is touching it.
2. **Tap anywhere.** The camera flies down to that spot, drops a pin, and opens a panel about the wild place there, like the *Amazon Rainforest*, the *African Savanna* or the *Great Barrier Reef*.
3. **Who lives here?** One mystery animal at a time. Tap **Next clue 🔍** to get another hint (they get easier), then **Reveal! ✨** to flip the card. If your family guessed right, tap **We got it! ⭐** to earn a star.
4. **Meet them all.** See every animal in the region as flip cards. Tap a card to see its name and a fun fact.
5. Tap 🔊 next to any clue or fact to hear it read aloud, perfect for kids who can't read yet.
6. **Surprise me! 🎲** jumps to a random wild place. **Back to space 🚀** zooms back out.

There are 32 wild regions covering every continent and every ocean, each with 6 to 8 animals.

## Run it

Globe Safari is one game in [Playroom](../../README.md). You need Node.js 22 or newer. From the repository root:

```sh
npm install
npm run dev -w @playroom/globe-safari     # start a local dev server for just this game
npm test -w @playroom/globe-safari        # run the unit tests
```

The root `npm run build` puts the game in `dist/globe-safari/` with relative paths, so it works from any folder, including GitHub Pages at `/playroom/globe-safari/`.

## How it works

- `src/data/` holds the hand-written regions and animals, each region with simple latitude/longitude boxes or small polygons and a priority, so small specific places (the Galápagos, Madagascar, New Zealand) win over broad ones.
- `src/geo/lookup.ts` is the pure lookup: it checks whether a point is on land using the country shapes, picks the best matching region, falls back to the nearest region for land in between, and to the right ocean for open water. Every point on Earth gets a region; the tests check a 5° grid over the whole globe.
- `src/globe/` sets up the 3D Earth with globe.gl, the camera moves, borders and the pin.
- `src/ui/` holds the panel, the guessing game, the flip-card grid and the read-aloud button. Speech, the star burst and the home button come from `@playroom/kit`.
- `src/photos.ts` fetches animal photos from Wikipedia at runtime and remembers them. If a photo can't load, the animal's emoji is shown instead.

## Credits

- **Earth imagery:** NASA Blue Marble and topography (public domain), via the [three-globe](https://github.com/vasturiano/three-globe) examples. Star background from the same examples.
- **Clouds:** NASA-derived cloud map from [webgl-earth](https://github.com/turban/webgl-earth) by Bjørn Sandvik, shipped with the globe.gl examples, resized for the web.
- **Country borders:** [Natural Earth](https://www.naturalearthdata.com/) (public domain), via [world-atlas](https://github.com/topojson/world-atlas).
- **Animal photos:** [Wikipedia](https://en.wikipedia.org/) and Wikimedia Commons contributors, loaded live through the Wikipedia REST API.
- **3D globe:** [globe.gl](https://github.com/vasturiano/globe.gl) by Vasco Asturiano, built on [three.js](https://threejs.org/).
- **Font:** [Fredoka](https://fonts.google.com/specimen/Fredoka) from Google Fonts.
