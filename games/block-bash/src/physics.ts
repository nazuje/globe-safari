import { Body, Box, ContactMaterial, LockConstraint, Material, Plane, Quaternion, RaycastResult, Sphere, Vec3, World } from 'cannon-es';
import { launchVelocity, type Point } from './aim.ts';
import { BALL_IDS, BALLS, type Ball, type BallId } from './balls.ts';
import type { BlockKind, BlockSpec, Level } from './levels.ts';
import { hasFallen, isDown } from './scoring.ts';

export const GRAVITY = 19;
export const LAWN_Y = -4.5;

const TABLE_THICKNESS = 0.8;
const SOLVER_ROUNDS = 30;
const SLEEP_SPEED = 0.22;
const SLEEP_AFTER_S = 0.5;
const FASTEST_BODY = 34;
const QUIET_IMPACT = 0.9;
const CALM_SPEED = 0.5;
/** A flying ball wakes the structure from this far away, before it actually touches. */
const WAKE_REACH = 1.8;
const POP_BY_BALL = 2;
const POP_BY_BLOCK = 7;
const POP_REACH = 3.4;
const POP_SHOVE = 11;
const POP_CHAIN_DELAY_S = 0.1;
const MOST_STUCK = 4;
const SLIME_LETS_GO_S = 2.2;

const BLOCK_DRAG = 0.02;
const LOWER_PART = 0.5;
const LOWER_WEIGHT = 4;
const WAVE_HEIGHT = 7;
const WAVE_GAP = 0.04;
const WAVE_DRAG = 0.95;
const WAVE_COLUMN_X = 1.4;
const BALL_SWEEP = 9;

const BLOCK_GROUP = 2;
const BALL_GROUP = 4;
const FLOOR_GROUP = 1;

export type WorldEvent =
  | { type: 'clack'; index: number; speed: number; size: number; jelly: boolean; byBall: BallId | null; at: Point }
  | { type: 'floorThud'; ball: BallId; speed: number; at: Point }
  | { type: 'down'; index: number }
  | { type: 'pop'; index: number; at: Point }
  | { type: 'stuck'; index: number };

interface Thrown {
  ball: Ball;
  body: Body;
  stuck: LockConstraint[];
  stuckAt: number;
}

export interface BlockBody {
  body: Body;
  spec: BlockSpec;
  /** Burst, so it's out of the world until a wave brings it back. */
  gone: boolean;
  /** Knocked off, knocked over or shoved aside. */
  down: boolean;
  /** Falling in with a wave. It can't score until it has landed. */
  dropping: boolean;
  home: Vec3;
  homeUpright: number;
}

export interface ThrownView {
  ball: Ball;
  position: Point;
  quaternion: { x: number; y: number; z: number; w: number };
}

export interface BlockWorld {
  blocks: BlockBody[];
  step(seconds: number): void;
  drainEvents(): WorldEvent[];
  throwBall(id: BallId, from: Point, to: Point, power: number, size?: number): void;
  balls(): ThrownView[];
  /** Where a ray first touches a block, or null. */
  firstBlockOnRay(origin: Point, direction: Point): Point | null;
  standingPoints(): Point[];
  wakeAll(): void;
  /** How many blocks are knocked down and free to come back. */
  spareBlocks(): number;
  /** Lifts knocked-down blocks back into the sky to fall as a new pile. Returns how many. */
  dropWave(count: number): number;
  /** Lets the blocks of a wave start scoring from where they landed. */
  settleWave(): void;
  calm(): boolean;
  /** How many blocks are moving fast right now. */
  movingFast(speed: number): number;
}

function makeMaterials() {
  const wood = new Material('wood');
  const jelly = new Material('jelly');
  const table = new Material('table');
  const lawn = new Material('lawn');
  const balls = Object.fromEntries(BALL_IDS.map((id) => [id, new Material(id)])) as Record<BallId, Material>;
  return { wood, jelly, table, lawn, balls };
}

type Materials = ReturnType<typeof makeMaterials>;

