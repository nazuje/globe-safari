import { missingClips } from '@playroom/kit';
import { describe, expect, it } from 'vitest';
import { LEVELS, makeRound, type Door } from '../rounds.ts';
import { STICKERS } from '../stickers.ts';
import clips from './sl.clips.json';
import { sl, spokenLines } from './sl.ts';

const declared = new Set(spokenLines());
const allQuestions = LEVELS.flatMap((level) => Array.from({ length: 200 }, () => makeRound(level.id).questions).flat());

describe('Slovenian lines', () => {
  it('has a clip for every line', () => {
    expect(missingClips(clips, spokenLines())).toEqual([]);
  });

  it('declares every line a round can say', () => {
    for (const question of allQuestions) {
      expect(declared, sl.promptLine(question)).toContain(sl.promptLine(question));
      expect(declared, sl.cheerLine(question)).toContain(sl.cheerLine(question));
    }
  });

  it('declares every sticker friend', () => {
    STICKERS.forEach((item) => expect(declared).toContain(sl.stickerLine(item)));
  });

  it('keeps every line to 3 to 7 words', () => {
    for (const line of declared) {
      const words = line.split(/\s+/).length;
      expect(words, line).toBeGreaterThanOrEqual(3);
      expect(words, line).toBeLessThanOrEqual(7);
    }
  });
});

describe('agreement with the shape', () => {
  const shapeDoor = (shape: 'triangle' | 'star' | 'heart'): Door => ({ kind: 'shape', shape });

  it('names the disguise on level 4', () => {
    const say = (shape: 'triangle' | 'star' | 'heart') =>
      sl.promptLine({ friend: { shape, color: 'blue', size: 'big' }, doors: [shapeDoor(shape)], answer: 0 });
    expect(say('triangle')).toBe('Jaz sem velik moder trikotnik!');
    expect(say('star')).toBe('Jaz sem velika modra zvezda!');
    expect(say('heart')).toBe('Jaz sem veliko modro srce!');
  });

  it('speaks the rule on level 5', () => {
    const question = {
      friend: { shape: 'heart', color: 'red', size: 'small' },
      doors: [{ kind: 'size', size: 'small' }],
      answer: 0,
    } as const;
    expect(sl.promptLine({ ...question, doors: [...question.doors] })).toBe('Jaz sem majhno srce! Poišči majhna vrata!');
    expect(sl.cheerLine({ ...question, doors: [...question.doors] })).toBe('Majhno srce je doma!');
  });

  it('says the shape is home', () => {
    const friend = { shape: 'star', color: 'yellow', size: 'middle' } as const;
    expect(sl.cheerLine({ friend, doors: [shapeDoor('star')], answer: 0 })).toBe('Zvezda je doma!');
  });

  it('dresses sticker friends with the right preposition', () => {
    const sticker = (accessory: 'hat' | 'glasses') =>
      sl.stickerLine({ id: '', friend: { shape: 'star', color: 'green', size: 'middle' }, accessory });
    expect(sticker('hat')).toBe('Jaz sem zelena zvezda s klobukom!');
    expect(sticker('glasses')).toBe('Jaz sem zelena zvezda z očali!');
  });
});
