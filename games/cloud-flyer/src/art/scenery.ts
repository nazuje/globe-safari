import {
  CanvasTexture,
  Color,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  RepeatWrapping,
  type Scene,
} from 'three';
import { makeRandom, pathAt, type Course, type Point } from '../course.ts';
import type { World } from '../worlds.ts';
import { paintedMaterial, Pile, SHAPES } from './build.ts';

const CHUNK = 260;
const BUILD_AHEAD = 520;
const KEEP_BEHIND = 60;
/** Nothing fixed sits nearer than this to the middle of the road, so scenery can't be flown into. */
const CLEAR_ROAD = 24;

export interface Scenery {
  reset(world: World, course: Course): void;
  /** Builds at most one new piece of sky per frame, so a long flight never stalls. */
  update(s: number, seconds: number): void;
}

interface Chunk {
  index: number;
  meshes: Mesh[];
}

interface Build {
  solid: Pile;
  glow: Pile;
  water: Falls;
  random: () => number;
  world: World;
}

/** Waterfalls, as ribbons with stripes that slide, so they really do flow. */
class Falls {
  private positions: number[] = [];
  private uvs: number[] = [];
  private colors: number[] = [];

  add(x: number, top: number, z: number, width: number, height: number, turn: number, hex: number): void {
    const dx = Math.cos(turn) * width;
    const dz = Math.sin(turn) * width;
    const bottom = top - height;
    const ends = [
      [x - dx, top, z - dz, 0, 0],
      [x + dx, top, z + dz, 1, 0],
      [x + dx, bottom, z + dz, 1, height / 12],
      [x - dx, top, z - dz, 0, 0],
      [x + dx, bottom, z + dz, 1, height / 12],
      [x - dx, bottom, z - dz, 0, height / 12],
    ] as const;
    const color = new Color(hex);
    for (const [a, b, c, u, v] of ends) {
      this.positions.push(a, b, c);
      this.uvs.push(u, v);
      this.colors.push(color.r, color.g, color.b);
    }
  }

  get empty(): boolean {
    return this.positions.length === 0;
  }

