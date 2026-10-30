import { missingClips, setLanguage } from '@playroom/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MOVES } from '../moves.ts';
import { gameScript, type Mode, type Step } from '../script.ts';
import clips from './sl.clips.json';
import { sl, slowLines, spokenLines } from './sl.ts';

const words = (text: string) => text.trim().split(/\s+/).length;

function saidIn(mode: Mode): string[] {
  const said: string[] = [];
  const script = gameScript(mode, MOVES, 10, Math.random);
  let next = script.next();
  while (!next.done) {
    const step: Step = next.value;
    if (step.kind === 'say' || step.kind === 'pick') said.push(step.text);
    next = script.next(step.kind === 'pick' ? step.options[0].id : undefined);
  }
  return said;
}

it('moves a step on screen to the new language', () => {
  const step = gameScript('turn', MOVES, 3, () => 0.5).next().value as Step;
  if (step.kind !== 'say') throw new Error('expected a say step');
  expect(step.text).toBe('What does it do?');
  setLanguage('sl');
  expect(step.text).toBe('Kako se premika?');
  expect(step.scene.line).toBe('Kako se premika?');
  expect(step.scene.move?.like).toBe(step.scene.move && sl.moves[step.scene.move.id].like);
  setLanguage('en');
  expect(step.scene.tip).toBe('Your child makes up the move. You copy it!');
});

it('has a clip for every Slovenian line', () => {
  expect(missingClips(clips, spokenLines(), slowLines())).toEqual([]);
});

describe('in Slovenian', () => {
  beforeAll(() => setLanguage('sl'));
  afterAll(() => setLanguage('en'));

  it.each<Mode>(['follow', 'freeze', 'pick', 'turn'])('%s only says declared lines', (mode) => {
    expect(saidIn(mode).filter((line) => !spokenLines().includes(line))).toEqual([]);
  });

  it('keeps spoken lines short enough for a 4-year-old', () => {
    for (const move of Object.values(sl.moves)) {
      expect(words(move.line), move.line).toBeGreaterThanOrEqual(3);
      expect(words(move.line), move.line).toBeLessThanOrEqual(7);
      expect(words(move.chant), move.chant).toBeLessThanOrEqual(7);
      expect(words(sl.dance(move.like))).toBeLessThanOrEqual(7);
    }
  });
});
