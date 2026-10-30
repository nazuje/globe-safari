import { describe, expect, it } from 'vitest';
import { DEBUTS, GIANT_TAPS, type BubbleKind } from './bubbles.ts';
import type { Collection } from './collection.ts';
import { FRIENDS } from './friends.ts';
import { partyGoal } from './party.ts';
import { MAX_BUBBLES, World, type Bubble, type GameEvent } from './world.ts';

const WIDTH = 390;
const HEIGHT = 700;

function play(collection: Collection = { found: [], pops: 0, debuts: 0 }, rng: () => number = Math.random): { world: World; events: GameEvent[]; count: (type: GameEvent['type']) => number } {
  const events: GameEvent[] = [];
  const world = new World({ collection, rng, emit: (event) => events.push(event) });
  world.resize(WIDTH, HEIGHT);
  return { world, events, count: (type) => events.filter((event) => event.type === type).length };
}

function run(world: World, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) world.step(1 / 60);
}

/** Forces a bubble of a kind into the middle of the stage. */
function bubbleOf(world: World, kind: BubbleKind): Bubble {
  const bubble = world.bubbles[0]!;
  for (const other of world.bubbles) other.alive = false;
  Object.assign(bubble, { alive: true, kind, state: 'float', x: 200, homeX: 200, y: 300, r: 60, baseR: 60, drift: -50 });
  return bubble;
}

const live = (world: World): number => world.bubbles.filter((bubble) => bubble.alive).length;

describe('a pop', () => {
  it('starts with one bubble and a finger hint, then fills up', () => {
    const { world } = play();
    run(world, 1);
    expect(live(world)).toBe(1);
    expect(world.hintBubble()).not.toBeNull();
    world.tap(world.hintBubble()!.x, world.hintBubble()!.y);
    expect(world.hintBubble()).toBeNull();
    run(world, 6);
    expect(live(world)).toBeGreaterThan(3);
  });

  it('reacts at once, and the friend lands on the shelf', () => {
    const { world, count, events } = play();
    const bubble = bubbleOf(world, 'plain');
    world.tap(bubble.x, bubble.y);
    expect(events.map((event) => event.type)).toEqual(['pop', 'new-friend', 'save']);
    expect(bubble.alive).toBe(false);
    expect(world.actors.filter((actor) => actor.alive)).toHaveLength(1);
    expect(world.onShelf.size).toBe(0);
    run(world, 3);
    expect(world.actors.filter((actor) => actor.alive)).toHaveLength(0);
    expect(world.onShelf.size).toBe(1);
    expect(count('landed')).toBe(1);
  });

  it('answers a tap on empty sky', () => {
    const { world, count } = play();
    world.tap(5, 5);
    expect(count('miss')).toBe(1);
  });

  it('lets two fingers pop two bubbles in the same moment', () => {
    const { world, count } = play({ found: ['kitten'], pops: 3, debuts: 0 });
    run(world, 3);
    const [one, two] = world.bubbles.filter((bubble) => bubble.alive);
    world.tap(one!.x, one!.y);
    world.tap(two!.x, two!.y);
    expect(count('pop')).toBe(2);
  });

  it('lets a bubble that gets away simply leave', () => {
    const { world, events } = play();
    run(world, 40);
    expect(events.every((event) => event.type !== 'pop')).toBe(true);
    expect(live(world)).toBeGreaterThan(0);
  });
});

