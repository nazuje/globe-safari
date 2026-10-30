// The voice tool. See README.md here.
//   voice.mjs generate [slug]    make missing clips, drop unused ones
//   voice.mjs words [slug]       list every word with its stress
//   voice.mjs fix <word> <ipa>   add a pronunciation fix and regenerate
import { execFile, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { AUDIO_FILTER, LENGTH_SCALE, MP3_ARGS, SLOW_LENGTH_SCALE, VOICE } from './config.mjs';
import {
  addFix,
  buildManifest,
  chunksIn,
  clipFile,
  fixFor,
  joinParts,
  markStress,
  splitLine,
  staleClips,
  uniqueWords,
} from './lib.mjs';
import { clipsDir, gamesWithLines, manifestPath, readLines } from './lines.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PYTHON = join(HERE, '.venv', 'bin', 'python');
const MODEL = join(HERE, 'model', `${VOICE}.onnx`);
const FIXES = join(HERE, 'pronunciation.json');
// One folder per run, so generating two games at once can't clear each other's files.
const WORK = join(HERE, '.cache', String(process.pid));
const FFMPEG_AT_ONCE = 6;

const run = promisify(execFile);

function fail(message) {
  console.error(`\nvoice: ${message}`);
  process.exit(1);
}

function python(script, input) {
  if (!existsSync(PYTHON) || !existsSync(MODEL)) fail('not set up yet. Run: npm run voice:setup');
  const result = spawnSync(PYTHON, [join(HERE, script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) fail(`${script} failed`);
  return result.stdout;
}

function readFixes() {
  return JSON.parse(readFileSync(FIXES, 'utf8'));
}

function chosenGames(slug) {
  const games = gamesWithLines();
  if (slug && !games.includes(slug)) fail(`no games/${slug}/src/lang/sl.ts. Games with lines: ${games.join(', ') || 'none'}`);
  return slug ? [slug] : games;
}

/** Returns a function from text to IPA, covering every given text. */
function phonemizer(texts, fixes) {
  const chunks = [...new Set(texts.flatMap((text) => chunksIn(splitLine(text, fixes))))];
  const ipa = chunks.length > 0 ? JSON.parse(python('phonemize.py', chunks)) : [];
  const known = new Map(chunks.map((chunk, index) => [chunk, ipa[index]]));
  return (text) => joinParts(splitLine(text, fixes), (chunk) => known.get(chunk));
}

function plan(slug, { spoken, slow }, toIpa) {
  const entry = (text, isSlow) => {
    const ipa = toIpa(text);
    const lengthScale = isSlow ? SLOW_LENGTH_SCALE : LENGTH_SCALE;
    const settings = { text, ipa, lengthScale, voice: VOICE, filter: AUDIO_FILTER, mp3Args: MP3_ARGS };
    return { text, slow: isSlow, ipa, lengthScale, file: clipFile(settings) };
  };
  return [...spoken.map((text) => entry(text, false)), ...slow.map((text) => entry(text, true))];
}

async function toMp3(wav, target) {
  // Written beside the target and moved in whole, so a stopped run can't leave half a clip that passes for a finished one.
  const partial = `${target}.partial`;
  await run('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-af', AUDIO_FILTER, ...MP3_ARGS, '-f', 'mp3', partial]);
  renameSync(partial, target);
}

async function makeClips(jobs) {
  if (jobs.length === 0) return;
  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  const items = jobs.map(({ ipa, lengthScale, file }) => ({ ipa, length_scale: lengthScale, wav: join(WORK, `${file}.wav`) }));
  console.log(`Speaking ${jobs.length} new clip(s)`);
  python('synth.py', { model: MODEL, items });

  const left = [...jobs];
  const worker = async () => {
    for (let job = left.shift(); job; job = left.shift()) await toMp3(join(WORK, `${job.file}.wav`), job.target);
  };
  await Promise.all(Array.from({ length: FFMPEG_AT_ONCE }, worker));
  rmSync(WORK, { recursive: true, force: true });
}

async function generate(slug) {
  const slugs = chosenGames(slug);
  const lines = new Map();
  for (const game of slugs) lines.set(game, await readLines(game));
  const toIpa = phonemizer(
    [...lines.values()].flatMap(({ spoken, slow }) => [...spoken, ...slow]),
    readFixes(),
  );

  const plans = slugs.map((game) => ({ game, entries: plan(game, lines.get(game), toIpa) }));
  const jobs = plans.flatMap(({ game, entries }) => {
    mkdirSync(clipsDir(game), { recursive: true });
    return entries
      .map((entry) => ({ ...entry, target: join(clipsDir(game), entry.file) }))
      .filter(({ target }) => !existsSync(target));
  });
  await makeClips(jobs);

  for (const { game, entries } of plans) {
    writeFileSync(manifestPath(game), `${JSON.stringify(buildManifest(entries), null, 2)}\n`);
    const stale = staleClips(readdirSync(clipsDir(game)), entries);
    for (const file of stale) rmSync(join(clipsDir(game), file));
    const made = jobs.filter((job) => job.target.startsWith(clipsDir(game))).length;
    console.log(`${game}: ${entries.length} clip(s), ${made} new, ${stale.length} removed`);
  }
}

async function words(slug) {
  const fixes = readFixes();
  const lines = [];
  for (const game of chosenGames(slug)) {
    const { spoken, slow } = await readLines(game);
    lines.push(...spoken, ...slow);
  }
  const all = uniqueWords(lines);
  const toIpa = phonemizer(all, fixes);
  const width = Math.max(0, ...all.map((word) => word.length)) + 2;
  for (const word of all) {
    const ipa = toIpa(word);
    const note = fixFor(word, fixes) === undefined ? '' : '  (fixed)';
    console.log(`${markStress(word, ipa).padEnd(width)}${ipa}${note}`);
  }
}

async function fix(word, ipa) {
  if (!word || !ipa) fail('usage: npm run voice:fix -- <word> <ipa>');
  writeFileSync(FIXES, `${JSON.stringify(addFix(readFixes(), word, ipa), null, 2)}\n`);
  await generate();
}

const [command, ...args] = process.argv.slice(2);
const commands = { generate, words, fix };
if (!Object.hasOwn(commands, command)) fail(`unknown command: ${command}`);
await commands[command](...args);