function pairUp(world: World, { wood, jelly, table, lawn, balls }: Materials): void {
  const stiff = { contactEquationStiffness: 3e7, contactEquationRelaxation: 3 };
  const pair = (a: Material, b: Material, friction: number, restitution: number): void => {
    world.addContactMaterial(new ContactMaterial(a, b, { friction, restitution, ...stiff }));
  };
  pair(wood, wood, 0.62, 0.08);
  pair(wood, table, 0.4, 0.1);
  pair(wood, lawn, 0.8, 0.06);
  pair(jelly, wood, 0.5, 0.75);
  pair(jelly, jelly, 0.5, 0.75);
  pair(jelly, table, 0.5, 0.75);
  pair(jelly, lawn, 0.6, 0.6);
  for (const id of BALL_IDS) {
    const { bounce } = BALLS[id];
    pair(balls[id], wood, 0.4, bounce);
    pair(balls[id], jelly, 0.4, Math.max(bounce, 0.6));
    pair(balls[id], table, 0.4, bounce);
    pair(balls[id], lawn, 0.7, bounce * 0.7);
    for (const other of BALL_IDS) pair(balls[id], balls[other], 0.3, 0.5);
  }
}

function addFloors(world: World, half: number, materials: Materials): void {
  const table = new Body({
    type: Body.STATIC,
    shape: new Box(new Vec3(half, TABLE_THICKNESS / 2, half)),
    position: new Vec3(0, -TABLE_THICKNESS / 2, 0),
    material: materials.table,
    collisionFilterGroup: FLOOR_GROUP,
  });
  const lawn = new Body({
    type: Body.STATIC,
    shape: new Plane(),
    position: new Vec3(0, LAWN_Y, 0),
    material: materials.lawn,
    collisionFilterGroup: FLOOR_GROUP,
  });
  lawn.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(table);
  world.addBody(lawn);
}

/** The lower part of a structure is heavier, so one ball can't take the lot and later balls still have work to do. */
const heaviness = (spec: BlockSpec, height: number): number => (spec.y < height * LOWER_PART ? LOWER_WEIGHT : 1);

function blockBody(spec: BlockSpec, weighted: boolean, height: number, materials: Materials): Body {
  const body = new Body({
    mass: spec.w * spec.h * spec.d * (weighted ? heaviness(spec, height) : 1),
    shape: new Box(new Vec3(spec.w / 2, spec.h / 2, spec.d / 2)),
    position: new Vec3(spec.x, spec.y, spec.z),
    material: spec.kind === 'jelly' ? materials.jelly : materials.wood,
    linearDamping: BLOCK_DRAG,
    angularDamping: 0.04,
    sleepSpeedLimit: SLEEP_SPEED,
    sleepTimeLimit: SLEEP_AFTER_S,
    collisionFilterGroup: BLOCK_GROUP,
    collisionFilterMask: FLOOR_GROUP | BLOCK_GROUP | BALL_GROUP,
  });
  if (spec.turn !== 0) body.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), spec.turn);
  // Everything starts asleep, so a structure can't shift or fall until a ball arrives.
  body.sleep();
  return body;
}

const footprint = ({ spec }: BlockBody): number => spec.w * spec.d;
const toPoint = (v: Vec3): Point => ({ x: v.x, y: v.y, z: v.z });
const vec = (p: Point): Vec3 => new Vec3(p.x, p.y, p.z);
const speedOf = (body: Body): number => body.velocity.length();
/** How much of a body's own up points at the sky: 1 upright, 0 on its side. */
const uprightness = ({ quaternion: { x, z } }: Body): number => Math.abs(1 - 2 * (x * x + z * z));

function limitSpeed(body: Body): void {
  const speed = speedOf(body);
  if (speed > FASTEST_BODY) body.velocity.scale(FASTEST_BODY / speed, body.velocity);
}

