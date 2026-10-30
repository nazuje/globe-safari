import { describe, expect, it } from 'vitest';
import { letterSound } from './speech.ts';

describe('letterSound', () => {
  it('spells "a" by sound so voices do not say "uh"', () => {
    expect(letterSound('a')).toBe('ay');
  });

  it('gives other letters as capitals', () => {
    expect(letterSound('b')).toBe('B');
    expect(letterSound('z')).toBe('Z');
  });
});
