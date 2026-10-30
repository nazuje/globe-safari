// The pipeline's decisions, as plain functions with no Python and no files, so
// `npm test` can check them on any machine.
import { createHash } from 'node:crypto';

const WORD = /[\p{L}\p{M}]+/gu;

function fixKey(word) {
  return word.normalize('NFC').toLocaleLowerCase('sl');
}

/** Every distinct word in the lines, lower case, in Slovenian alphabetical order. */
export function uniqueWords(lines) {
  const words = new Set(lines.flatMap((line) => (line.match(WORD) ?? []).map(fixKey)));
  return [...words].sort((a, b) => a.localeCompare(b, 'sl'));
}

export function fixFor(word, fixes) {
  const key = fixKey(word);
  return Object.hasOwn(fixes, key) ? fixes[key] : undefined;
}

/**
 * Cuts a line around the words that have a fix: [{ text }, { ipa }, { text }].
 * The fix can't be applied to espeak's output afterward, because espeak merges
 * small words ("v hiši" comes back as one word), and a word that is only part of
 * a longer one must stay untouched.
 */
export function splitLine(line, fixes) {
  const parts = [];
  let done = 0;
  for (const match of line.matchAll(WORD)) {
    const ipa = fixFor(match[0], fixes);
    if (ipa === undefined) continue;
    if (match.index > done) parts.push({ text: line.slice(done, match.index) });
    parts.push({ ipa });
    done = match.index + match[0].length;
  }
  if (done < line.length) parts.push({ text: line.slice(done) });
  return parts;
}

/** The pieces of a split line that espeak has to read. */
export function chunksIn(parts) {
  return parts.flatMap(({ text }) => (text?.trim() ? [text.trim()] : []));
}

/** Puts a split line back together as IPA, keeping the source's spaces around each fixed word. */
export function joinParts(parts, ipaFor) {
  const pieces = parts.map(({ ipa, text }) => {
    if (ipa !== undefined) return ipa;
    const inner = text.trim() ? ipaFor(text.trim()) : '';
    return text.replace(text.trim() || ' ', () => inner || ' ');
  });
  return pieces.join('').replace(/\s+/g, ' ').trim();
}

/**
 * A clip's file name. It covers the spoken sounds as well as the text, so a new
 * pronunciation fix regenerates only the lines that contain that word.
 */
export function clipFile({ text, ipa, lengthScale, voice, filter, mp3Args }) {
  const settings = JSON.stringify([text, ipa, lengthScale, voice, filter, mp3Args]);
  return `${createHash('sha256').update(settings).digest('hex').slice(0, 16)}.mp3`;
}

function sortedObject(pairs) {
  return Object.fromEntries(pairs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** The manifest a game imports: lines to files, in a steady order so diffs stay small. */
export function buildManifest(entries) {
  const of = (slow) => entries.filter((entry) => entry.slow === slow).map(({ text, file }) => [text, file]);
  const slow = of(true);
  return { clips: sortedObject(of(false)), ...(slow.length > 0 ? { slow: sortedObject(slow) } : {}) };
}

/** Clips on disk that no line uses any more. */
export function staleClips(onDisk, entries) {
  const wanted = new Set(entries.map(({ file }) => file));
  return onDisk.filter((file) => file.endsWith('.mp3') && !wanted.has(file));
}

/** Pronunciations with one more fix, keyed the way lookups expect. */
export function addFix(fixes, word, ipa) {
  const words = word.match(WORD) ?? [];
  if (words.length !== 1 || words[0] !== word) throw new Error(`A fix is for one word, got: ${word}`);
  return sortedObject([...Object.entries(fixes), [fixKey(word), ipa]]);
}

const WRITTEN_VOWEL = /[aeiou]/gi;
const SOUNDED_VOWEL = /[aeiouɛɔəɐ]/g;
// "rdeč" has no written vowel before its r, though espeak sounds one.
const HIDDEN_VOWEL = /ə(?=r)/g;

/** Capitalizes the stressed vowel so a person can scan a list: tukaj becomes tukAj. */
export function markStress(word, ipa) {
  const stress = ipa.indexOf('ˈ');
  const vowels = word.match(WRITTEN_VOWEL)?.length ?? 0;
  if (stress < 0 || vowels < 2) return word;
  const before = ipa.slice(0, stress).replace(HIDDEN_VOWEL, '').match(SOUNDED_VOWEL)?.length ?? 0;
  let seen = -1;
  return word.replace(WRITTEN_VOWEL, (vowel) => {
    seen += 1;
    return seen === before ? vowel.toUpperCase() : vowel;
  });
}