describe('the special bubbles', () => {
  it('giant wobbles harder with each tap, then lets out a shower', () => {
    const { world, count } = play();
    const bubble = bubbleOf(world, 'giant');
    let wobble = 0;
    for (let i = 1; i < GIANT_TAPS; i++) {
      world.tap(bubble.x, bubble.y);
      expect(bubble.alive).toBe(true);
      expect(bubble.wobble).toBeGreaterThan(wobble);
      wobble = bubble.wobble;
    }
    expect(count('giant-hit')).toBe(GIANT_TAPS - 1);
    world.tap(bubble.x, bubble.y);
    expect(bubble.alive).toBe(false);
    expect(count('shower')).toBe(1);
    expect(world.bubbles.filter((candidate) => candidate.alive && candidate.kind === 'mini').length).toBeGreaterThan(5);
  });

  it('sleepy winds up, sneezes, blows its neighbours aside and lets its friend out', () => {
    const { world, count } = play();
    const bubble = bubbleOf(world, 'sleepy');
    const neighbour = world.bubbles.find((candidate) => !candidate.alive)!;
    Object.assign(neighbour, { alive: true, kind: 'plain', state: 'float', x: 300, homeX: 300, y: 300, r: 40, baseR: 40, vx: 0, drift: -50 });
    world.tap(bubble.x, bubble.y);
    expect(count('sneeze-start')).toBe(1);
    world.tap(bubble.x, bubble.y);
    expect(count('sneeze-start')).toBe(1);
    run(world, 0.7);
    expect(count('sneeze')).toBe(1);
    expect(count('pop')).toBe(1);
    expect(neighbour.vx).toBeGreaterThan(0);
  });

  it('toot zooms around tooting, stays in the sky, then pops', () => {
    const { world, count } = play();
    const bubble = bubbleOf(world, 'toot');
    world.tap(bubble.x, bubble.y);
    expect(count('toot-start')).toBe(1);
    expect(bubble.alive).toBe(true);
    for (let i = 0; i < 150; i++) {
      world.step(1 / 60);
      if (bubble.state !== 'zoom') break;
      expect(bubble.x).toBeGreaterThanOrEqual(bubble.r - 0.01);
      expect(bubble.y).toBeLessThanOrEqual(world.floor - bubble.r + 0.01);
    }
    expect(count('toot')).toBeGreaterThan(3);
    run(world, 2);
    expect(count('pop')).toBe(1);
  });

  it('rainbow rains bubbles for a few seconds, then stops', () => {
    const { world, count } = play();
    const bubble = bubbleOf(world, 'rainbow');
    world.tap(bubble.x, bubble.y);
    expect(count('rain')).toBe(1);
    run(world, 2);
    const falling = world.bubbles.filter((candidate) => candidate.alive && candidate.drift > 0);
    expect(falling.length).toBeGreaterThan(5);
    run(world, 12);
    expect(world.rainLeft).toBeLessThanOrEqual(0);
    expect(world.bubbles.filter((candidate) => candidate.alive && candidate.drift > 0)).toHaveLength(0);
  });

  it('golden brings a rare friend', () => {
    const { world, count } = play();
    const bubble = bubbleOf(world, 'golden');
    world.tap(bubble.x, bubble.y);
    expect(count('golden')).toBe(1);
    const found = world.collection.found[0];
    expect(FRIENDS.find((friend) => friend.id === found)?.rare).toBe(true);
  });
});

describe('a party', () => {
  it('fires after a run of pops, then play just continues', () => {
    const { world, count } = play({ found: ['kitten'], pops: 0, debuts: 0 });
    for (let i = 0; i < partyGoal(0); i++) {
      const bubble = bubbleOf(world, 'plain');
      world.tap(bubble.x, bubble.y);
    }
    expect(count('party')).toBe(1);
    expect(world.partyLeft).toBeGreaterThan(0);
    expect(world.meter).toBe(0);
    run(world, 6);
    expect(world.partyLeft).toBe(0);
    expect(live(world)).toBeGreaterThan(0);
  });

  it('holds its biggest party when the last friend reaches the shelf, once', () => {
    const everyone = FRIENDS.map((friend) => friend.id).filter((id) => id !== 'kitten');
    const { world, count } = play({ found: everyone, pops: 100, debuts: DEBUTS.length }, () => 0.01);
    const bubble = bubbleOf(world, 'plain');
    world.tap(bubble.x, bubble.y);
    run(world, 3);
    expect(count('everyone')).toBe(1);
    run(world, 6);
    expect(count('everyone')).toBe(1);
  });

  it('never runs a party with an empty shelf or crashes without friends', () => {
    const { world } = play();
    run(world, 2);
    expect(world.partyLeft).toBe(0);
  });
});

describe('a long, wild game', () => {
  it('survives mashing, stays within its limits and fills the shelf', () => {
    const { world, count } = play();
    for (let frame = 0; frame < 60 * 60 * 12; frame++) {
      world.step(1 / 60);
      const target = world.bubbles.find((bubble) => bubble.alive && bubble.y > 0 && bubble.y < world.floor);
      if (frame % 8 === 0 && target) world.tap(target.x, target.y);
      if (frame % 13 === 0) world.tap(Math.random() * WIDTH, Math.random() * HEIGHT);
      if (frame === 60 * 60) world.resize(1280, 700);
      expect(live(world)).toBeLessThanOrEqual(MAX_BUBBLES);
    }
    expect(world.collection.debuts).toBe(DEBUTS.length);
    expect(count('party')).toBeGreaterThan(10);
    expect(world.onShelf.size).toBe(FRIENDS.length);
    expect(count('everyone')).toBe(1);
    for (const bubble of world.bubbles) {
      expect(Number.isFinite(bubble.x) && Number.isFinite(bubble.y)).toBe(true);
    }
  });
});
