// Builds the whole site into dist/: the portal at the root and every "ready"
// game from games.json at dist/<slug>/. Folders starting with _ are ignored.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { clipsDir, manifestPath, readLines } from './voice/lines.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');
const SKILLS = new Set(['world', 'memory', 'logic', 'colors', 'reading', 'numbers', 'moving']);
const STATUSES = new Set(['ready', 'coming-soon']);
const LANGUAGES = new Set(['en', 'sl']);

function fail(message) {
  console.error(`\nbuild-site: ${message}`);
  process.exit(1);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function checkRegistry(games) {
  const seen = new Set();
  for (const { slug, skills, status, languages } of games) {
    if (!/^[a-z0-9_-]+$/.test(slug ?? '')) fail(`bad slug in games.json: ${slug}`);
    if (seen.has(slug)) fail(`"${slug}" is listed twice in games.json`);
    seen.add(slug);
    if (!STATUSES.has(status)) fail(`"${slug}" has an unknown status: ${status}`);
    const unknown = (skills ?? []).filter((skill) => !SKILLS.has(skill));
    if (!skills?.length || unknown.length) fail(`"${slug}" needs skills from the fixed set, got: ${skills}`);
    if (!languages?.length || languages.some((language) => !LANGUAGES.has(language))) {
      fail(`"${slug}" needs languages from en, sl, got: ${languages}`);
    }
  }
}

function readyGames(games) {
  const ready = games.filter(({ slug, status }) => status === 'ready' && !slug.startsWith('_'));
  for (const { slug } of ready) {
    const manifest = join(ROOT, 'games', slug, 'package.json');
    if (!existsSync(manifest)) fail(`"${slug}" is ready in games.json but games/${slug}/ has no package.json`);
    if (!readJson(manifest).scripts?.build) fail(`"${slug}" is ready but games/${slug}/package.json has no build script`);
  }
  return ready;
}

/** A game offered in Slovenian must carry every clip it can ask for: a child who can't read depends on them. */
async function checkVoice({ slug, languages }) {
  if (!languages.includes('sl')) return;
  if (!existsSync(manifestPath(slug))) fail(`"${slug}" offers sl but has no clips. Run: npm run voice -- ${slug}`);
  const { clips, slow = {} } = readJson(manifestPath(slug));
  const { spoken, slow: slowLines } = await readLines(slug);
  const missing = [...spoken.filter((line) => !clips[line]), ...slowLines.filter((line) => !slow[line])];
  if (missing.length) fail(`"${slug}" has lines with no clip: ${missing.join(' | ')}. Run: npm run voice -- ${slug}`);
  const gone = [...Object.values(clips), ...Object.values(slow)].filter((file) => !existsSync(join(clipsDir(slug), file)));
  if (gone.length) fail(`"${slug}" lists clips that are not on disk: ${gone.join(', ')}. Run: npm run voice -- ${slug}`);
}

/** Runs the workspace's own build, then copies its dist/ into the site. */
function buildInto(workspace, destination) {
  console.log(`\n--- ${workspace}`);
  const built = join(ROOT, workspace, 'dist');
  rmSync(built, { recursive: true, force: true });
  const { status } = spawnSync('npm', ['run', 'build', '--workspace', workspace], { cwd: ROOT, stdio: 'inherit' });
  if (status !== 0) fail(`${workspace} failed to build`);
  if (!existsSync(join(built, 'index.html'))) fail(`${workspace} built no dist/index.html`);
  cpSync(built, destination, { recursive: true });
}

const games = readJson(join(ROOT, 'games.json'));
checkRegistry(games);
const ready = readyGames(games);
for (const game of ready) await checkVoice(game);

rmSync(DIST, { recursive: true, force: true });
buildInto('portal', DIST);
for (const { slug } of ready) buildInto(join('games', slug), join(DIST, slug));
console.log(`\nbuild-site: portal plus ${ready.length} game(s) in dist/`);
