import type { Box, Vec3 } from './aim.ts';

export const SCENE_IDS = ['village', 'lake', 'night'] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export type Band = 'near' | 'mid' | 'far';
export type Motion = 'rise' | 'slide' | 'waddle' | 'sled' | 'window';

/** Where a snowman can appear, and how it gets there. */
export interface Spot {
  id: string;
  motion: Motion;
  band: Band;
  x: number;
  y: number;
  z: number;
  /** The other end of a sled run or a waddle. */
  x1: number;
  /** Which way out of cover a sliding snowman moves. */
  side: number;
}

export interface Wall {
  x: number;
  z: number;
  halfWidth: number;
  height: number;
  kind: 'brick' | 'bank' | 'hedge';
}

export interface House {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: number;
  roof: number;
}

export interface Tree {
  x: number;
  z: number;
  size: number;
}

export interface Lantern {
  x: number;
  z: number;
}

export interface Layout {
  walls: readonly Wall[];
  houses: readonly House[];
  /** Trees close enough to hide behind and to stop a snowball. */
  trees: readonly Tree[];
  lanterns: readonly Lantern[];
  /** Sled runs: depth and half-length. */
  runs: readonly { z: number; reach: number; band: Band }[];
  /** Waddle paths. */
  paths: readonly { x: number; x1: number; z: number; band: Band }[];
  /** Where the yeti waves from. */
  yeti: Vec3;
  /** Lake scenes draw the ice, centred here. */
  lake: { x: number; z: number; width: number; depth: number } | null;
}

export const CAMERA = { position: { x: 0, y: 4.6, z: 10 }, lookAt: { x: 0, y: 1.1, z: -8 } };

/** On a tall phone the view climbs and looks down, so the village fills the screen instead of a strip of it. */
const TALL_CAMERA = { position: { x: 0, y: 8, z: 7 }, lookAt: { x: 0, y: -0.7, z: -8 } };
const WIDE_FROM = 1.2;
const TALLEST = 0.46;

const between = (from: Vec3, to: Vec3, share: number): Vec3 => ({
  x: from.x + (to.x - from.x) * share,
  y: from.y + (to.y - from.y) * share,
  z: from.z + (to.z - from.z) * share,
});

/** Where the camera stands for a screen shape. Anything wider than a tablet gets the plain first-person view. */
export function cameraFor(aspect: number): { position: Vec3; lookAt: Vec3 } {
  const share = Math.min(Math.max((WIDE_FROM - aspect) / (WIDE_FROM - TALLEST), 0), 1);
  return {
    position: between(CAMERA.position, TALL_CAMERA.position, share),
    lookAt: between(CAMERA.lookAt, TALL_CAMERA.lookAt, share),
  };
}

/** Nothing flies further back than this: the hills start here. */
export const BACK_Z = -34;

const TREE_REACH = 2.4;
const HOUSE_WINDOW_Y = 2.1;

const VILLAGE: Layout = {
  walls: [
    { x: -3.1, z: 2.4, halfWidth: 1.8, height: 1.5, kind: 'brick' },
    { x: 3.1, z: 2.4, halfWidth: 1.8, height: 1.5, kind: 'brick' },
    { x: 0, z: -4.5, halfWidth: 2.2, height: 1.5, kind: 'brick' },
    { x: -13, z: -19, halfWidth: 3, height: 1.3, kind: 'hedge' },
    { x: 13, z: -19, halfWidth: 3, height: 1.3, kind: 'hedge' },
  ],
  houses: [
    { x: -9.5, z: -11, width: 7, height: 4, depth: 5, color: 0xff8f6b, roof: 0xc2483f },
    { x: 0.5, z: -13, width: 6.5, height: 4.6, depth: 5, color: 0xffd36e, roof: 0x4c8fd6 },
    { x: 10, z: -11, width: 7, height: 4, depth: 5, color: 0x7fd8b4, roof: 0x8d5fd3 },
  ],
  trees: [
    { x: -6.6, z: -3, size: 1.5 },
    { x: 6.6, z: -3, size: 1.5 },
    { x: -16, z: -6, size: 1.7 },
    { x: 16, z: -6, size: 1.7 },
    { x: -6, z: -20, size: 1.5 },
    { x: 6, z: -20, size: 1.5 },
  ],
  lanterns: [
    { x: -4.6, z: -6.5 },
    { x: 4.6, z: -6.5 },
  ],
  runs: [
    { z: -1, reach: 15, band: 'near' },
    { z: -8, reach: 21, band: 'mid' },
    { z: -24, reach: 32, band: 'far' },
  ],
  paths: [
    { x: -4, x1: 4, z: 0.2, band: 'near' },
    { x: -6, x1: 6, z: -7, band: 'mid' },
    { x: -12, x1: 12, z: -22, band: 'far' },
  ],
  yeti: { x: 14, y: 0, z: -29 },
  lake: null,
};

