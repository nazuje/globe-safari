import { describe, expect, it } from 'vitest';
import type { Ray, Vec3 } from './aim.ts';
import { HAT_IDS } from './hats.ts';
import { CAMERA, SCENE_IDS, type SceneId } from './layout.ts';
import {
  centerOf,
  createRound,
  easiestTarget,
  isSolid,
  needsHelp,
  radiusOf,
  stepRound,
  takeEvents,
  throwBall,
  type Round,
  type RoundEvent,
  type RoundOptions,
} from './round.ts';
import { GOLDEN_POINTS, LEVEL_IDS, ROUND_SECONDS, type LevelId } from './tuning.ts';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function round(options: Partial<RoundOptions> = {}): Round {
  return createRound({ scene: 'village', level: 'easy', hats: ['topHat', 'bobble'], rng: seeded(7), ...options });
}

const FROM: Vec3 = { x: 0, y: 2, z: 8 };

function rayAt(point: Vec3, wobble = { x: 0, y: 0 }): Ray {
  const origin = CAMERA.position;
  const x = point.x + wobble.x - origin.x;
  const y = point.y + wobble.y - origin.y;
  const z = point.z - origin.z;
  const length = Math.hypot(x, y, z);
  return { origin, dir: { x: x / length, y: y / length, z: z / length } };
}

/** Plays a whole round with a child who taps every `gap` seconds, this far off the middle of a snowman. */
function play(level: LevelId, scene: SceneId, seed: number, gap: number, sloppiness: number) {
  const rng = seeded(seed);
  const game = createRound({ scene, level, hats: ['topHat', 'bobble', 'party'], rng: seeded(seed + 1) });
  const events: RoundEvent[] = [];
  let thrown = 0;
  let wait = 0;
  let steps = 0;
  while (game.phase !== 'done' && steps < 60 * 400) {
    stepRound(game, 1 / 60);
    steps += 1;
    wait -= 1 / 60;
    if (wait <= 0 && game.phase !== 'clearing' && game.phase !== 'burst') {
      const solid = game.targets.filter(isSolid);
      if (solid.length > 0) {
        const target = solid[Math.floor(rng() * solid.length)];
        const wobble = { x: (rng() - 0.5) * sloppiness * 2, y: (rng() - 0.5) * sloppiness * 2 };
        throwBall(game, rayAt(centerOf(target), wobble), FROM);
        thrown += 1;
        wait = gap;
      }
    }
    events.push(...takeEvents(game));
  }
  return { game, events, thrown, seconds: steps / 60 };
}

describe('a round', () => {
  it('runs about a minute, then a giant, then ends, on every level and scene', () => {
    for (const level of LEVEL_IDS) {
      for (const scene of SCENE_IDS) {
        const { game, events, seconds } = play(level, scene, 3, 0.5, 0.3);
        expect(game.phase).toBe('done');
        expect(seconds).toBeGreaterThanOrEqual(ROUND_SECONDS);
        expect(seconds).toBeLessThan(120);
        expect(events.filter((event) => event.type === 'giantIn')).toHaveLength(1);
        expect(events.filter((event) => event.type === 'giantBurst')).toHaveLength(1);
        expect(events.at(-1)?.type).toBe('done');
      }
    }
  });

  it('never ends by itself: the giant waits as long as it takes', () => {
    const game = round();
    stepRound(game, 600);
    expect(game.phase).toBe('finale');
    expect(game.targets.some((target) => target.kind === 'giant')).toBe(true);
  });

  it('plays the same at any frame rate', () => {
    const run = (frames: number): string => {
      const game = round();
      for (let frame = 0; frame < frames; frame++) stepRound(game, 30 / frames);
      return game.targets.map((target) => `${target.id}:${target.x.toFixed(2)}`).join();
    };
    expect(run(900)).toBe(run(3600));
  });

  it('lets a 4-year-old hit nearly every time on Easy', () => {
    for (const scene of SCENE_IDS) {
      for (const seed of [1, 2, 3]) {
        const { events, thrown } = play('easy', scene, seed, 0.9, 1.2);
        const misses = events.filter((event) => event.type === 'miss').length;
        expect(misses / thrown).toBeLessThan(0.1);
      }
    }
  });

  it('asks for better aim on Hard', () => {
    const count = (level: LevelId): number => {
      const { events, thrown } = play(level, 'village', 5, 0.7, 1.2);
      return events.filter((event) => event.type === 'miss').length / thrown;
    };
    expect(count('hard')).toBeGreaterThan(count('easy') + 0.1);
  });

  it('gets busier and faster towards the end', () => {
    const atStart = round({ level: 'hard', rng: seeded(4) });
    stepRound(atStart, 5);
    const crowdAtStart = atStart.targets.filter((target) => target.kind === 'snowman').length;
    stepRound(atStart, 52);
    const crowdAtEnd = atStart.targets.filter((target) => target.kind === 'snowman').length;
    expect(crowdAtEnd).toBeGreaterThan(crowdAtStart);
  });

  it('rewards a good round with three stars and always gives at least one', () => {
    for (const level of LEVEL_IDS) {
      const sharp = play(level, 'village', 9, 0.45, 0);
      expect(sharp.game.stars).toBe(3);
      const slow = play(level, 'village', 9, 2.5, 3);
      expect(slow.game.stars).toBeGreaterThanOrEqual(1);
      expect(slow.game.score).toBeLessThan(sharp.game.score);
    }
  });

  it('keeps Easy out of the distance and puts small far targets on Hard', () => {
    const seen = (level: LevelId): Set<string> => {
      const game = round({ level, rng: seeded(2) });
      const bands = new Set<string>();
      for (let i = 0; i < 2400; i++) {
        stepRound(game, 1 / 60);
        for (const target of game.targets) bands.add(target.spot.band);
      }
      return bands;
    };
    expect(seen('easy').has('far')).toBe(false);
    expect(seen('hard').has('far')).toBe(true);
  });
});

