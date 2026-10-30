import { describe, expect, it } from 'vitest';
import { boundsOf, LEVELS, type Level } from './levels.ts';
import { createWorld, type BlockWorld } from './physics.ts';
import { tableHalf } from './scoring.ts';
import { FIXED_STEP_S } from './stepper.ts';

const named = LEVELS.map((level) => [level.id, level] as const);
const easyTable = (level: Level): number => tableHalf(boundsOf(level).reach, 'easy');

function run(world: BlockWorld, seconds: number): void {
  for (let i = 0; i < seconds / FIXED_STEP_S; i += 1) world.step(FIXED_STEP_S);
}

function furthestDrift(world: BlockWorld, level: Level): number {
  return Math.max(
    ...world.blocks.map(({ body }, index) => {
      const spec = level.blocks[index];
      return spec ? Math.hypot(body.position.x - spec.x, body.position.y - spec.y, body.position.z - spec.z) : 0;
    }),
  );
}

describe('a structure before the first throw', () => {
  it.each(named)('%s does not move at all while it waits', (_id, level) => {
    const world = createWorld(level, easyTable(level));
    run(world, 5);
    expect(furthestDrift(world, level)).toBe(0);
    expect(world.drainEvents()).toEqual([]);
  });

  // A throw that lands nearby wakes the whole structure, so it must also stand on its own when awake.
  it.each(named)('%s still stands once awake', (_id, level) => {
    const world = createWorld(level, easyTable(level));
    world.wakeAll();
    run(world, 4);
    expect(furthestDrift(world, level)).toBeLessThan(0.15);
    expect(world.drainEvents().filter((event) => event.type === 'down')).toEqual([]);
  });
});

describe('a throw', () => {
  const tower = LEVELS[0] as Level;
  const from = { x: 0, y: 7, z: 18 };

  function afterThrow(id: Parameters<BlockWorld['throwBall']>[0], level = tower): BlockWorld {
    const world = createWorld(level, easyTable(level));
    world.throwBall(id, from, { x: 0, y: 3, z: 0 }, 1);
    run(world, 4);
    return world;
  }

  it('knocks blocks off the table and reports them once each', () => {
    const world = afterThrow('bowling');
    const fell = world.drainEvents().filter((event) => event.type === 'down');
    expect(fell.length).toBeGreaterThan(2);
    expect(world.blocks.filter((block) => block.down)).toHaveLength(fell.length);
    expect(new Set(fell.map((event) => (event.type === 'down' ? event.index : -1))).size).toBe(fell.length);
  });

  it('makes clacks that follow the impact', () => {
    const clacks = afterThrow('bowling')
      .drainEvents()
      .filter((event) => event.type === 'clack');
    expect(clacks.length).toBeGreaterThan(3);
    expect(clacks.every((event) => event.type === 'clack' && event.speed > 0)).toBe(true);
  });

  it('never lets a body fly off at a silly speed', () => {
    const world = createWorld(tower, easyTable(tower));
    world.throwBall('bowling', from, { x: 0, y: 3, z: 0 }, 1.3);
    for (let i = 0; i < 240; i += 1) {
      world.step(FIXED_STEP_S);
      expect(Math.max(...world.blocks.map(({ body }) => body.velocity.length()))).toBeLessThan(36);
    }
  });

  it('a slime ball grabs blocks, then lets them go', () => {
    const world = afterThrow('slime');
    expect(world.drainEvents().filter((event) => event.type === 'stuck').length).toBeGreaterThan(0);
  });

  it('a pop block bursts, shoves its neighbours and counts as down', () => {
    const level = LEVELS.find(({ id }) => id === 'cake') as Level;
    const world = afterThrow('bowling', level);
    const events = world.drainEvents();
    const pops = events.filter((event) => event.type === 'pop');
    expect(pops.length).toBeGreaterThan(1);
    const fellIndexes = events.flatMap((event) => (event.type === 'down' ? [event.index] : []));
    for (const pop of pops) if (pop.type === 'pop') expect(fellIndexes).toContain(pop.index);
  });

  it('settles down afterwards', () => {
    const world = afterThrow('bowling');
    run(world, 6);
    expect(world.calm()).toBe(true);
  });

  it('a wave brings knocked-down blocks back, and they only score once they have landed', () => {
    const world = afterThrow('bowling');
    world.drainEvents();
    const spare = world.spareBlocks();
    expect(world.dropWave(8)).toBe(Math.min(spare, 8));
    run(world, 4);
    expect(world.drainEvents().filter((event) => event.type === 'down')).toEqual([]);
    world.settleWave();
    expect(world.standingPoints().length).toBeGreaterThan(3);
    run(world, 2);
    expect(world.drainEvents().filter((event) => event.type === 'down')).toEqual([]);
  });

  it('a wave brings burst pop blocks back too', () => {
    const level = LEVELS.find(({ id }) => id === 'cake') as Level;
    const world = afterThrow('bowling', level);
    world.drainEvents();
    world.dropWave(31);
    expect(world.blocks.some((block) => block.gone)).toBe(false);
    run(world, 4);
    expect(world.drainEvents().filter((event) => event.type === 'pop')).toEqual([]);
  });

  it('finds the block a tap points at', () => {
    const world = createWorld(tower, easyTable(tower));
    const hit = world.firstBlockOnRay({ x: 0, y: 3, z: 20 }, { x: 0, y: 0, z: -1 });
    expect(hit?.z).toBeCloseTo(1, 1);
    expect(world.firstBlockOnRay({ x: 0, y: 30, z: 20 }, { x: 0, y: 0, z: -1 })).toBeNull();
  });
});