const LAKE: Layout = {
  walls: [
    { x: -3.8, z: 3, halfWidth: 1.9, height: 1.3, kind: 'bank' },
    { x: 3.8, z: 3, halfWidth: 1.9, height: 1.3, kind: 'bank' },
    { x: -7.5, z: -5, halfWidth: 2.4, height: 1.4, kind: 'bank' },
    { x: 7.5, z: -5, halfWidth: 2.4, height: 1.4, kind: 'bank' },
    { x: 0, z: -12, halfWidth: 2.6, height: 1.4, kind: 'bank' },
    { x: -12, z: -21, halfWidth: 3, height: 1.4, kind: 'bank' },
    { x: 12, z: -21, halfWidth: 3, height: 1.4, kind: 'bank' },
  ],
  houses: [
    { x: -14, z: -14, width: 5, height: 3.4, depth: 4, color: 0xe46a6a, roof: 0x6a4a3a },
    { x: 14, z: -14, width: 5, height: 3.4, depth: 4, color: 0x5fb0e8, roof: 0x6a4a3a },
  ],
  trees: [
    { x: -6, z: -17, size: 1.6 },
    { x: 6, z: -17, size: 1.6 },
    { x: 0, z: -23, size: 1.8 },
    { x: -19, z: -3, size: 1.8 },
    { x: 19, z: -3, size: 1.8 },
  ],
  lanterns: [],
  runs: [
    { z: 0, reach: 16, band: 'near' },
    { z: -2.5, reach: 18, band: 'near' },
    { z: -8.5, reach: 22, band: 'mid' },
    { z: -15, reach: 26, band: 'mid' },
    { z: -25, reach: 34, band: 'far' },
  ],
  paths: [
    { x: -4.5, x1: 4.5, z: 0.8, band: 'near' },
    { x: -5, x1: 5, z: -8, band: 'mid' },
    { x: -9, x1: 9, z: -19, band: 'far' },
  ],
  yeti: { x: -13, y: 0, z: -29 },
  lake: { x: 0, z: -6, width: 26, depth: 15 },
};

const NIGHT: Layout = {
  walls: [
    { x: 0, z: 2.6, halfWidth: 2.2, height: 1.5, kind: 'hedge' },
    { x: -7, z: -3, halfWidth: 2.2, height: 1.5, kind: 'brick' },
    { x: 7, z: -3, halfWidth: 2.2, height: 1.5, kind: 'brick' },
    { x: 0, z: -19, halfWidth: 4, height: 1.3, kind: 'hedge' },
  ],
  houses: [
    { x: -12, z: -9, width: 6, height: 4, depth: 5, color: 0x8a7fd8, roof: 0x3d3a8c },
    { x: -3.6, z: -12, width: 6, height: 4.4, depth: 5, color: 0xd87f9c, roof: 0x7a3a6c },
    { x: 4.4, z: -12, width: 6, height: 4, depth: 5, color: 0x6fb6c9, roof: 0x2f5f7a },
    { x: 12.5, z: -9, width: 6, height: 4.2, depth: 5, color: 0xd8b36f, roof: 0x7a4a2f },
  ],
  trees: [
    { x: -3.9, z: -1, size: 1.3 },
    { x: 3.9, z: -1, size: 1.3 },
    { x: -9, z: -20, size: 1.6 },
    { x: 9, z: -20, size: 1.6 },
    { x: -17, z: -3, size: 1.7 },
    { x: 17, z: -3, size: 1.7 },
  ],
  lanterns: [
    { x: -5.5, z: 1 },
    { x: 5.5, z: 1 },
    { x: -2.2, z: -7 },
    { x: 2.2, z: -7 },
    { x: -9, z: -15.5 },
    { x: 9, z: -15.5 },
  ],
  runs: [
    { z: 0.4, reach: 15, band: 'near' },
    { z: -6, reach: 20, band: 'mid' },
    { z: -23, reach: 31, band: 'far' },
  ],
  paths: [
    { x: -3.6, x1: 3.6, z: 1, band: 'near' },
    { x: -5, x1: 5, z: -5, band: 'mid' },
    { x: -14, x1: 14, z: -24, band: 'far' },
  ],
  yeti: { x: 0, y: 0, z: -30 },
  lake: null,
};

