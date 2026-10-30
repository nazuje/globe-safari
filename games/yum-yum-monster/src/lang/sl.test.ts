import { missingClips, setLanguage } from '@playroom/kit';
import { afterEach, describe, expect, it } from 'vitest';
import { COLORS } from '../foods.ts';
import { LEVELS, makeRequests, requestLine } from '../requests.ts';
import { sneezeLine } from '../round.ts';
import clips from './sl.clips.json';
import { en } from './en.ts';
import { sl, spokenLines, tallyLines } from './sl.ts';

afterEach(() => setLanguage('en'));

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('keeps every sentence to 3 to 7 words; only the bite-by-bite numbers are single words', () => {
    const tally = new Set(tallyLines());
    for (const line of spokenLines().filter((candidate) => !tally.has(candidate))) {
      const words = line.split(' ').length;
      expect(words, line).toBeGreaterThanOrEqual(3);
      expect(words, line).toBeLessThanOrEqual(7);
    }
  });

  it('declares every line a real round can produce', () => {
    setLanguage('sl');
    const declared = new Set(spokenLines());
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) {
        for (const request of makeRequests(level)) expect(declared).toContain(requestLine(request));
      }
    }
    for (let i = 0; i < 50; i++) expect(declared).toContain(sneezeLine());
  });

  it('never has a word the voice would spell out letter by letter', () => {
    for (const line of spokenLines()) expect(line, line).not.toMatch(/\bm+\b/i);
  });

  it('counts each gender and form in the accusative', () => {
    const asked = (count: number, food: Parameters<typeof sl.wantCount>[0]): string => sl.wantCount(food, count, 1);
    expect([1, 2, 3, 5].map((n) => asked(n, 'apple'))).toEqual([
      'Hočem eno jabolko!',
      'Hočem dve jabolki!',
      'Hočem tri jabolka!',
      'Hočem pet jabolk!',
    ]);
    expect([1, 2, 3, 4, 5].map((n) => asked(n, 'cookie'))).toEqual([
      'Hočem en piškot!',
      'Hočem dva piškota!',
      'Hočem tri piškote!',
      'Hočem štiri piškote!',
      'Hočem pet piškotov!',
    ]);
    expect([1, 2, 3, 10].map((n) => asked(n, 'pear'))).toEqual([
      'Hočem eno hruško!',
      'Hočem dve hruški!',
      'Hočem tri hruške!',
      'Hočem deset hrušk!',
    ]);
    expect(sl.wantCount('carrot', 4, 2)).toBe('Štiri korenčke, prosim!');
  });

  it('asks for colors in the partitive genitive', () => {
    expect(COLORS.map((color) => sl.wantColor(color, 0))).toEqual([
      'Nekaj rdečega, prosim!',
      'Nekaj rumenega, prosim!',
      'Nekaj zelenega, prosim!',
      'Nekaj oranžnega, prosim!',
      'Nekaj vijoličnega, prosim!',
    ]);
  });

  it('counts bites as bare numbers, the same for every food', () => {
    expect(tallyLines()).toEqual(['Ena!', 'Dve!', 'Tri!', 'Štiri!', 'Pet!', 'Šest!', 'Sedem!', 'Osem!', 'Devet!', 'Deset!']);
  });
});

describe('a language switch', () => {
  it('changes the words of a request and nothing else', () => {
    const [request] = makeRequests(4);
    const english = requestLine(request!);
    expect(english).toBe(en.wantCount(request!.correctId as never, request!.count, request!.variant));
    setLanguage('sl');
    expect(requestLine(request!)).toBe(sl.wantCount(request!.correctId as never, request!.count, request!.variant));
  });
});
