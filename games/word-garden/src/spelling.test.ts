import { describe, expect, it } from 'vitest';
import { hintTile, startSpelling, tapTile, type Spelling } from './spelling.ts';

function tileFor(state: Spelling, letter: string): number {
  const tile = state.tiles.find((candidate) => !candidate.used && candidate.letter === letter);
  if (!tile) throw new Error(`No free ${letter} tile`);
  return tile.id;
}

function tapLetters(state: Spelling, letters: string): Spelling {
  return [...letters].reduce((current, letter) => tapTile(current, tileFor(current, letter)).state, state);
}

describe('spelling', () => {
  it('deals the word and the extras as tiles', () => {
    const state = startSpelling('cat', ['m', 'r'], Math.random);
    expect(state.tiles.map((tile) => tile.letter).sort()).toEqual(['a', 'c', 'm', 'r', 't']);
    expect(state.filled).toBe(0);
  });

  it('never deals the word already spelled out in the tray', () => {
    for (let i = 0; i < 300; i++) {
      const letters = startSpelling('cat', ['m'], Math.random).tiles.map((tile) => tile.letter).join('');
      expect(letters).not.toContain('cat');
    }
  });

  it('locks in a correct letter', () => {
    const state = startSpelling('cat', ['m'], Math.random);
    const result = tapTile(state, tileFor(state, 'c'));
    expect(result.outcome).toBe('correct');
    expect(result.state.filled).toBe(1);
  });

  it('changes nothing on a wrong letter', () => {
    const state = startSpelling('cat', ['m'], Math.random);
    const result = tapTile(state, tileFor(state, 'm'));
    expect(result.outcome).toBe('wrong');
    expect(result.state).toBe(state);
  });

  it('treats a right letter in the wrong place as wrong', () => {
    const state = startSpelling('cat', ['m'], Math.random);
    expect(tapTile(state, tileFor(state, 't')).outcome).toBe('wrong');
  });

  it('completes on the last letter, and then ignores taps', () => {
    const state = tapLetters(startSpelling('cat', ['m'], Math.random), 'ca');
    const done = tapTile(state, tileFor(state, 't'));
    expect(done.outcome).toBe('complete');
    expect(tapTile(done.state, tileFor(done.state, 'm')).outcome).toBe('ignored');
  });

  it('ignores a used tile and an unknown tile', () => {
    const state = startSpelling('cat', ['m'], Math.random);
    const id = tileFor(state, 'c');
    expect(tapTile(tapTile(state, id).state, id).outcome).toBe('ignored');
    expect(tapTile(state, 99).outcome).toBe('ignored');
  });

  it('accepts either tile of a double letter', () => {
    const state = tapLetters(startSpelling('bell', ['m'], Math.random), 'be');
    const [first, second] = state.tiles.filter((tile) => tile.letter === 'l');
    expect(tapTile(state, second.id).outcome).toBe('correct');
    expect(tapTile(tapTile(state, second.id).state, first.id).outcome).toBe('complete');
  });

  it('hints the next correct tile, and nothing once done', () => {
    let state = startSpelling('cat', ['m'], Math.random);
    for (const letter of 'cat') {
      const hint = hintTile(state);
      expect(state.tiles.find((tile) => tile.id === hint)?.letter).toBe(letter);
      state = tapLetters(state, letter);
    }
    expect(hintTile(state)).toBeNull();
  });
});
