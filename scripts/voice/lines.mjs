// Reads a game's src/lang/sl.ts. Node runs the TypeScript directly by stripping
// its types, so the file has to stick to what the games already do: `.ts` on
// relative imports, `import type` for types, and no CSS or asset imports.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GAMES_DIR = fileURLToPath(new URL('../../games/', import.meta.url));

export const linesPath = (slug) => join(GAMES_DIR, slug, 'src', 'lang', 'sl.ts');
export const manifestPath = (slug) => join(GAMES_DIR, slug, 'src', 'lang', 'sl.clips.json');
export const clipsDir = (slug) => join(GAMES_DIR, slug, 'public', 'voice', 'sl');

/** Every game that declares Slovenian lines. Folders starting with _ are ignored, as in the site build. */
export function gamesWithLines() {
  return readdirSync(GAMES_DIR)
    .filter((slug) => !slug.startsWith('_') && existsSync(linesPath(slug)))
    .sort();
}

function checked(lines, slug) {
  const blank = lines.findIndex((line) => typeof line !== 'string' || line.trim() === '');
  if (blank >= 0) throw new Error(`${slug}: line ${blank} is blank or not text`);
  return [...new Set(lines)];
}

/** { spoken, slow }: every line the game can say, and those it also says slowly. */
export async function readLines(slug) {
  const module = await import(pathToFileURL(linesPath(slug)).href);
  if (typeof module.spokenLines !== 'function') throw new Error(`${slug}: src/lang/sl.ts must export spokenLines()`);
  return { spoken: checked(module.spokenLines(), slug), slow: checked(module.slowLines?.() ?? [], slug) };
}
