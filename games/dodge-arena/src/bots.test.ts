import { describe, expect, it } from 'vitest';
import { playBot } from './bots.ts';
import { STAGES } from './stages.ts';

const SEEDS = [3, 17, 91];
const median = (values: number[]): number => values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const times = (name: 'idle' | 'careless' | 'skilled', limit: number): number[] => SEEDS.map((seed) => playBot(name, 'endless', null, seed, limit).survived);

describe('simulated players. e2e/bots.mjs plays the real game, and its result decides', () => {
  it('ranks skilled above careless above idle, with idle out early', () => {
    const idle = median(times('idle', 60));
    const careless = median(times('careless', 120));
    const skilled = median(times('skilled', 150));
    expect(idle).toBeLessThan(20);
    expect(careless).toBeGreaterThan(idle);
    expect(skilled).toBeGreaterThan(careless * 2);
  }, 60000);

  it('lets a careless player finish the first stage but not the last one', () => {
    expect(playBot('careless', 'stage', STAGES[0] ?? null, 5).phase).toBe('won');
    expect(playBot('careless', 'stage', STAGES[11] ?? null, 5).phase).toBe('lost');
  });

  it('lets a skilled player finish early stages with no bonks', () => {
    expect(playBot('skilled', 'stage', STAGES[0] ?? null, 5).hits).toBe(0);
    expect(playBot('skilled', 'stage', STAGES[3] ?? null, 5).phase).toBe('won');
  });
});
