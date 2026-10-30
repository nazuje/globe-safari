import { describe, expect, it } from 'vitest';
import { DINOS, ITEMS, itemById } from './catalog.ts';
import { chestPrizes, digTile, finishPatch, goalsLeft, HINT_AFTER, makePatch, nearestGoal, rollSurprise, type Patch } from './patch.ts';
import { PLACES } from './places.ts';
import { addFound, currentDino, freshSave, missingBones } from './save.ts';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function digOut(patch: Patch, index: number): ReturnType<typeof digTile> {
  let result = digTile(patch, index);
  while (result.type === 'chip') result = digTile(patch, index);
  return result;
}

describe('a patch', () => {
  it('is 4 by 4 when small and 5 by 6 with deeper tiles when big', () => {
    const small = makePatch({ save: freshSave(), size: 'small', surprise: null }, seeded(1));
    const big = makePatch({ save: freshSave(), size: 'big', surprise: null }, seeded(1));
    expect(small.tiles).toHaveLength(16);
    expect(big.tiles).toHaveLength(30);
    const mean = (patch: Patch): number => patch.tiles.reduce((sum, tile) => sum + tile.layers, 0) / patch.tiles.length;
    expect(mean(big)).toBeGreaterThan(mean(small));
    for (const tile of [...small.tiles, ...big.tiles]) {
      expect(tile.layers).toBeGreaterThanOrEqual(1);
      expect(tile.layers).toBeLessThanOrEqual(3);
    }
  });

  it('holds only known things, and goals on tiles of their own', () => {
    for (let seed = 0; seed < 100; seed++) {
      const patch = makePatch({ save: freshSave(), size: seed % 2 ? 'big' : 'small', surprise: null }, seeded(seed));
      expect(new Set(patch.goals).size).toBe(patch.goals.length);
      for (const tile of patch.tiles) {
        if (tile.buried?.kind === 'treasure' || tile.buried?.kind === 'friend') {
          expect(itemById(tile.buried.id), tile.buried.id).toBeDefined();
        }
      }
    }
  });

  it('only buries what belongs to the place', () => {
    for (const [index, place] of PLACES.entries()) {
      const save = { ...freshSave(), place: index };
      for (let seed = 0; seed < 40; seed++) {
        const patch = makePatch({ save, size: 'big', surprise: null }, seeded(seed));
        expect(patch.place).toBe(place.id);
        for (const tile of patch.tiles) {
          if (tile.buried?.kind !== 'treasure' && tile.buried?.kind !== 'friend') continue;
          const home = itemById(tile.buried.id)?.place;
          if (home) expect(home).toBe(place.id);
        }
      }
    }
  });

  it('puts bones of the current dinosaur only', () => {
    const save = freshSave();
    for (const id of missingBones(save, 'longneck')) addFound(save, id);
    expect(currentDino(save)).toBe('threehorn');
    const patch = makePatch({ save, size: 'big', surprise: null }, seeded(4));
    const bones = patch.tiles.flatMap((tile) => (tile.buried?.kind === 'treasure' && itemById(tile.buried.id)?.family === 'bone' ? [tile.buried.id] : []));
    expect(bones).toHaveLength(3);
    for (const bone of bones) expect(bone).toMatch(/^threehorn-/);
  });

  it('still fills a patch when every bone is found', () => {
    const save = freshSave();
    for (const dino of DINOS) for (const id of missingBones(save, dino)) addFound(save, id);
    for (const item of ITEMS) addFound(save, item.id);
    const patch = makePatch({ save, size: 'small', surprise: null }, seeded(9));
    expect(patch.goals).toHaveLength(4);
  });
});

describe('digging', () => {
  it('takes as many taps as the tile has layers', () => {
    const patch = makePatch({ save: freshSave(), size: 'big', surprise: null }, seeded(2));
    patch.tiles.forEach((tile, index) => {
      for (let tap = 1; tap < tile.layers; tap++) expect(digTile(patch, index).type).toBe('chip');
      expect(digTile(patch, index).type).toBe('open');
    });
  });

  it('ignores open holes and tiles that do not exist', () => {
    const patch = makePatch({ save: freshSave(), size: 'small', surprise: null }, seeded(3));
    digOut(patch, 0);
    expect(digTile(patch, 0)).toEqual({ type: 'nothing' });
    expect(digTile(patch, 99)).toEqual({ type: 'nothing' });
    expect(digTile(patch, -1)).toEqual({ type: 'nothing' });
  });

  it('finishes the moment the last goal is out, whatever else is left', () => {
    const patch = makePatch({ save: freshSave(), size: 'small', surprise: null }, seeded(5));
    const goals = [...patch.goals];
    const last = goals.pop()!;
    for (const index of goals) expect(digOut(patch, index)).toMatchObject({ done: false, goal: true });
    expect(digOut(patch, last)).toMatchObject({ done: true, goal: true });
    expect(goalsLeft(patch)).toBe(0);
  });

  it('counts friends and silly finds as not to be found, so they can be skipped', () => {
    const patch = makePatch({ save: freshSave(), size: 'small', surprise: null }, seeded(6));
    const friend = patch.tiles.findIndex((tile) => tile.buried?.kind === 'friend');
    expect(digOut(patch, friend)).toMatchObject({ goal: false, done: false });
  });
});