  finish(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(this.uvs), 2));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function waterStripes(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const paint = canvas.getContext('2d');
  if (paint) {
    paint.fillStyle = '#c8c8c8';
    paint.fillRect(0, 0, 32, 64);
    paint.fillStyle = '#ffffff';
    for (const [x, y, height] of [[3, 4, 22], [14, 30, 24], [24, 10, 18], [8, 44, 16], [20, 52, 8]] as const) {
      paint.fillRect(x, y, 4, height);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}

const pick = (list: readonly number[], random: () => number): number => list[Math.floor(random() * list.length)] ?? 0xffffff;

function cloud(build: Build, x: number, y: number, z: number, size: number): void {
  const { solid, random, world } = build;
  const puffs = 3 + Math.floor(random() * 2);
  for (let puff = 0; puff < puffs; puff += 1) {
    const across = (puff - (puffs - 1) / 2) * size * 0.95;
    const big = size * (0.75 + random() * 0.4) * (puff === 0 || puff === puffs - 1 ? 0.8 : 1.1);
    solid.add(SHAPES.blob, { x: x + across, y: y + random() * size * 0.25, z: z + (random() - 0.5) * size, sx: big * 1.1, sy: big * 0.72, sz: big }, world.cloud);
  }
}

function tree(build: Build, x: number, y: number, z: number, size: number): void {
  const { solid, random, world } = build;
  const leaf = pick(world.leaf, random);
  if (world.decor === 'lollipops') {
    solid.add(SHAPES.drum, { x, y: y + size * 0.9, z, sx: size * 0.1, sy: size * 1.8 }, 0xffffff);
    solid.add(SHAPES.blob, { x, y: y + size * 2, z, sx: size * 0.75, sy: size * 0.75, sz: size * 0.28 }, leaf);
    return;
  }
  if (world.decor === 'palms') {
    solid.add(SHAPES.drum, { x, y: y + size, z, sx: size * 0.14, sy: size * 2 }, world.trunk);
    for (let frond = 0; frond < 3; frond += 1) {
      solid.add(SHAPES.cone, { x, y: y + size * 2.1, z, sx: size * 1.1, sy: size * 0.3, sz: size * 0.3, turn: (frond * Math.PI) / 3 }, leaf);
    }
    return;
  }
  if (world.decor === 'pines') {
    solid.add(SHAPES.drum, { x, y: y + size * 0.3, z, sx: size * 0.16, sy: size * 0.7 }, world.trunk);
    solid.add(SHAPES.cone, { x, y: y + size * 1.1, z, sx: size * 0.75, sy: size * 1.2 }, leaf);
    solid.add(SHAPES.cone, { x, y: y + size * 1.8, z, sx: size * 0.52, sy: size }, world.peaks ? 0xf4faff : leaf);
    return;
  }
  solid.add(SHAPES.drum, { x, y: y + size * 0.4, z, sx: size * 0.16, sy: size * 0.9 }, world.trunk);
  solid.add(SHAPES.blob, { x, y: y + size * 1.3, z, sx: size * 0.8, sy: size * 0.9 }, leaf);
}

function house(build: Build, x: number, y: number, z: number, size: number): void {
  const { solid, glow, random, world } = build;
  const turn = random() * Math.PI;
  solid.add(SHAPES.box, { x, y: y + size * 0.5, z, sx: size, sy: size, sz: size * 1.2, turn }, pick(world.walls, random));
  solid.add(SHAPES.cone, { x, y: y + size * 1.4, z, sx: size * 0.95, sy: size * 0.8, turn }, pick(world.roofs, random));
  const lit = world.windowsGlow ? 0xffe27a : 0x5a7ea8;
  const windows = world.windowsGlow ? glow : solid;
  windows.add(SHAPES.box, { x: x + Math.cos(turn) * size * 0.52, y: y + size * 0.55, z: z - Math.sin(turn) * size * 0.52, sx: size * 0.08, sy: size * 0.32, sz: size * 0.32, turn }, lit);
}

function island(build: Build, x: number, y: number, z: number, radius: number): void {
  const { solid, water, random, world } = build;
  const grass = pick(world.grass, random);
  const depth = radius * (0.9 + random() * 0.6);
  solid.add(SHAPES.plate, { x, y, z, sx: radius, sy: radius * 0.16, turn: random() * 6 }, grass, 0.05);
  solid.add(SHAPES.keel, { x, y: y - radius * 0.08 - depth / 2, z, sx: radius * 0.96, sy: depth, turn: random() * 6 }, pick(world.rock, random), 0.12);
  if (world.peaks && radius > 12) {
    const peak = radius * (1 + random() * 0.5);
    solid.add(SHAPES.cone, { x, y: y + peak * 0.45, z, sx: radius * 0.65, sy: peak }, pick(world.rock, random), 0.06);
    solid.add(SHAPES.cone, { x, y: y + peak * 0.76, z, sx: radius * 0.31, sy: peak * 0.48 }, 0xffffff, 0.05);
  } else if (random() < 0.6) {
    const hill = radius * 0.5;
    solid.add(SHAPES.blob, { x: x + radius * 0.3 * (random() - 0.5), y: y + hill * 0.08, z: z + radius * 0.4 * (random() - 0.5), sx: hill * 1.3, sy: hill * 0.7, sz: hill }, pick(world.grass, random), 0.06);
  }
  const trees = Math.floor(radius / 3);
  for (let count = 0; count < trees; count += 1) {
    const angle = random() * Math.PI * 2;
    const spread = radius * (0.45 + random() * 0.42);
    tree(build, x + Math.cos(angle) * spread, y + radius * 0.07, z + Math.sin(angle) * spread, 1 + random() * 1.1);
  }
  if (radius > 9 && !world.peaks) {
    const houses = 2 + Math.floor(random() * 3);
    const angle = random() * Math.PI * 2;
    for (let count = 0; count < houses; count += 1) {
      const turn = angle + count * 0.55;
      house(build, x + Math.cos(turn) * radius * 0.42, y + radius * 0.07, z + Math.sin(turn) * radius * 0.42, 1.2 + random() * 0.6);
    }
  }
  if (random() < 0.55) {
    // Falls on the side facing the road, where a child can see them.
    const side = x > 0 ? -1 : 1;
    const fallX = x + side * radius * 0.86;
    const height = depth * (0.8 + random() * 0.7);
    water.add(fallX, y + radius * 0.06, z + radius * 0.25, radius * 0.16, height, 1.2 * side, world.water);
    water.add(fallX, y + radius * 0.06, z - radius * 0.25, radius * 0.12, height * 0.75, -1.2 * side, world.water);
    solid.add(SHAPES.blob, { x: fallX, y: y + radius * 0.06 - height, z, sx: radius * 0.3, sy: radius * 0.14 }, world.cloud);
  }
}

function fillChunk(build: Build, course: Course, index: number): void {
  const { random } = build;
  const { level, length } = course;
  const point: Point = { x: 0, y: 0, z: 0 };
  const start = index * CHUNK;

  const road = (s: number, out: Point): Point => pathAt(level, length, Math.max(s, 0), out);

  // Near islands on each side: the ones a child sees sweep past.
  for (let count = 0; count < 5; count += 1) {
    const s = start + random() * CHUNK;
    const side = count % 2 === 0 ? 1 : -1;
    const radius = 7 + random() * 11;
    road(s, point);
    island(build, point.x + side * (CLEAR_ROAD + radius + random() * 34), point.y - 16 - random() * 26, -s, radius);
  }
  // Big faraway ones, seen across the fog.
  for (let count = 0; count < 2; count += 1) {
    const s = start + random() * CHUNK;
    const side = random() < 0.5 ? 1 : -1;
    road(s, point);
    island(build, point.x + side * (120 + random() * 70), point.y - 34 + random() * 22, -s, 26 + random() * 16);
  }
  // Clouds above, below and beside, never on the road itself.
  for (let count = 0; count < 9; count += 1) {
    const s = start + random() * CHUNK;
    const side = random() < 0.5 ? 1 : -1;
    road(s, point);
    const wide = CLEAR_ROAD + 6 + random() * 90;
    const height = -24 + random() * 58;
    cloud(build, point.x + side * wide, point.y + height, -s, 3 + random() * 5);
  }
  // A carpet of low clouds gives the flyer a sense of height.
  for (let count = 0; count < 5; count += 1) {
    const s = start + random() * CHUNK;
    road(s, point);
    cloud(build, point.x + (random() - 0.5) * 140, point.y - 44 - random() * 16, -s, 7 + random() * 7);
  }
}

export function createScenery(scene: Scene): Scenery {
  const holder = new Group();
  scene.add(holder);
  const solidMaterial = paintedMaterial();
  const glowMaterial = new MeshBasicMaterial({ vertexColors: true });
  const stripes = waterStripes();
  const waterMaterial = new MeshBasicMaterial({ vertexColors: true, map: stripes, side: 2 });
  let chunks: Chunk[] = [];
  let world: World | null = null;
  let course: Course | null = null;
  let nextIndex = 0;

  function drop(chunk: Chunk): void {
    for (const mesh of chunk.meshes) {
      mesh.geometry.dispose();
      holder.remove(mesh);
    }
  }

  function buildNext(): void {
    if (!world || !course) return;
    const random = makeRandom(course.seed * 31 + nextIndex * 977 + 5);
    const build: Build = { solid: new Pile(random), glow: new Pile(random), water: new Falls(), random, world };
    fillChunk(build, course, nextIndex);
    const meshes: Mesh[] = [new Mesh(build.solid.finish(), solidMaterial)];
    if (!build.glow.empty) meshes.push(new Mesh(build.glow.finish(), glowMaterial));
    if (!build.water.empty) meshes.push(new Mesh(build.water.finish(), waterMaterial));
    holder.add(...meshes);
    chunks.push({ index: nextIndex, meshes });
    nextIndex += 1;
  }

  return {
    reset(nextWorld, nextCourse) {
      for (const chunk of chunks) drop(chunk);
      chunks = [];
      world = nextWorld;
      course = nextCourse;
      nextIndex = -1;
      // The first stretch is built straight away, so the sky is never empty at take-off.
      while (nextIndex * CHUNK < BUILD_AHEAD * 0.6) buildNext();
    },
    update(s, seconds) {
      stripes.offset.y += seconds * 0.9;
      const finished = chunks.filter((chunk) => (chunk.index + 1) * CHUNK < s - KEEP_BEHIND);
      for (const chunk of finished) drop(chunk);
      if (finished.length > 0) chunks = chunks.filter((chunk) => !finished.includes(chunk));
      if (course && nextIndex * CHUNK < s + BUILD_AHEAD && nextIndex * CHUNK < course.length + CHUNK * 2) buildNext();
    },
  };
}
