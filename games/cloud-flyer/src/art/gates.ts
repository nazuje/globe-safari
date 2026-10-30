import {
  Color,
  ExtrudeGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Shape,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Scene,
} from 'three';
import { makeRandom, pathAt, type BumpKind, type Course, type Point } from '../course.ts';
import { CLOUD_TOP, ringNow, type Flight } from '../flight.ts';
import type { World } from '../worlds.ts';
import { paintedMaterial, Pile, SHAPES } from './build.ts';

const SEE_AHEAD = 380;
const BEHIND = 14;
const POP_SECONDS = 0.35;
const RING_SLOTS = 16;
const STAR_SLOTS = 36;
const ARCH_SLOTS = 4;
const BUMP_SLOTS = 8;
const RAINBOW = [0xff5a6e, 0xff9f43, 0xffd93c, 0x3ecf8e, 0x4cb8ff, 0xa77bff];
const RAINBOW_COLORS = RAINBOW.map((hex) => new Color(hex));
const WHITE = new Color(0xffffff);
const mixed = new Color();

export interface Gates {
  reset(course: Course, world: World, calm: boolean): void;
  update(flight: Flight, time: number, seconds: number): void;
  ringTaken(index: number): void;
  ringMissed(index: number): void;
  starTaken(index: number): void;
  bumped(kind: BumpKind | 'arch', index: number): void;
  /** Where a thing on the road sits in the world, for sparkles. */
  ringAt(index: number): Spot | undefined;
}

export interface Spot {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

interface Placed<T> {
  item: T;
  spot: Spot;
  taken: number;
  /** Seconds since this ring was missed: it wiggles at the flyer as it goes by. */
  missed: number;
}

const placer = new Object3D();
const moved: Spot = { x: 0, y: 0, z: 0, yaw: 0 };

function starGeometry(): BufferGeometry {
  const shape = new Shape();
  for (let point = 0; point < 10; point += 1) {
    const reach = point % 2 === 0 ? 1 : 0.46;
    const angle = (point * Math.PI) / 5 + Math.PI / 2;
    if (point === 0) shape.moveTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
    else shape.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
  }
  return new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }).translate(0, 0, -0.15);
}

function archPile(): BufferGeometry {
  const pile = new Pile(makeRandom(11));
  // Built to a half width of 1 and a top at 1: each arch stretches it to size.
  const blocks = 13;
  for (let block = 0; block <= blocks; block += 1) {
    const angle = (block / blocks) * Math.PI;
    pile.add(SHAPES.box, { x: Math.cos(angle), y: Math.sin(angle), z: 0, sx: 0.2, sy: 0.2, sz: 0.2, turn: 0 }, RAINBOW[block % RAINBOW.length] ?? 0xffffff);
  }
  for (const side of [-1, 1]) {
    pile.add(SHAPES.drum, { x: side, y: -0.75, z: 0, sx: 0.13, sy: 1.7, sz: 0.13 }, 0xe8dcc8);
    pile.add(SHAPES.blob, { x: side, y: -1.7, z: 0, sx: 0.5, sy: 0.32, sz: 0.5 }, 0x63d45f, 0.06);
    pile.add(SHAPES.keel, { x: side, y: -2.15, z: 0, sx: 0.46, sy: 0.75, sz: 0.46 }, 0xb0845c, 0.1);
  }
  return pile.finish();
}

function smile(pile: Pile, size: number, z: number, y: number): void {
  for (const side of [-1, 1]) {
    pile.add(SHAPES.blob, { x: side * size * 0.3, y: y + size * 0.1, z, sx: size * 0.13 }, 0x2b2140);
    pile.add(SHAPES.blob, { x: side * size * 0.27, y: y + size * 0.15, z: z - size * 0.09, sx: size * 0.045 }, 0xffffff);
    pile.add(SHAPES.blob, { x: side * size * 0.52, y: y - size * 0.1, z, sx: size * 0.1, sy: size * 0.06, sz: size * 0.05 }, 0xffa8b8);
  }
  for (let dot = -2; dot <= 2; dot += 1) {
    pile.add(SHAPES.blob, { x: dot * size * 0.07, y: y - size * 0.14 + Math.abs(dot) * size * 0.03, z, sx: size * 0.05 }, 0x2b2140);
  }
}

