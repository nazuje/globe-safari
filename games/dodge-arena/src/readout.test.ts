import { expect, it } from 'vitest';
import type { Danger } from './dangers.ts';
import { dangersText, readDangers } from './readout.ts';

it('gives a tester back the same dangers it published', () => {
  const danger: Danger = { id: 4, kind: 'bar', phase: 'warn', t: 0.25, warn: 1.2, live: 5, x: 1.5, z: -2.5, dx: 0, dz: 0, angle: 1.25, spin: 2, size: 4, speed: 0 };
  expect(readDangers(dangersText([danger]))).toEqual([danger]);
});
