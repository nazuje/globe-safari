import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
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

const FIXES = { tukaj: 'tˈuːkaj', domov: 'dɔmˈɔːw' };

// Stands in for espeak, so each piece of a line is easy to spot.
const fakeIpa = (chunk) => `<${chunk}>`;
const toIpa = (line, fixes = FIXES) => joinParts(splitLine(line, fixes), fakeIpa);

const settings = { text: 'Bravo!', ipa: 'brˈaːʋɔ!', lengthScale: 1.12, voice: 'v', filter: 'f', mp3Args: ['a'] };

describe('splitLine and joinParts', () => {
  it('leaves a line with no fixes as one piece', () => {
    assert.deepEqual(splitLine('Kaj je to?', FIXES), [{ text: 'Kaj je to?' }]);
    assert.equal(toIpa('Kaj je to?'), '<Kaj je to?>');
  });

  it('swaps in a fix mid-line', () => {
    assert.equal(toIpa('Kuku, tukaj sem!'), '<Kuku,> tˈuːkaj <sem!>');
  });

  it('keeps punctuation tight against a fixed word', () => {
    assert.equal(toIpa('Kdo živi tukaj?'), '<Kdo živi> tˈuːkaj<?>');
    assert.equal(toIpa('Tukaj, ne!'), 'tˈuːkaj<, ne!>');
  });

  it('handles a line that is only a fixed word', () => {
    assert.equal(toIpa('Tukaj'), 'tˈuːkaj');
  });

  it('keeps a space between two fixed words', () => {
    assert.equal(toIpa('tukaj domov'), 'tˈuːkaj dɔmˈɔːw');
  });

  it('matches whatever the capitals', () => {
    assert.equal(toIpa('TUKAJ'), 'tˈuːkaj');
    assert.equal(toIpa('Tukaj je.'), 'tˈuːkaj <je.>');
  });

  it('matches whole words only, never part of a longer word', () => {
    assert.equal(toIpa('Tukajle je.'), '<Tukajle je.>');
    assert.equal(toIpa('podomov'), '<podomov>');
  });

  it('treats a letter with a caron as part of the word', () => {
    assert.equal(toIpa('tukajš'), '<tukajš>');
  });

  it('matches a word written with a separate combining caron', () => {
    assert.equal(toIpa('šola', { šola: 'ʃˈoːla' }), 'ʃˈoːla');
  });

  it('sends espeak only pieces with something in them', () => {
    assert.deepEqual(chunksIn(splitLine('Kdo živi tukaj?', FIXES)), ['Kdo živi', '?']);
    assert.deepEqual(chunksIn(splitLine('tukaj domov', FIXES)), []);
  });
});

describe('fixFor', () => {
  it('is not fooled by words that are object built-ins', () => {
    assert.equal(fixFor('constructor', FIXES), undefined);
  });
});

describe('the pronunciation table', () => {
  it('has the three fixes found so far', () => {
    const table = JSON.parse(readFileSync(new URL('./pronunciation.json', import.meta.url), 'utf8'));
    assert.deepEqual(table, { domov: 'dɔmˈɔːw', nekaj: 'nˈeːkaj', tukaj: 'tˈuːkaj' });
  });
});

describe('clipFile', () => {
  it('stays the same for the same input', () => {
    assert.equal(clipFile(settings), clipFile({ ...settings }));
    assert.match(clipFile(settings), /^[0-9a-f]{16}\.mp3$/);
  });

  it('changes with the text, the sounds and every setting', () => {
    const name = clipFile(settings);
    for (const change of [{ text: 'bravo!' }, { ipa: 'x' }, { lengthScale: 1.3 }, { voice: 'w' }, { filter: 'g' }, { mp3Args: ['b'] }]) {
      assert.notEqual(clipFile({ ...settings, ...change }), name);
    }
  });
});

describe('buildManifest', () => {
  it('sorts lines and leaves out an empty slow section', () => {
    const manifest = buildManifest([
      { text: 'b', slow: false, file: '2.mp3' },
      { text: 'a', slow: false, file: '1.mp3' },
    ]);
    assert.deepEqual(manifest, { clips: { a: '1.mp3', b: '2.mp3' } });
    assert.deepEqual(Object.keys(manifest.clips), ['a', 'b']);
  });

  it('keeps slow recordings apart', () => {
    const manifest = buildManifest([
      { text: 'a', slow: false, file: '1.mp3' },
      { text: 'a', slow: true, file: '2.mp3' },
    ]);
    assert.deepEqual(manifest, { clips: { a: '1.mp3' }, slow: { a: '2.mp3' } });
  });
});

describe('staleClips', () => {
  it('finds clips no line uses, and leaves other files alone', () => {
    const entries = [{ file: 'keep.mp3' }];
    assert.deepEqual(staleClips(['keep.mp3', 'old.mp3', '.DS_Store'], entries), ['old.mp3']);
  });
});

describe('addFix', () => {
  it('stores the word in lower case and keeps the table sorted', () => {
    assert.deepEqual(Object.keys(addFix(FIXES, 'Miza', 'mˈiːza')), ['domov', 'miza', 'tukaj']);
  });

  it('replaces an earlier fix', () => {
    assert.equal(addFix(FIXES, 'tukaj', 'x').tukaj, 'x');
  });

  it('refuses anything but one word', () => {
    assert.throws(() => addFix(FIXES, 'dve jabolki', 'x'));
    assert.throws(() => addFix(FIXES, 'bravo!', 'x'));
  });
});

describe('uniqueWords', () => {
  it('lists each word once in Slovenian order, without punctuation', () => {
    assert.deepEqual(uniqueWords(['Čebela, cvet!', 'cvet zebra', 'Žaba']), ['cvet', 'čebela', 'zebra', 'žaba']);
  });
});

describe('markStress', () => {
  it('capitalizes the stressed vowel', () => {
    assert.equal(markStress('tukaj', 'tukˈaːj'), 'tukAj');
    assert.equal(markStress('tukaj', 'tˈuːkaj'), 'tUkaj');
    assert.equal(markStress('domov', 'dɔmˈɔːw'), 'domOv');
    assert.equal(markStress('jabolki', 'jabˈoːwki'), 'jabOlki');
  });

  it('skips the vowel espeak sounds before a syllabic r', () => {
    assert.equal(markStress('rdečega', 'ərdɛtʃˈeːɡa'), 'rdečEga');
  });

  it('leaves a word alone when there is only one place the stress can go', () => {
    assert.equal(markStress('dve', 'dʋˈeː'), 'dve');
  });

  it('leaves a word alone when espeak marked no stress', () => {
    assert.equal(markStress('jabolki', 'jabowki'), 'jabolki');
  });
});
