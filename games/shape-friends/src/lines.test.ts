import { describe, expect, it } from 'vitest';
import * as lines from './lines.ts';
import { LEVELS, makeRound, type Question } from './rounds.ts';
import { STICKERS } from './stickers.ts';

const allQuestions: Question[] = LEVELS.flatMap((level) =>
  Array.from({ length: 50 }, () => makeRound(level.id).questions).flat(),
);

const wordCount = (line: string) => line.split(/\s+/).length;

function expectShort(line: string): void {
  expect(wordCount(line), line).toBeGreaterThanOrEqual(3);
  expect(wordCount(line), line).toBeLessThanOrEqual(7);
}

describe('spoken lines', () => {
  it('are 3 to 7 words for every question', () => {
    for (const question of allQuestions) {
      expectShort(lines.promptLine(question));
      expectShort(lines.cheerLine(question));
    }
  });

  it('are 3 to 7 words for every sticker and fixed line', () => {
    STICKERS.forEach((item) => expectShort(lines.stickerLine(item.friend)));
    const fixed = [...lines.WRONG_LINES, ...lines.GIGGLE_LINES, lines.HINT_LINE, lines.INTRO_LINE];
    [...fixed, lines.PLAY_LINE, lines.PARTY_LINE, lines.NEW_STICKER_LINE, lines.OLD_STICKER_LINE].forEach(expectShort);
  });
});

describe('promptLine', () => {
  const friend = { shape: 'oval', color: 'orange', size: 'middle' } as const;
  const shapeDoors = [{ kind: 'shape', shape: 'oval' }] as const;

  it('uses "an" before a vowel', () => {
    expect(lines.promptLine({ friend, doors: [...shapeDoors], answer: 0 })).toBe("I'm an oval!");
  });

  it('names the disguise on level 4', () => {
    const big = { ...friend, shape: 'triangle', color: 'red', size: 'big' } as const;
    const doors = [{ kind: 'shape', shape: 'triangle' }] as const;
    expect(lines.promptLine({ friend: big, doors: [...doors], answer: 0 })).toBe("I'm a big red triangle!");
  });

  it('speaks the rule on level 5', () => {
    expect(lines.promptLine({ friend, doors: [{ kind: 'size', size: 'big' }], answer: 0 })).toBe('Who is big? I am!');
    expect(lines.promptLine({ friend, doors: [{ kind: 'color', color: 'blue' }], answer: 0 })).toBe('Who is blue? I am!');
  });
});

describe('cheerLine', () => {
  it('says the shape is home', () => {
    const friend = { shape: 'circle', color: 'red', size: 'middle' } as const;
    expect(lines.cheerLine({ friend, doors: [{ kind: 'shape', shape: 'circle' }], answer: 0 })).toBe('Circle is home!');
  });
});