describe('a hit', () => {
  function firstTarget(game: Round) {
    stepRound(game, 1.2);
    const target = game.targets.find(isSolid);
    if (!target) throw new Error('no target came out');
    return target;
  }

  it('splats the snowman and rebuilds it somewhere else', () => {
    const game = round();
    const target = firstTarget(game);
    const hat = target.hat;
    const spot = target.spot.id;
    throwBall(game, rayAt(centerOf(target)), FROM);
    stepRound(game, 0.8);
    const events = takeEvents(game);
    const splat = events.find((event) => event.type === 'splat');
    expect(splat).toMatchObject({ hat });
    expect(game.score).toBe(1);
    stepRound(game, 1);
    expect(takeEvents(game).some((event) => event.type === 'rebuild')).toBe(true);
    expect(target.spot.id).not.toBe(spot);
    expect(game.targets).toContain(target);
  });

  it('scores nothing for a snowball in the sky, and costs nothing', () => {
    const game = round();
    stepRound(game, 1);
    const up: Ray = { origin: CAMERA.position, dir: { x: 0, y: 0.6, z: -0.8 } };
    throwBall(game, up, FROM);
    stepRound(game, 1.2);
    expect(takeEvents(game).some((event) => event.type === 'miss')).toBe(true);
    expect(game.score).toBe(0);
  });

  it('survives two children throwing at once, and any amount of mashing', () => {
    const game = round();
    stepRound(game, 1.2);
    const rng = seeded(11);
    for (let i = 0; i < 200; i++) {
      const dir = { x: rng() - 0.5, y: rng() - 0.6, z: -1 };
      const length = Math.hypot(dir.x, dir.y, dir.z);
      throwBall(game, { origin: CAMERA.position, dir: { x: dir.x / length, y: dir.y / length, z: dir.z / length } }, FROM);
      throwBall(game, { origin: CAMERA.position, dir: { x: -dir.x / length, y: dir.y / length, z: dir.z / length } }, FROM);
      stepRound(game, 1 / 60);
    }
    expect(game.balls.length).toBeLessThanOrEqual(14);
    expect(Number.isFinite(game.score)).toBe(true);
  });
});

describe('missing', () => {
  const up: Ray = { origin: CAMERA.position, dir: { x: 0, y: 0.6, z: -0.8 } };

  function miss(game: Round): RoundEvent[] {
    throwBall(game, up, FROM);
    stepRound(game, 1.2);
    return takeEvents(game);
  }

  it('asks for help after two in a row, until the next hit', () => {
    const game = round();
    stepRound(game, 1);
    miss(game);
    expect(needsHelp(game)).toBe(false);
    miss(game);
    expect(needsHelp(game)).toBe(true);
    const target = game.targets.find(isSolid);
    if (!target) throw new Error('no target');
    throwBall(game, rayAt(centerOf(target)), FROM);
    stepRound(game, 0.8);
    expect(needsHelp(game)).toBe(false);
  });

  it('pulls a throw in further while helping', () => {
    const offBy = (help: boolean): number | null => {
      const game = round({ level: 'hard', rng: seeded(4) });
      stepRound(game, 1.5);
      const target = game.targets.find((candidate) => isSolid(candidate) && candidate.motion !== 'sled');
      if (!target) throw new Error('no target');
      if (help) game.misses = 2;
      game.targets = [target];
      target.x = 0;
      const center = centerOf(target);
      const along = Math.hypot(center.x - CAMERA.position.x, center.y - CAMERA.position.y, center.z - CAMERA.position.z);
      const gap = (radiusOf(target) * 1.1 + 0.022 * along) * 1.2;
      return throwBall(game, rayAt(center, { x: gap, y: 0 }), FROM).targetId;
    };
    expect(offBy(false)).toBeNull();
    expect(offBy(true)).not.toBeNull();
  });

  it('gets a giggle from the nearest snowman, without a giggle for every throw', () => {
    const game = round();
    stepRound(game, 1.5);
    const first = miss(game).find((event) => event.type === 'miss');
    expect(first).toMatchObject({ teaser: { kind: 'snowman' } });
    throwBall(game, up, FROM);
    throwBall(game, up, FROM);
    stepRound(game, 1);
    const teasers = takeEvents(game).filter((event) => event.type === 'miss' && event.teaser);
    expect(teasers.length).toBeLessThanOrEqual(1);
    expect(game.score).toBe(0);
  });
});