function faceCloud(hex: number): BufferGeometry {
  const pile = new Pile(makeRandom(21));
  for (const [x, y, size] of [[0, 0.05, 1.05], [-0.85, -0.1, 0.72], [0.85, -0.1, 0.72], [0.35, 0.5, 0.65], [-0.4, 0.45, 0.6]] as const) {
    pile.add(SHAPES.blob, { x, y, z: 0, sx: size * 1.1, sy: size * 0.9, sz: size }, hex);
  }
  smile(pile, 1, -0.98, 0.1);
  return pile.finish();
}

function rockIsland(): BufferGeometry {
  const pile = new Pile(makeRandom(31));
  pile.add(SHAPES.keel, { x: 0, y: -0.55, z: 0, sx: 1.05, sy: 1.5 }, 0xc79a6b, 0.14);
  pile.add(SHAPES.plate, { x: 0, y: 0.25, z: 0, sx: 1.12, sy: 0.3 }, 0x63d45f, 0.05);
  pile.add(SHAPES.cone, { x: 0.35, y: 0.9, z: 0.2, sx: 0.36, sy: 0.9 }, 0x2fae62);
  pile.add(SHAPES.blob, { x: -0.5, y: 0.6, z: 0.15, sx: 0.3 }, 0x46c76b);
  smile(pile, 0.8, -1.02, -0.2);
  return pile.finish();
}

function landingCloud(hex: number): BufferGeometry {
  const pile = new Pile(makeRandom(41));
  for (let puff = 0; puff < 12; puff += 1) {
    const angle = (puff / 12) * Math.PI * 2;
      pile.add(SHAPES.blob, { x: Math.cos(angle) * 12, y: -4.2 + Math.sin(puff * 2.1) * 0.5, z: Math.sin(angle) * 12, sx: 6, sy: 3.4, sz: 6 }, hex);
  }
  pile.add(SHAPES.blob, { x: 0, y: -3.3, z: 0, sx: 13, sy: 3.4, sz: 13 }, hex);
  smile(pile, 9, -17.5, -3.6);
  // Rainbow bunting along the far side, so the goal can be seen from a long way off.
  for (let flag = 0; flag <= 8; flag += 1) {
    const angle = (flag / 8) * Math.PI + Math.PI;
    const x = Math.cos(angle) * 17;
    const z = Math.sin(angle) * 17;
    pile.add(SHAPES.drum, { x, y: 2, z, sx: 0.16, sy: 7 }, 0xffffff);
    pile.add(SHAPES.blob, { x, y: 5.6, z, sx: 0.9 }, RAINBOW[flag % RAINBOW.length] ?? 0xffffff);
  }
  return pile.finish();
}

function instanced(geometry: BufferGeometry, material: Material, count: number, scene: Scene): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  return mesh;
}

const seen = <T>(list: Placed<T>[], from: number, s: number, each: (entry: Placed<T>, index: number) => void): number => {
  let first = from;
  while ((list[first]?.spot.z ?? -Infinity) > -(s - BEHIND)) first += 1;
  for (let index = first; index < list.length; index += 1) {
    const entry = list[index];
    if (!entry || -entry.spot.z > s + SEE_AHEAD) break;
    each(entry, index);
  }
  return first;
};

