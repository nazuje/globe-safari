import { describe, expect, it } from 'vitest';
import { canSee, distance, FLOOR, HOLO, inView, inWedge, rayLength, slide, stepDownhill, stepsFrom, tileIndex, tileOf, turnBetween, WALL, type Grid } from './grid.ts';

function gridFrom(lines: string[]): Grid {
  const width = lines[0]?.length ?? 0;
  const cells = Uint8Array.from(lines.join('').split(''), (mark) => (mark === '#' ? WALL : mark === 'H' ? HOLO : FLOOR));
  return { width, height: lines.length, cells };
}

const room = gridFrom(['#######', '#     #', '#  #  #', '#     #', '#######']);

describe('line of sight', () => {
  it('sees across open floor', () => {
    expect(canSee(room, { x: 1.5, y: 1.5 }, { x: 5.5, y: 1.5 })).toBe(true);
  });

  it('is blocked by a wall', () => {
    expect(canSee(room, { x: 1.5, y: 2.5 }, { x: 5.5, y: 2.5 })).toBe(false);
  });

  it('works both ways', () => {
    const a = { x: 2.2, y: 1.1 };
    const b = { x: 4.9, y: 3.8 };
    expect(canSee(room, a, b)).toBe(canSee(room, b, a));
  });

  it('is blocked by a hologram too', () => {
    const grid = gridFrom(['#####', '# H #', '#####']);
    expect(canSee(grid, { x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 })).toBe(false);
  });

  it('measures how far a ray gets', () => {
    expect(rayLength(room, { x: 1.5, y: 1.5 }, 0, 20)).toBeCloseTo(4.5);
    expect(rayLength(room, { x: 1.5, y: 1.5 }, 0, 2)).toBeCloseTo(2);
  });
});

describe('cones', () => {
  const cone = { from: { x: 1.5, y: 1.5 }, facing: 0, half: 0.4, range: 3 };

  it('holds a point straight ahead', () => {
    expect(inWedge(cone, { x: 3.5, y: 1.5 })).toBe(true);
  });

  it('misses a point past its range', () => {
    expect(inWedge(cone, { x: 5, y: 1.5 })).toBe(false);
  });

  it('misses a point outside its angle', () => {
    expect(inWedge(cone, { x: 2.5, y: 3 })).toBe(false);
  });

  it('wraps round the back of the circle', () => {
    expect(inWedge({ ...cone, facing: Math.PI - 0.1 }, { x: 0, y: 1.3 })).toBe(true);
    expect(turnBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6);
  });

  it('stops at walls', () => {
    const behind = { from: { x: 1.5, y: 2.5 }, facing: 0, half: 0.4, range: 5 };
    expect(inWedge(behind, { x: 4.5, y: 2.5 })).toBe(true);
    expect(inView(room, behind, { x: 4.5, y: 2.5 })).toBe(false);
  });
});

describe('moving through walls', () => {
  const radius = 0.28;

  it('slides along a wall instead of sticking', () => {
    const moved = slide(room, { x: 1.5, y: 1.3 }, 0.1, -0.1, radius);
    expect(moved.x).toBeGreaterThan(1.55);
    expect(moved.y).toBeCloseTo(1 + radius);
  });

  it('never ends up inside a wall, however hard it pushes', () => {
    let spot = { x: 1.5, y: 1.5 };
    for (let step = 0; step < 400; step += 1) {
      spot = slide(room, spot, 0.05 * Math.cos(step), 0.05 * Math.sin(step * 1.7), radius);
      expect(room.cells[tileOf(room, spot)]).toBe(FLOOR);
    }
  });

  it('never tunnels through a wall at full speed', () => {
    let spot = { x: 2.5, y: 2.5 };
    for (let step = 0; step < 100; step += 1) spot = slide(room, spot, 0.05, 0, radius);
    expect(spot.x).toBeLessThan(3 - radius + 0.001);
  });

  it('rounds a corner when nearly lined up with an opening', () => {
    const grid = gridFrom(['#####', '#   #', '### #', '#####']);
    let spot = { x: 3.15, y: 1.5 };
    for (let step = 0; step < 30; step += 1) spot = slide(grid, spot, 0, 0.05, radius);
    expect(spot.y).toBeGreaterThan(2);
  });
});

describe('finding the way', () => {
  it('counts steps through open floor only', () => {
    const steps = stepsFrom(room, tileIndex(room, 1, 2), false);
    expect(steps[tileIndex(room, 5, 2)]).toBe(6);
    expect(steps[tileIndex(room, 3, 2)]).toBe(-1);
  });

  it('walks downhill to the target', () => {
    const target = tileIndex(room, 5, 3);
    const steps = stepsFrom(room, target, false);
    let tile = tileIndex(room, 1, 1);
    for (let step = 0; step < 6; step += 1) tile = stepDownhill(room, steps, tile);
    expect(tile).toBe(target);
  });

  it('robots cannot path through a hologram, but the player can', () => {
    const grid = gridFrom(['#####', '# H #', '#####']);
    const target = tileIndex(grid, 3, 1);
    expect(stepsFrom(grid, target, false)[tileIndex(grid, 1, 1)]).toBe(-1);
    expect(stepsFrom(grid, target, true)[tileIndex(grid, 1, 1)]).toBe(2);
  });

  it('measures distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