describe('surprises', () => {
  it.each([0, 1])('always has a surprise when %i rounds came before', (played) => {
    for (let seed = 1; seed < 40; seed++) {
      const game = createRound({ scene: 'lake', level: 'easy', hats: ['topHat'], rng: seeded(seed), played });
      expect(game.surprises.length).toBeGreaterThan(0);
    }
  });

  it('waits for room rather than losing a surprise', () => {
    const game = createRound({ scene: 'village', level: 'easy', hats: ['topHat'], rng: seeded(1) });
    const { spots } = game;
    game.spots = [];
    game.surprises = [{ kind: 'golden', at: 0 }];
    stepRound(game, 2);
    expect(game.surprises).toHaveLength(1);
    game.spots = spots;
    stepRound(game, 1);
    expect(game.surprises).toHaveLength(0);
    expect(game.targets.some((target) => target.kind === 'golden')).toBe(true);
  });

  it('are rare enough to stay surprising later on', () => {
    let empty = 0;
    for (let seed = 1; seed < 200; seed++) {
      const game = createRound({ scene: 'lake', level: 'easy', hats: ['topHat'], rng: seeded(seed), played: 5 });
      if (game.surprises.length === 0) empty += 1;
    }
    expect(empty).toBeGreaterThan(30);
  });

  it('gives the golden snowman its crown and big points', () => {
    const game = createRound({ scene: 'village', level: 'easy', hats: ['topHat'], rng: seeded(1) });
    game.surprises = [{ kind: 'golden', at: 1 }];
    stepRound(game, 1.5);
    const golden = game.targets.find((target) => target.kind === 'golden');
    if (!golden) throw new Error('no golden snowman');
    expect(golden.hat).toBe('crown');
    throwBall(game, rayAt(centerOf(golden)), FROM);
    stepRound(game, 0.8);
    expect(game.score).toBe(GOLDEN_POINTS);
  });

  it('lets friends wave when hit, and nothing bad happens to them', () => {
    for (const kind of ['penguin', 'yeti'] as const) {
      const game = createRound({ scene: 'lake', level: 'easy', hats: ['topHat'], rng: seeded(3) });
      game.surprises = [{ kind, at: 1 }];
      stepRound(game, 1.8);
      const friend = game.targets.find((target) => target.kind === kind);
      if (!friend) throw new Error('no friend came');
      throwBall(game, rayAt(centerOf(friend)), FROM);
      stepRound(game, 0.9);
      expect(friend.waving).toBeGreaterThan(0);
      expect(friend.phase).not.toBe('splat');
      expect(takeEvents(game).some((event) => event.type === 'friend')).toBe(true);
      const once = game.score;
      throwBall(game, rayAt(centerOf(friend)), FROM);
      stepRound(game, 0.9);
      expect(game.score).toBe(once);
    }
  });
});

describe('snowballs at the screen', () => {
  it('never come on Easy', () => {
    const { events } = play('easy', 'village', 2, 0.5, 0.3);
    expect(events.some((event) => event.type === 'glass')).toBe(false);
  });

  it('come on Hard and cost nothing', () => {
    const game = round({ level: 'hard', rng: seeded(6) });
    let score = 0;
    let glass = 0;
    for (let i = 0; i < 60 * 40; i++) {
      stepRound(game, 1 / 60);
      for (const event of takeEvents(game)) {
        if (event.type === 'glass') glass += 1;
      }
      score = Math.max(score, game.score);
      expect(game.score).toBe(score);
    }
    expect(glass).toBeGreaterThan(2);
  });
});

describe('the hint', () => {
  it('points at a target that can be seen', () => {
    const game = round();
    stepRound(game, 2);
    expect(easiestTarget(game, () => true)).not.toBeNull();
    expect(easiestTarget(game, () => false)).toBeNull();
  });
});

describe('the menu demo', () => {
  it('goes on for ever', () => {
    const game = round({ demo: true });
    stepRound(game, 300);
    expect(game.phase).toBe('play');
    expect(game.targets.length).toBeGreaterThan(0);
    expect(game.surprises).toHaveLength(0);
  });
});

it('only uses real hats', () => {
  const { game } = play('easy', 'night', 8, 0.5, 0.2);
  for (const hat of game.hats) expect(HAT_IDS).toContain(hat);
});
