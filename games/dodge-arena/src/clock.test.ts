import { expect, it } from 'vitest';
import { formatTime } from './clock.ts';

it('shows seconds with a tenth, then minutes', () => {
  expect(formatTime(0)).toBe('0.0');
  expect(formatTime(47.39)).toBe('47.3');
  expect(formatTime(67.3)).toBe('1:07.3');
  expect(formatTime(-1)).toBe('0.0');
});
