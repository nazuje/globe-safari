# 🧸 Playroom

A cozy shelf of small web games for a parent and a young child to play together. The portal at the site root shows every game as a big tile; each game lives at its own sub-path.

Live at <https://nazuje.github.io/playroom/>, with games at `/playroom/<slug>/`.

## Layout

```
games.json            the registry: every game the portal shows
portal/               the game picker, served at the site root
games/<slug>/         one folder per game
games/_template/      a working starter game, copied to make new ones
packages/kit/         @playroom/kit: speech, star burst, home button, store, kit.css
scripts/build-site.mjs  builds the portal and every ready game into dist/
```

It is one npm workspace with one root `package-lock.json`. TypeScript, Vite and Vitest live at the root. Each game keeps its own dependencies.

## Run it

You need Node.js 22 or newer.

```sh
npm install
npm run dev                          # the portal, with every ready game at /<slug>/
npm run dev -w @playroom/<slug>      # one game on its own
npm test                             # every workspace's tests
npm run typecheck                    # every workspace, including the template
npm run build                        # the whole site into dist/
npm run preview                      # serve dist/ at http://localhost:5179
```

`npm run dev` is enough to click through the whole site. A small Vite plugin in `portal/devGames.ts` runs each ready game inside the portal's dev server, so tile links work and edits to a game reload the page. A game has to be `"ready"` in `games.json` to appear there. While a game is still `"coming-soon"`, use `npm run dev -w @playroom/<slug>`.

## The registry

`games.json` is an array with one entry per game:

| Field | Meaning |
| --- | --- |
| `slug` | Folder name in `games/` and the URL path |
| `title`, `emoji` | Shown on the tile |
| `tagline` | One short kid-friendly line |
| `skills` | Any of `world`, `memory`, `logic`, `colors`, `reading`, `numbers`, `moving` |
| `ages` | A range such as `"4-9"`. The portal's age filter shows a game when the chosen age falls inside it, ends included |
| `modes` | `"solo"`, `"together"`, or both: how the game can be played |
| `color` | Hex accent for the tile |
| `status` | `"ready"` or `"coming-soon"` |

`"coming-soon"` games show as dimmed tiles and are not built. `"ready"` games are linked and built, and the build fails loudly if a ready game has no `games/<slug>/` folder or no `build` script. **When your game is finished, flip its own entry to `"ready"`.**

## Template: add a new game

1. Copy the template. Folders starting with `_` are ignored by the site build, so the copy needs a real name:

   ```sh
   cp -R games/_template games/<slug>
   ```

2. In `games/<slug>/package.json`, set `"name"` to `"@playroom/<slug>"`. Two workspaces can't share a name, so do this before anything else.
3. In `games/<slug>/index.html`, change the title, description, favicon emoji and heading.
4. Add an entry to `games.json` with `"status": "coming-soon"`, or update the one already there.
5. Run `npm install` at the root. This adds the game to `package-lock.json`, and CI's `npm ci` fails without it. If two people add games at once, take either side of a lockfile conflict and run `npm install` again.
6. Build the game in `games/<slug>/src/`, and start it with `npm run dev -w @playroom/<slug>`. If it has tests, add `"test": "vitest run"` to its scripts and `npm test` picks them up.
7. When it's done, set `"status": "ready"` and check `npm run build`.

Keep the game's `base: './'` and use relative paths only, because the site runs under `/playroom/`.

## The kit

Games import from `@playroom/kit`. It is plain TypeScript with no dependencies and no build step of its own; Vite bundles it into each game.

- `speak(text)`, `canSpeak()`, `stopSpeaking()`: read aloud in a friendly English voice. Safe to call where speech isn't supported.
- `burst(x, y, count?)`: a star burst at a viewport position. It needs no CSS and calms down for people who prefer reduced motion.
- `homeButton()`: a big round 🏠 link back to the portal, for the game's top bar.
- `store.get(key, fallback)`, `store.set(key, value)`: small JSON values in localStorage for this device, such as best scores. They never throw, so nothing important should rely on them.
- `import '@playroom/kit/kit.css'`: the Fredoka font, the palette as CSS custom properties, the page background, `.btn` with `.btn-sun`, `.btn-coral`, `.btn-leaf` and `.btn-grape`, `.topbar` with `.topbar-end`, and reduced-motion handling.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/` to GitHub Pages (turn on **Settings → Pages → Source: GitHub Actions** once in the repository).

## Credits

Each game credits its own sources in its README. See [Globe Safari](games/globe-safari/README.md). The font is [Fredoka](https://fonts.google.com/specimen/Fredoka) from Google Fonts.