export const LAYOUTS: Record<SceneId, Layout> = { village: VILLAGE, lake: LAKE, night: NIGHT };

function bandAt(z: number): Band {
  if (z > -3) return 'near';
  return z > -16 ? 'mid' : 'far';
}

/** The windows of a house, left and right of the door. */
export function windowsOf(house: House): Vec3[] {
  const y = HOUSE_WINDOW_Y;
  const z = house.z + house.depth / 2 + 0.3;
  return [
    { x: house.x - house.width * 0.28, y, z },
    { x: house.x + house.width * 0.28, y, z },
  ];
}

/** Every place a snowman can appear in a scene, worked out from what stands there. */
export function spotsOf(layout: Layout): Spot[] {
  const spots: Spot[] = [];
  const add = (spot: Omit<Spot, 'id'>): void => {
    spots.push({ ...spot, id: `${spot.motion}-${spots.length}` });
  };
  for (const wall of layout.walls) {
    const offsets = wall.halfWidth > 3 ? [-wall.halfWidth / 2, wall.halfWidth / 2] : [0];
    for (const offset of offsets) {
      const z = wall.z - 1.1;
      add({ motion: 'rise', band: bandAt(z), x: wall.x + offset, y: 0, z, x1: 0, side: 0 });
    }
  }
  for (const tree of layout.trees) {
    const z = tree.z - 0.6;
    for (const side of [-1, 1]) {
      add({ motion: 'slide', band: bandAt(z), x: tree.x + side * TREE_REACH, y: 0, z, x1: 0, side });
    }
  }
  for (const house of layout.houses) {
    for (const spot of windowsOf(house)) {
      add({ motion: 'window', band: bandAt(spot.z), ...spot, x1: 0, side: 0 });
    }
  }
  for (const run of layout.runs) {
    add({ motion: 'sled', band: run.band, x: -run.reach, y: 0, z: run.z, x1: run.reach, side: 0 });
  }
  for (const path of layout.paths) {
    add({ motion: 'waddle', band: path.band, x: path.x, y: 0, z: path.z, x1: path.x1, side: 0 });
  }
  return spots;
}

/** Everything solid that a snowball stops at. */
export function boxesOf(layout: Layout): Box[] {
  const boxes: Box[] = [];
  for (const wall of layout.walls) {
    boxes.push({
      x0: wall.x - wall.halfWidth,
      x1: wall.x + wall.halfWidth,
      y0: 0,
      y1: wall.height,
      z0: wall.z - 0.5,
      z1: wall.z + 0.5,
    });
  }
  for (const house of layout.houses) {
    boxes.push({
      x0: house.x - house.width / 2,
      x1: house.x + house.width / 2,
      y0: 0,
      y1: house.height + 1.6,
      z0: house.z - house.depth / 2,
      z1: house.z + house.depth / 2,
    });
  }
  for (const tree of layout.trees) {
    const half = 0.9 * tree.size;
    boxes.push({ x0: tree.x - half, x1: tree.x + half, y0: 0, y1: 3.4 * tree.size, z0: tree.z - half, z1: tree.z + half });
  }
  return boxes;
}