export function createGates(scene: Scene): Gates {
  const ringShape = new TorusGeometry(1, 0.13, 6, 26);
  const haloShape = new TorusGeometry(1, 0.27, 5, 26);
  const rings = instanced(ringShape, new MeshBasicMaterial({ color: 0xffffff }), RING_SLOTS, scene);
  const halos = instanced(
    haloShape,
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34, depthWrite: false, fog: false }),
    RING_SLOTS,
    scene,
  );
  rings.setColorAt(0, WHITE);
  halos.setColorAt(0, WHITE);
  const stars = instanced(
    starGeometry(),
    new MeshLambertMaterial({ color: 0xffd23c, emissive: 0xc88a00, emissiveIntensity: 0.9, flatShading: true }),
    STAR_SLOTS,
    scene,
  );
  const painted = paintedMaterial();
  const arches = instanced(archPile(), painted, ARCH_SLOTS, scene);
  const rocks = instanced(rockIsland(), painted, BUMP_SLOTS, scene);
  let puffs: InstancedMesh | null = null;
  let goal: Mesh | null = null;

  let ringList: Placed<Course['rings'][number]>[] = [];
  let starList: Placed<Course['stars'][number]>[] = [];
  let archList: Placed<Course['arches'][number]>[] = [];
  let bumpList: Placed<Course['bumps'][number]>[] = [];
  let firstRing = 0;
  let firstStar = 0;
  let firstArch = 0;
  let firstBump = 0;
  let goalScale = 1;
  let calm = false;

  function place<T extends { s: number; u: number; v: number }>(course: Course, list: T[], ground = false): Placed<T>[] {
    const point: Point = { x: 0, y: 0, z: 0 };
    return list.map((item) => {
      pathAt(course.level, course.length, item.s, point);
      const x = point.x + item.u;
      const y = point.y + (ground ? 0 : item.v);
      const z = point.z;
      pathAt(course.level, course.length, item.s + 2, point);
      const nextX = point.x;
      pathAt(course.level, course.length, item.s - 2, point);
      return { item, spot: { x, y, z, yaw: -Math.atan2(nextX - point.x, 4) }, taken: 0, missed: 0 };
    });
  }

  function put(mesh: InstancedMesh, slot: number, spot: Spot, sx: number, sy: number, sz: number, roll = 0, yaw = spot.yaw): void {
    placer.position.set(spot.x, spot.y, spot.z);
    placer.rotation.set(0, yaw, roll);
    placer.scale.set(sx, sy, sz);
    placer.updateMatrix();
    mesh.setMatrixAt(slot, placer.matrix);
  }

  function updateRings(flight: Flight, time: number, seconds: number): void {
    let slot = 0;
    firstRing = seen(ringList, firstRing, flight.s, (entry, index) => {
      if (slot >= RING_SLOTS) return;
      if (entry.taken > 0) entry.taken += seconds;
      if (entry.taken > POP_SECONDS) return;
      if (entry.missed > 0) entry.missed += seconds;
      const isNext = index === flight.nextRing;
      const now = ringNow(flight, entry.item);
      const beat = calm ? 0 : Math.sin(time * 7) * 0.07;
      const pop = entry.taken > 0 ? 1 + (entry.taken / POP_SECONDS) * 0.9 : 1;
      const size = now.radius * (isNext ? 1 + beat : 1) * pop;
      const wiggle = entry.missed > 0 && !calm ? Math.sin(entry.missed * 26) * 0.24 * Math.exp(-entry.missed * 3) : 0;
      moved.x = entry.spot.x + now.u - entry.item.u;
      moved.y = entry.spot.y + now.v - entry.item.v;
      moved.z = entry.spot.z;
      moved.yaw = entry.spot.yaw;
      put(rings, slot, moved, size * (1 + wiggle), size * (1 - wiggle), size);
      put(halos, slot, moved, size * (1 + wiggle), size * (1 - wiggle), size);
      const base = RAINBOW_COLORS[index % RAINBOW_COLORS.length] ?? WHITE;
      mixed.copy(base).lerp(WHITE, entry.taken > 0 ? 0.8 : isNext ? 0.3 : 0.05);
      rings.setColorAt(slot, mixed);
      halos.setColorAt(slot, base);
      slot += 1;
    });
    rings.count = slot;
    halos.count = slot;
    rings.instanceMatrix.needsUpdate = true;
    halos.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    if (halos.instanceColor) halos.instanceColor.needsUpdate = true;
  }

  function updateStars(flight: Flight, time: number): void {
    let slot = 0;
    firstStar = seen(starList, firstStar, flight.s, (entry) => {
      if (slot >= STAR_SLOTS || entry.taken > 0) return;
      put(stars, slot, entry.spot, 0.95, 0.95, 0.95, 0, calm ? entry.spot.yaw : time * 3 + entry.spot.z * 0.1);
      slot += 1;
    });
    stars.count = slot;
    stars.instanceMatrix.needsUpdate = true;
  }

  function updateArches(flight: Flight): void {
    let slot = 0;
    firstArch = seen(archList, firstArch, flight.s, (entry) => {
      if (slot >= ARCH_SLOTS) return;
      const { halfWidth, top } = entry.item;
      const wobble = entry.taken > 0 ? Math.sin(entry.taken * 30) * 0.03 * Math.exp(-entry.taken * 3) : 0;
      if (entry.taken > 0) entry.taken += 1 / 60;
      put(arches, slot, entry.spot, halfWidth, top, halfWidth, wobble);
      slot += 1;
    });
    arches.count = slot;
    arches.instanceMatrix.needsUpdate = true;
  }

  function updateBumps(flight: Flight, time: number, seconds: number): void {
    let cloudSlot = 0;
    let rockSlot = 0;
    firstBump = seen(bumpList, firstBump, flight.s, (entry, index) => {
      const bob = calm ? 0 : Math.sin(time * 1.6 + index) * 0.08;
      if (entry.taken > 0) entry.taken += seconds;
      // A bumped friend jiggles like jelly.
      const jiggle = entry.taken > 0 ? Math.sin(entry.taken * 20) * 0.3 * Math.exp(-entry.taken * 3) : 0;
      const r = entry.item.radius * 0.92;
      if (entry.item.kind === 'cloud' && puffs && cloudSlot < BUMP_SLOTS) {
        put(puffs, cloudSlot, entry.spot, r * (1 + jiggle), r * (1 - jiggle + bob), r, jiggle * 0.5);
        cloudSlot += 1;
      } else if (rockSlot < BUMP_SLOTS) {
        put(rocks, rockSlot, entry.spot, r * (1 + jiggle), r * (1 - jiggle + bob), r, jiggle * 0.5);
        rockSlot += 1;
      }
    });
    if (puffs) {
      puffs.count = cloudSlot;
      puffs.instanceMatrix.needsUpdate = true;
    }
    rocks.count = rockSlot;
    rocks.instanceMatrix.needsUpdate = true;
  }

  return {
    reset(course, world, nextCalm) {
      calm = nextCalm;
      ringList = place(course, course.rings);
      starList = place(course, course.stars);
      archList = place(course, course.arches.map((arch) => ({ ...arch, v: 0 })));
      bumpList = place(course, course.bumps);
      firstRing = 0;
      firstStar = 0;
      firstArch = 0;
      firstBump = 0;
      if (puffs) {
        scene.remove(puffs);
        puffs.geometry.dispose();
        puffs.dispose();
      }
      puffs = instanced(faceCloud(world.cloud), painted, BUMP_SLOTS, scene);
      if (goal) {
        scene.remove(goal);
        goal.geometry.dispose();
      }
      goal = new Mesh(landingCloud(world.cloud), painted);
      const point = pathAt(course.level, course.length, course.length, { x: 0, y: 0, z: 0 });
      goal.position.set(point.x, point.y + CLOUD_TOP, point.z);
      goal.frustumCulled = false;
      scene.add(goal);
      goalScale = 1;
    },
    update(flight, time, seconds) {
      updateRings(flight, time, seconds);
      updateStars(flight, time);
      updateArches(flight);
      updateBumps(flight, time, seconds);
      goal?.scale.set(goalScale * (1 + flight.squash * 0.1), goalScale * (1 - flight.squash * 0.3), goalScale * (1 + flight.squash * 0.1));
    },
    ringTaken(index) {
      const ring = ringList[index];
      if (ring) ring.taken = 0.001;
    },
    ringMissed(index) {
      const ring = ringList[index];
      if (ring) ring.missed = 0.001;
    },
    starTaken(index) {
      const star = starList[index];
      if (star) star.taken = 0.001;
    },
    bumped(kind, index) {
      const entry = kind === 'arch' ? archList[index] : bumpList[index];
      if (entry) entry.taken = 0.001;
    },
    ringAt: (index) => ringList[index]?.spot,
  };
}