/** A level's blocks and balls as physics. It knows nothing about drawing or sound; it reports what happened. */
export function createWorld(level: Level, half: number): BlockWorld {
  const world = new World({ gravity: new Vec3(0, -GRAVITY, 0), allowSleep: true });
  const solver = world.solver as World['solver'] & { iterations: number; tolerance: number };
  solver.iterations = SOLVER_ROUNDS;
  solver.tolerance = 0.0001;
  const materials = makeMaterials();
  pairUp(world, materials);
  addFloors(world, half, materials);

  const height = Math.max(...level.blocks.map((spec) => spec.y + spec.h / 2));
  const blocks: BlockBody[] = [];
  const thrown: Thrown[] = [];
  const events: WorldEvent[] = [];
  const blockOf = new Map<Body, number>();
  const ballOf = new Map<Body, Thrown>();
  const popQueue: { index: number; at: number }[] = [];
  const stickQueue: { thrown: Thrown; index: number }[] = [];
  let clock = 0;

  function queuePop(index: number, delay: number): void {
    const block = blocks[index];
    if (!block || block.gone || block.dropping || block.spec.kind !== 'pop' || popQueue.some((pop) => pop.index === index)) return;
    popQueue.push({ index, at: clock + delay });
  }

  function hitBlock(index: number, other: Body, speed: number): void {
    const block = blocks[index];
    if (!block) return;
    const ball = ballOf.get(other);
    const blockHit = blockOf.get(other);
    // Both bodies hear a block-on-block hit. Keep just one of them.
    if (blockHit !== undefined && blockHit < index) return;
    if (ball?.ball.sticky && ball.stuck.length < MOST_STUCK && block.spec.kind !== 'pop') {
      stickQueue.push({ thrown: ball, index });
    }
    if (speed >= (ball ? POP_BY_BALL : POP_BY_BLOCK)) queuePop(index, 0);
    if (speed < QUIET_IMPACT) return;
    const { w, h, d, kind } = block.spec;
    events.push({
      type: 'clack',
      index,
      speed,
      size: w * h * d,
      jelly: isJelly(kind),
      byBall: ball?.ball.id ?? null,
      at: toPoint(block.body.position),
    });
  }

  level.blocks.forEach((spec, index) => {
    // A low, wide structure is hard enough to shift already, so only tall ones get heavy feet.
    const body = blockBody(spec, !level.sturdy, height, materials);
    blocks.push({ body, spec, gone: false, down: false, dropping: false, home: body.position.clone(), homeUpright: 1 });
    blockOf.set(body, index);
    body.addEventListener('collide', (event: { body: Body; contact: { getImpactVelocityAlongNormal(): number } }) => {
      hitBlock(index, event.body, Math.abs(event.contact.getImpactVelocityAlongNormal()));
    });
    world.addBody(body);
  });

  function wakeAll(): void {
    for (const { body, gone } of blocks) if (!gone) body.wakeUp();
  }

  function wakeWhenBallIsClose(): void {
    for (const { body, ball } of thrown) {
      if (body.sleepState === Body.SLEEPING) continue;
      const reach = WAKE_REACH + ball.radius;
      const close = blocks.some(
        (block) =>
          !block.gone &&
          block.body.sleepState === Body.SLEEPING &&
          block.body.position.distanceTo(body.position) < reach + Math.max(block.spec.w, block.spec.d, block.spec.h) / 2,
      );
      if (close) {
        wakeAll();
        return;
      }
    }
  }

  function burst(index: number): void {
    const block = blocks[index];
    if (!block || block.gone) return;
    block.gone = true;
    const at = block.body.position;
    events.push({ type: 'pop', index, at: toPoint(at) });
    world.removeBody(block.body);
    if (!block.down) {
      block.down = true;
      events.push({ type: 'down', index });
    }
    wakeAll();
    blocks.forEach((other, otherIndex) => {
      if (other.gone) return;
      const away = other.body.position.vsub(at);
      const distance = away.length();
      if (distance > POP_REACH) return;
      const strength = (POP_SHOVE * (1 - distance / POP_REACH) * other.body.mass) / Math.max(distance, 0.5);
      other.body.applyImpulse(new Vec3(away.x * strength, (Math.abs(away.y) + 0.6) * strength, away.z * strength));
      queuePop(otherIndex, POP_CHAIN_DELAY_S);
    });
  }

  function runPops(): void {
    for (let i = popQueue.length - 1; i >= 0; i -= 1) {
      const pop = popQueue[i];
      if (pop && pop.at <= clock) {
        popQueue.splice(i, 1);
        burst(pop.index);
      }
    }
  }

  function runSticks(): void {
    for (const { thrown: slime, index } of stickQueue.splice(0)) {
      const block = blocks[index];
      if (!block || block.gone || slime.stuck.length >= MOST_STUCK) continue;
      const lock = new LockConstraint(slime.body, block.body, { maxForce: 4000 });
      lock.collideConnected = false;
      world.addConstraint(lock);
      slime.stuck.push(lock);
      slime.stuckAt = clock;
      slime.body.linearDamping = 0.25;
      events.push({ type: 'stuck', index });
    }
  }

  function releaseSlime(): void {
    for (const slime of thrown) {
      if (slime.stuck.length === 0 || clock - slime.stuckAt < SLIME_LETS_GO_S) continue;
      for (const lock of slime.stuck.splice(0)) world.removeConstraint(lock);
      slime.ball = { ...slime.ball, sticky: false };
    }
  }

  function floatBalls(): void {
    for (const { body, ball } of thrown) {
      if (ball.float > 0 && body.sleepState !== Body.SLEEPING) body.force.y += body.mass * GRAVITY * ball.float;
    }
  }

  function slowBallsOnLawn(): void {
    for (const { body } of thrown) if (hasFallen(body.position.y)) body.linearDamping = 0.35;
  }

  function watchBlocks(): void {
    blocks.forEach((block, index) => {
      if (block.down || block.gone) return;
      const { body } = block;
      if (block.dropping) {
        if (hasFallen(body.position.y)) block.down = true;
        return;
      }
      if (body.sleepState === Body.SLEEPING) return;
      const moved = body.position.distanceTo(block.home);
      if (!isDown({ moved, tipped: Math.abs(uprightness(body) - block.homeUpright), height: body.position.y })) return;
      block.down = true;
      events.push({ type: 'down', index });
    });
  }

  /** Stands a block in the sky above a column, so a wave lands as new towers and not a scatter. */
  function dropBlock(block: BlockBody, x: number, bottom: number, turned: boolean): void {
    const { body, spec } = block;
    body.position.set(x, WAVE_HEIGHT + bottom + spec.h / 2, 0);
    body.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), turned ? Math.PI / 2 : 0);
    body.velocity.setZero();
    body.angularVelocity.setZero();
    body.linearDamping = WAVE_DRAG;
    // The heavy feet of the old structure don't belong in a pile that's meant to fly.
    body.mass = spec.w * spec.h * spec.d;
    body.updateMassProperties();
    block.dropping = true;
    block.down = false;
    if (block.gone) {
      block.gone = false;
      world.addBody(body);
    }
    body.wakeUp();
  }

  /** Old balls roll out of the way, so a new pile has somewhere flat to land. */
  function clearBallsFromTable(): void {
    for (const { body } of thrown) {
      if (hasFallen(body.position.y)) continue;
      const out = Math.atan2(body.position.z, body.position.x);
      body.wakeUp();
      body.velocity.set(Math.cos(out) * BALL_SWEEP, 1, Math.sin(out) * BALL_SWEEP);
    }
  }

  function dropColumns(spare: BlockBody[], columnX: readonly number[]): void {
    const tops = columnX.map(() => 0);
    [...spare]
      .sort((a, b) => footprint(b) - footprint(a))
      .forEach((block, index) => {
        const column = index % columnX.length;
        const bottom = tops[column] ?? 0;
        dropBlock(block, columnX[column] ?? 0, bottom, index % 2 === 1);
        tops[column] = bottom + block.spec.h + WAVE_GAP;
      });
  }

  return {
    blocks,
    step(seconds) {
      clock += seconds;
      wakeWhenBallIsClose();
      floatBalls();
      world.step(seconds);
      for (const { body, gone } of blocks) if (!gone && body.sleepState !== Body.SLEEPING) limitSpeed(body);
      runSticks();
      runPops();
      releaseSlime();
      slowBallsOnLawn();
      watchBlocks();
    },
    drainEvents: () => events.splice(0),
    throwBall(id, from, to, power, size = 1) {
      const base = BALLS[id];
      const ball = { ...base, radius: base.radius * size, mass: base.mass * size * size };
      const body = new Body({
        mass: ball.mass,
        shape: new Sphere(ball.radius),
        position: vec(from),
        material: materials.balls[id],
        linearDamping: 0.01,
        angularDamping: 0.3,
        sleepSpeedLimit: SLEEP_SPEED,
        sleepTimeLimit: SLEEP_AFTER_S,
        collisionFilterGroup: BALL_GROUP,
        collisionFilterMask: FLOOR_GROUP | BLOCK_GROUP | BALL_GROUP,
      });
      const distance = vec(to).distanceTo(body.position);
      const seconds = distance / (ball.speed * power);
      const velocity = launchVelocity(from, to, seconds, GRAVITY * (1 - ball.float));
      body.velocity.set(velocity.x, velocity.y, velocity.z);
      body.angularVelocity.set(6, 2, -4);
      const entry: Thrown = { ball, body, stuck: [], stuckAt: 0 };
      thrown.push(entry);
      ballOf.set(body, entry);
      let lastThud = -1;
      body.addEventListener('collide', (event: { body: Body; contact: { getImpactVelocityAlongNormal(): number } }) => {
        if (blockOf.has(event.body) || ballOf.has(event.body) || clock - lastThud < 0.08) return;
        const speed = Math.abs(event.contact.getImpactVelocityAlongNormal());
        if (speed < QUIET_IMPACT) return;
        lastThud = clock;
        events.push({ type: 'floorThud', ball: id, speed, at: toPoint(body.position) });
      });
      world.addBody(body);
    },
    balls: () =>
      thrown.map(({ ball, body }) => ({
        ball,
        position: body.position,
        quaternion: body.quaternion as Quaternion,
      })),
    firstBlockOnRay(origin, direction) {
      const from = vec(origin);
      const to = from.vadd(vec(direction).scale(200));
      const result = new RaycastResult();
      world.raycastClosest(from, to, { collisionFilterMask: BLOCK_GROUP, skipBackfaces: true }, result);
      return result.hasHit ? toPoint(result.hitPointWorld) : null;
    },
    standingPoints: () =>
      blocks.filter((block) => !block.gone && !block.down).map((block) => toPoint(block.body.position)),
    wakeAll,
    spareBlocks: () => blocks.filter((block) => block.gone || block.down).length,
    dropWave(count) {
      for (const slime of thrown) for (const lock of slime.stuck.splice(0)) world.removeConstraint(lock);
      // Rubble on the table goes first, which clears the landing and leaves the lawn looking wrecked.
      const onTable = (block: BlockBody): boolean => !block.gone && !hasFallen(block.body.position.y);
      const spare = blocks
        .filter((block) => block.gone || block.down)
        .sort((a, b) => Number(onTable(b)) - Number(onTable(a)) || Number(b.gone) - Number(a.gone))
        .slice(0, count);
      clearBallsFromTable();
      dropColumns(spare, [-WAVE_COLUMN_X, WAVE_COLUMN_X]);
      wakeAll();
      return spare.length;
    },
    settleWave() {
      for (const block of blocks) {
        if (!block.dropping || block.gone) continue;
        block.dropping = false;
        block.body.linearDamping = BLOCK_DRAG;
        if (block.down) continue;
        block.home.copy(block.body.position);
        block.homeUpright = uprightness(block.body);
      }
    },
    calm() {
      const quiet = (body: Body): boolean => body.sleepState === Body.SLEEPING || speedOf(body) < CALM_SPEED;
      // A ball rolling away across the lawn is scenery by then, so nothing waits for it.
      const done = (body: Body): boolean => hasFallen(body.position.y) || quiet(body);
      return blocks.every((block) => block.gone || quiet(block.body)) && thrown.every(({ body }) => done(body));
    },
    movingFast(speed) {
      return blocks.filter((block) => !block.gone && speedOf(block.body) > speed).length;
    },
  };
}

const isJelly = (kind: BlockKind): boolean => kind === 'jelly';
