import { describe, expect, it } from 'vitest';
import routes from '../e2e/routes.json';
import { buildLevel } from './level.ts';
import { PLANS, WORLD_OF } from './levels.ts';
import { newRun, step, type Input } from './sim.ts';

interface Step {
  t: number;
  dir: -1 | 0 | 1;
  jump: boolean;
  dash: boolean;
}

/** The plain recording of a route, with no steering: every button change on its exact tick. */
const recorded = routes as unknown as Record<string, { steps: Step[]; seconds: number }>;

describe('the towers', () => {
  it('has 24 levels in four worlds of six', () => {
    expect(PLANS).toHaveLength(24);
    for (const world of new Set(WORLD_OF)) expect(WORLD_OF.filter((owner) => owner === world)).toHaveLength(6);
  });

  it('opens wall jumps at level 3 and the dash at level 8', () => {
    expect(PLANS.map((plan) => plan.walls).indexOf(true)).toBe(2);
    expect(PLANS.map((plan) => plan.dash).indexOf(true)).toBe(7);
  });

  it('speeds the lava up from the first level to the last', () => {
    expect(PLANS.at(-1)!.lavaSpeed).toBeGreaterThan(PLANS[0]!.lavaSpeed * 2);
  });
});

describe.each(PLANS.map((plan) => [plan.id, plan] as const))('%s', (id, plan) => {
  it('can be climbed: its recorded route beats the lava in time for the speed star', () => {
    const level = buildLevel(plan);
    const run = newRun(level);
    const { steps } = recorded[id]!;
    let at = 0;
    let input: Input = { dir: 0, jump: false, dash: false };
    while (run.phase !== 'won' && run.phase !== 'singed' && run.tick < 120 * 120) {
      while (at < steps.length && steps[at]!.t <= run.tick) {
        const { dir, jump, dash } = steps[at]!;
        input = { dir, jump, dash };
        at += 1;
      }
      step(level, run, input);
    }
    expect(run.phase).toBe('won');
    expect(run.tick / 120).toBeLessThanOrEqual(plan.par);
  });
});