describe('the sparkle hint', () => {
  it('glints on the nearest treasure after a few empty digs, and stays until it is dug', () => {
    for (let seed = 0; seed < 50; seed++) {
      const patch = makePatch({ save: freshSave(), size: 'big', surprise: null }, seeded(seed));
      const empties = patch.tiles.flatMap((_, index) => (patch.goals.includes(index) ? [] : [index]));
      let last = -1;
      for (let i = 0; i < HINT_AFTER - 1; i++) {
        last = empties[i]!;
        expect(digOut(patch, last)).toMatchObject({ hint: null });
      }
      last = empties[HINT_AFTER - 1]!;
      const before = nearestGoal(patch, last);
      expect(digOut(patch, last)).toMatchObject({ hint: before });
      expect(digOut(patch, empties[HINT_AFTER]!)).toMatchObject({ hint: before });
      digOut(patch, before!);
      expect(patch.hint).toBeNull();
      expect(patch.emptyStreak).toBe(0);
    }
  });

  it('never leaves a child digging long: following the hint always ends the patch quickly', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rng = seeded(seed);
      const patch = makePatch({ save: freshSave(), size: 'big', surprise: null }, rng);
      let digs = 0;
      while (goalsLeft(patch) > 0) {
        const open = patch.tiles.flatMap((tile, index) => (tile.left > 0 ? [index] : []));
        digOut(patch, patch.hint ?? open[Math.floor(rng() * open.length)]!);
        digs += 1;
      }
      expect(digs).toBeLessThanOrEqual((HINT_AFTER + 1) * patch.goals.length);
    }
  });
});

describe('rare surprises', () => {
  it('never comes on the very first patch', () => {
    expect(rollSurprise(freshSave(), () => 0)).toBeNull();
  });

  it('is rare on most patches', () => {
    const rng = seeded(11);
    const save = { ...freshSave(), patches: 3 };
    const rolls = Array.from({ length: 4000 }, () => rollSurprise(save, rng));
    const share = (kind: string): number => rolls.filter((roll) => roll === kind).length / rolls.length;
    expect(share('chest')).toBeGreaterThan(0.08);
    expect(share('chest')).toBeLessThan(0.22);
    expect(share('egg')).toBeGreaterThan(0.01);
    expect(share('egg')).toBeLessThan(0.08);
  });

  it('turns up in the end for a patient digger', () => {
    expect(rollSurprise({ ...freshSave(), patches: 9, sinceChest: 5 }, () => 0.99)).toBe('chest');
    expect(rollSurprise({ ...freshSave(), patches: 20, sinceEgg: 16 }, () => 0.99)).toBe('egg');
  });

  it('makes the surprise something to find', () => {
    const patch = makePatch({ save: freshSave(), size: 'small', surprise: 'chest' }, seeded(7));
    expect(patch.goals).toHaveLength(4);
    expect(patch.tiles[patch.goals[0]!]!.buried).toEqual({ kind: 'chest' });
    const egg = makePatch({ save: freshSave(), size: 'small', surprise: 'egg' }, seeded(7));
    expect(egg.tiles[egg.goals[0]!]!.buried).toMatchObject({ kind: 'egg' });
  });

  it('bursts the golden chest into a gold prize and two more', () => {
    const prizes = chestPrizes(freshSave(), 'beach', seeded(8));
    expect(prizes).toHaveLength(3);
    expect(itemById(prizes[0]!)?.family).toBe('gold');
  });
});

describe('finishing a patch', () => {
  it('moves to a new place and keeps count', () => {
    const save = { ...freshSave(), sinceChest: 2, sinceEgg: 2, place: PLACES.length - 1 };
    finishPatch(save, makePatch({ save, size: 'small', surprise: null }, seeded(1)));
    expect(save).toMatchObject({ place: 0, patches: 1, sinceChest: 3, sinceEgg: 3 });
    finishPatch(save, makePatch({ save, size: 'small', surprise: 'chest' }, seeded(1)));
    expect(save).toMatchObject({ place: 1, patches: 2, sinceChest: 0, sinceEgg: 4 });
  });
});
