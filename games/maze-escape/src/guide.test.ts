import { describe, expect, it } from 'vitest';
import { trailTiles, updateGuide, wayIsClear } from './guide.ts';
import { buildLevel, type LevelData } from './level.ts';
import { newRun, stepRun, type Run } from './run.ts';
import { PLAYER_SPEED, STEP_S } from './tuning.ts';

function runOf(data: Omit<LevelData, 'idea' | 'theme'>): Run {
  return newRun(buildLevel({ idea: 'mix', theme: 'cyan', ...data }, 1, 'easy'));
}

const hall: Omit<LevelData, 'idea' | 'theme'> = {
  map: ['###########', '#S  u    E#', '###########'],
  guide: ['u'],
};

describe('the trail', () => {
  it('leads to the next stop and no further while the sign says wait', () => {
    const run = runOf(hall);
    expect(trailTiles(run, 20)).toHaveLength(3);
  });

  it('leads through a pass-through spot, even when that is not the shortest way', () => {
    const run = runOf({
      map: ['#######', '#S   E#', '# ### #', '#  v  #', '#######'],
      guide: ['+v'],
    });
    const tiles = trailTiles(run, 20);
    expect(tiles[0]).toBe(1 + 2 * 7);
    expect(tiles.length).toBeGreaterThan(6);
  });
});

describe('wait signs', () => {
  it('turns to go when nothing is in the way, and the trail carries on', () => {
    const run = runOf(hall);
    run.x = 4.5;
    updateGuide(run, STEP_S);
    expect(run.leg).toBe(1);
    expect(trailTiles(run, 20).length).toBeGreaterThan(3);
    expect(run.events).toContainEqual({ type: 'go' });
  });

  it('holds while a robot would catch you, and goes when it has passed', () => {
    const run = runOf({ map: ['###################', '#Sa            b E#', '#########u#########', '###################'], guide: ['u'], robots: [{ route: 'ba' }] });
    run.x = 9.5;
    run.y = 2.5;
    run.stillFor = 1;
    updateGuide(run, STEP_S);
    expect(run.leg).toBe(0);
    expect(wayIsClear(run, 1)).toBe(false);
    let opened = false;
    for (let step = 0; step < 60 / STEP_S && !opened; step += 1) {
      stepRun(run, null, STEP_S);
      updateGuide(run, STEP_S);
      opened = run.leg === 1;
    }
    expect(opened).toBe(true);
  });

  it('never holds a child for ever', () => {
    const run = runOf({ map: ["#############", "#E      u   S#", "#############"], guide: ['u'] });
    run.x = 8.5;
    const blocked = { ...run };
    blocked.x = 8.5;
    for (let step = 0; step < 14 / STEP_S; step += 1) updateGuide(blocked, STEP_S);
    expect(blocked.leg).toBe(1);
  });
});

describe('small steps', () => {
  it('moves a third of a tile on a quick tap', () => {
    const run = runOf(hall);
    const from = run.x;
    for (let step = 0; step < 0.12 / STEP_S; step += 1) stepRun(run, { x: 1, y: 0 }, STEP_S);
    expect(run.x - from).toBeCloseTo(0.12 * PLAYER_SPEED, 1);
  });
});
