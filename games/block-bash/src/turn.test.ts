import { describe, expect, it } from 'vitest';
import { LEVELS, type Level } from './levels.ts';
import { FIXED_STEP_S } from './stepper.ts';
import { createTurn, type Turn, type TurnEvent } from './turn.ts';

const tower = LEVELS[0] as Level;
const eye = { x: 0, y: 8, z: 22 };
const sky = { x: 0, y: 0.6, z: -0.8 };
const faraway = { x: 40, y: 30, z: -10 };

function until(turn: Turn, wanted: TurnEvent['type'], seconds = 12): TurnEvent[] {
  const seen: TurnEvent[] = [];
  for (let i = 0; i < seconds / FIXED_STEP_S; i += 1) {
    const events = turn.step(FIXED_STEP_S);
    seen.push(...events);
    if (events.some((event) => event.type === wanted)) break;
  }
  return seen;
}

describe('a miss on Tricky', () => {
  it('gets a reaction, and after two the next tap is steered to the structure', () => {
    const turn = createTurn(tower, 'tricky');
    for (let miss = 0; miss < 2; miss += 1) {
      turn.throwBall('bowling', { x: 0, y: 7, z: 18 }, faraway);
      expect(until(turn, 'missed').some((event) => event.type === 'missed')).toBe(true);
    }
    const helped = turn.aim(eye, sky);
    expect(Math.abs(helped.x)).toBeLessThan(2);
    expect(helped.y).toBeGreaterThan(0);
    expect(helped.y).toBeLessThan(tower.blocks.at(-1)?.y ?? 0);
  });

  it('gives no help before that', () => {
    const turn = createTurn(tower, 'tricky');
    expect(turn.aim({ x: 30, y: 3, z: 20 }, { x: 0, y: 0, z: -1 }).x).toBeGreaterThan(20);
  });
});

describe('a wave', () => {
  it('falls at the halfway ball and thumps down', () => {
    const turn = createTurn(tower, 'easy');
    const seen: TurnEvent['type'][] = [];
    for (let ball = 0; ball < 3; ball += 1) {
      turn.throwBall('bowling', { x: 0, y: 7, z: 18 }, turn.bestSpot());
      seen.push(...until(turn, 'ready').map((event) => event.type));
    }
    expect(seen).toContain('wave');
    expect(seen).toContain('waveLanded');
    expect(turn.round().total).toBeGreaterThan(tower.blocks.length);
  });
});
