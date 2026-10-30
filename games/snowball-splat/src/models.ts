import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { HatId } from './hats.ts';

export const SNOW = 0xffffff;
const COAL = 0x2b2a3a;
const STICK = 0x7a5233;
const CARROT = 0xff8a2b;
const SCARVES = [0xff5d5d, 0x3fb6ff, 0x52d273, 0xb26cff];

/** Hats sit this far above a snowman's feet. */
export const HAT_Y = 2.14;
export const CARROT_Y = 1.78;
export const CARROT_Z = 0.46;
export const TONGUE_Y = 1.5;
export const TONGUE_Z = 0.5;

/** Every toy in the world shares one flat-shaded material, coloured by its vertices. */
export const toyMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true });

export interface Place {
  x?: number;
  y?: number;
  z?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

/** Moves and colours a shape, ready to merge with others. */
export function part(shape: BufferGeometry, color: number, place: Place = {}): BufferGeometry {
  const { x = 0, y = 0, z = 0, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0 } = place;
  const plain = shape.index ? shape.toNonIndexed() : shape;
  plain.deleteAttribute('uv');
  plain.applyMatrix4(
    new Matrix4().compose(
      new Vector3(x, y, z),
      new Quaternion().setFromEuler(new Euler(rx, ry, rz)),
      new Vector3(sx, sy, sz),
    ),
  );
  const tint = new Color(color);
  const count = plain.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([tint.r, tint.g, tint.b], i * 3);
  plain.setAttribute('color', new BufferAttribute(colors, 3));
  plain.computeVertexNormals();
  return plain;
}

export const ball = (radius: number, detail = 1): BufferGeometry => new IcosahedronGeometry(radius, detail);
export const box = (width: number, height: number, depth: number): BufferGeometry => new BoxGeometry(width, height, depth);
export const tube = (top: number, bottom: number, height: number, sides = 8): BufferGeometry =>
  new CylinderGeometry(top, bottom, height, sides);
export const cone = (radius: number, height: number, sides = 8): BufferGeometry => new ConeGeometry(radius, height, sides);
const ring = (radius: number, thickness: number, sides = 10): BufferGeometry =>
  new TorusGeometry(radius, thickness, 5, sides);

export function merged(parts: BufferGeometry[]): BufferGeometry {
  const whole = mergeGeometries(parts);
  if (!whole) throw new Error('Toy parts did not fit together');
  for (const piece of parts) piece.dispose();
  return whole;
}

function face(): BufferGeometry[] {
  const y = 1.84;
  const smile = [-0.2, -0.1, 0, 0.1, 0.2].map((x) =>
    part(ball(0.04, 0), COAL, { x, y: 1.6 - (0.2 - Math.abs(x)) * 0.4 * 0.6, z: 0.47 - Math.abs(x) * 0.2 }),
  );
  return [
    part(ball(0.075, 0), COAL, { x: -0.19, y, z: 0.45 }),
    part(ball(0.075, 0), COAL, { x: 0.19, y, z: 0.45 }),
    ...smile,
  ];
}

const head = (): BufferGeometry => part(ball(0.56, 1), SNOW, { y: 1.75 });

function snowmanBody(scarf: number): BufferGeometry {
  return merged([
    part(ball(0.82, 1), SNOW, { y: 0.72 }),
    head(),
    ...face(),
    part(tube(0.5, 0.56, 0.2, 10), scarf, { y: 1.3 }),
    part(box(0.2, 0.46, 0.1), scarf, { x: 0.24, y: 1.08, z: 0.52, rz: 0.15 }),
    part(ball(0.07, 0), COAL, { y: 0.95, z: 0.76 }),
    part(ball(0.07, 0), COAL, { y: 0.66, z: 0.82 }),
    part(tube(0.035, 0.05, 0.95, 5), STICK, { x: -0.95, y: 1.22, rz: 1 }),
    part(tube(0.035, 0.05, 0.95, 5), STICK, { x: 0.95, y: 1.22, rz: -1 }),
    part(tube(0.025, 0.03, 0.26, 4), STICK, { x: -1.3, y: 1.55, rz: 0.1 }),
    part(tube(0.025, 0.03, 0.26, 4), STICK, { x: 1.3, y: 1.55, rz: -0.1 }),
  ]);
}

function headOnly(scarf: number): BufferGeometry {
  return merged([head(), ...face(), part(tube(0.42, 0.5, 0.14, 10), scarf, { y: 1.26 })]);
}

function carrot(): BufferGeometry {
  return part(cone(0.13, 0.72, 6), CARROT, { z: 0.36, rx: Math.PI / 2 });
}

function tongue(): BufferGeometry {
  return merged([
    part(box(0.24, 0.05, 0.34), 0xff7f9e, { z: 0.15, rx: 0.5 }),
    part(ball(0.12, 1), 0xff7f9e, { y: -0.13, z: 0.3, sy: 0.4 }),
  ]);
}

function sled(): BufferGeometry {
  return merged([
    part(box(1.9, 0.12, 2.4), 0xe2554a, { y: 0.34 }),
    part(box(1.9, 0.12, 0.5), 0xe2554a, { y: 0.5, z: 1.35, rx: -0.7 }),
    part(box(0.12, 0.34, 0.12), 0x7a5233, { x: -0.7, y: 0.17, z: 0.7 }),
    part(box(0.12, 0.34, 0.12), 0x7a5233, { x: 0.7, y: 0.17, z: 0.7 }),
    part(box(0.12, 0.34, 0.12), 0x7a5233, { x: -0.7, y: 0.17, z: -0.7 }),
    part(box(0.12, 0.34, 0.12), 0x7a5233, { x: 0.7, y: 0.17, z: -0.7 }),
    part(box(0.14, 0.08, 2.9), 0xffd34d, { x: -0.7, y: 0.03 }),
    part(box(0.14, 0.08, 2.9), 0xffd34d, { x: 0.7, y: 0.03 }),
  ]);
}

function penguinBody(): BufferGeometry {
  return merged([
    part(ball(0.75, 1), 0x2f3550, { y: 1.15, sy: 1.25 }),
    part(ball(0.62, 1), 0xfdfdff, { y: 1, z: 0.26, sy: 1.15 }),
    part(ball(0.48, 1), 0x2f3550, { y: 2.05 }),
    part(ball(0.34, 1), 0xfdfdff, { y: 2, z: 0.24 }),
    part(ball(0.07, 0), COAL, { x: -0.15, y: 2.14, z: 0.46 }),
    part(ball(0.07, 0), COAL, { x: 0.15, y: 2.14, z: 0.46 }),
    part(cone(0.13, 0.3, 5), 0xffa62b, { y: 1.98, z: 0.58, rx: Math.PI / 2 }),
    part(tube(0.46, 0.52, 0.16, 10), 0x3fb6ff, { y: 1.6 }),
    part(ball(0.2, 0), 0xffa62b, { x: -0.3, y: 0.5, z: 0.52, sy: 0.5 }),
    part(ball(0.2, 0), 0xffa62b, { x: 0.3, y: 0.5, z: 0.52, sy: 0.5 }),
  ]);
}

/** A flipper, with its shoulder at the origin, so waving is a simple turn. */
function flipper(): BufferGeometry {
  return part(ball(0.3, 1), 0x2f3550, { y: -0.42, sx: 0.5, sy: 1.5, sz: 0.5 });
}

function yetiBody(): BufferGeometry {
  const fur = 0xcfeaff;
  const dark = 0x9cc9ee;
  const tufts = [
    [-0.7, 1.9],
    [0.7, 1.9],
    [-0.85, 1.1],
    [0.85, 1.1],
    [0, 3.15],
  ].map(([x, y]) => part(cone(0.32, 0.6, 5), dark, { x, y, ry: x }));
  return merged([
    part(ball(1.1, 1), fur, { y: 1.45, sy: 1.25 }),
    part(ball(0.8, 1), 0x7fa8e0, { y: 1.95, z: 0.5, sx: 0.95, sy: 0.72, sz: 0.6 }),
    part(ball(0.13, 0), SNOW, { x: -0.3, y: 2.15, z: 0.98 }),
    part(ball(0.13, 0), SNOW, { x: 0.3, y: 2.15, z: 0.98 }),
    part(ball(0.07, 0), COAL, { x: -0.3, y: 2.15, z: 1.08 }),
    part(ball(0.07, 0), COAL, { x: 0.3, y: 2.15, z: 1.08 }),
    part(box(0.7, 0.2, 0.2), 0xff8fa3, { y: 1.72, z: 0.98 }),
    part(box(0.18, 0.18, 0.1), SNOW, { x: -0.18, y: 1.66, z: 1.08 }),
    part(box(0.18, 0.18, 0.1), SNOW, { x: 0.18, y: 1.66, z: 1.08 }),
    part(ball(0.42, 1), fur, { x: -0.55, y: 0.2, z: 0.3, sy: 0.6 }),
    part(ball(0.42, 1), fur, { x: 0.55, y: 0.2, z: 0.3, sy: 0.6 }),
    ...tufts,
  ]);
}

/** An arm hanging from the shoulder at the origin. */
function yetiArm(): BufferGeometry {
  return merged([
    part(ball(0.34, 1), 0xcfeaff, { y: -0.6, sy: 2.1, sx: 0.85, sz: 0.85 }),
    part(ball(0.32, 1), 0x9cc9ee, { y: -1.2 }),
  ]);
}

function wedge(color: number, count: number, radius: number, y: number): BufferGeometry[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return part(cone(radius * 0.32, radius * 0.7, 5), color, {
      x: Math.sin(angle) * radius,
      y,
      z: Math.cos(angle) * radius,
    });
  });
}

const HAT_MAKERS: Record<HatId, () => BufferGeometry[]> = {
  topHat: () => [
    part(tube(0.72, 0.72, 0.07, 12), COAL, { y: 0.04 }),
    part(tube(0.42, 0.44, 0.75, 12), COAL, { y: 0.44 }),
    part(tube(0.45, 0.46, 0.16, 12), 0xff5d5d, { y: 0.16 }),
  ],
  bobble: () => [
    part(ball(0.56, 1), 0x52c2ff, { y: 0.14, sy: 0.8 }),
    part(tube(0.58, 0.58, 0.2, 12), 0xffd34d, { y: 0.04 }),
    part(tube(0.46, 0.52, 0.09, 12), SNOW, { y: 0.34 }),
    part(ball(0.22, 1), 0xff6b9a, { y: 0.66 }),
  ],
  party: () => [
    part(cone(0.46, 0.95, 10), 0xc06bff, { y: 0.48 }),
    part(tube(0.25, 0.31, 0.12, 10), 0xffd34d, { y: 0.5 }),
    part(tube(0.38, 0.43, 0.1, 10), 0x4fd6a4, { y: 0.16 }),
    part(ball(0.13, 1), 0xff6b6b, { y: 1 }),
  ],
  bucket: () => [
    part(tube(0.62, 0.42, 0.72, 10), 0x9db4c9, { y: 0.36 }),
    part(tube(0.64, 0.64, 0.06, 10), 0x7f97ad, { y: 0.68 }),
    part(ring(0.6, 0.025, 12), 0x5e7488, { y: 0.16, rx: 0, rz: 1.1 }),
  ],
  flowerPot: () => [
    part(tube(0.42, 0.56, 0.6, 8), 0xd9743f, { y: 0.3 }),
    part(tube(0.52, 0.52, 0.14, 8), 0xc26233, { y: 0.06 }),
    part(tube(0.04, 0.04, 0.44, 5), 0x46b35f, { y: 0.8 }),
    part(ball(0.13, 0), 0xffd34d, { y: 1.05 }),
    ...[0, 1, 2, 3, 4].map((index) => {
      const angle = (index / 5) * Math.PI * 2;
      return part(ball(0.13, 0), 0xff7fb0, { x: Math.sin(angle) * 0.2, y: 1.05 + Math.cos(angle) * 0.2 });
    }),
  ],
  cowboy: () => [
    part(ball(0.92, 1), 0xb97a3f, { y: 0.06, sy: 0.1, sx: 1.06 }),
    part(ball(0.48, 1), 0xb97a3f, { y: 0.34, sy: 0.72 }),
    part(tube(0.47, 0.5, 0.12, 10), 0xff5d5d, { y: 0.17 }),
  ],
  chef: () => [
    part(tube(0.42, 0.44, 0.34, 10), SNOW, { y: 0.17 }),
    part(ball(0.52, 1), SNOW, { y: 0.6, sy: 0.75 }),
    part(ball(0.28, 1), SNOW, { x: 0.3, y: 0.7 }),
    part(ball(0.28, 1), SNOW, { x: -0.3, y: 0.7 }),
    part(ball(0.28, 1), SNOW, { y: 0.8, z: 0.28 }),
  ],
  viking: () => [
    part(ball(0.56, 1), 0xa8b4c4, { y: 0.1, sy: 0.85 }),
    part(tube(0.58, 0.58, 0.12, 12), 0xd9a441, { y: 0.06 }),
    part(tube(0.08, 0.08, 0.5, 5), 0xd9a441, { y: 0.3, z: 0.52 }),
    part(cone(0.15, 0.62, 6), 0xfff2cc, { x: -0.66, y: 0.42, rz: 0.75 }),
    part(cone(0.15, 0.62, 6), 0xfff2cc, { x: 0.66, y: 0.42, rz: -0.75 }),
  ],
  unicorn: () => [
    part(tube(0.56, 0.56, 0.16, 12), 0xff9ed1, { y: 0.1 }),
    part(cone(0.16, 0.92, 8), 0xffe066, { y: 0.56, z: 0.3, rx: 0.3 }),
    part(tube(0.17, 0.19, 0.06, 8), 0x7fe0ff, { y: 0.4, z: 0.25, rx: 0.3 }),
    part(tube(0.1, 0.12, 0.06, 8), 0xc06bff, { y: 0.66, z: 0.33, rx: 0.3 }),
    part(cone(0.13, 0.32, 5), 0xff9ed1, { x: -0.42, y: 0.32, rz: 0.3 }),
    part(cone(0.13, 0.32, 5), 0xff9ed1, { x: 0.42, y: 0.32, rz: -0.3 }),
  ],
  propeller: () => [
    part(ball(0.56, 1), 0xff5d5d, { y: 0.12, sy: 0.72 }),
    part(tube(0.58, 0.58, 0.1, 12), 0x3fb6ff, { y: 0.04 }),
    part(box(0.26, 0.04, 0.14), 0xffd34d, { z: 0.62, y: 0.04 }),
    part(tube(0.04, 0.04, 0.26, 5), 0x7a5233, { y: 0.58 }),
    part(box(1.1, 0.04, 0.16), 0xffd34d, { y: 0.72, ry: 0.5 }),
    part(ball(0.06, 0), 0xff5d5d, { y: 0.74 }),
  ],
  dino: () => [
    part(ball(0.58, 1), 0x52d273, { y: 0.1, sy: 0.82 }),
    part(tube(0.59, 0.59, 0.12, 12), 0x35a356, { y: 0.04 }),
    ...[-0.45, -0.15, 0.15, 0.45].map((z) =>
      part(cone(0.16, 0.34, 4), 0xffa62b, { y: 0.56 - Math.abs(z) * 0.4, z, rx: z * 0.8 }),
    ),
  ],
  cake: () => [
    part(tube(0.56, 0.6, 0.3, 12), 0xffc9dd, { y: 0.15 }),
    part(tube(0.44, 0.46, 0.26, 12), 0xfff2cc, { y: 0.42 }),
    part(tube(0.45, 0.45, 0.05, 12), SNOW, { y: 0.56 }),
    ...wedge(0xff6b6b, 6, 0.5, 0.33),
    part(tube(0.04, 0.04, 0.26, 5), 0x52c2ff, { y: 0.7 }),
    part(ball(0.06, 0), 0xffb12b, { y: 0.88 }),
  ],
  crown: () => [
    part(tube(0.5, 0.46, 0.3, 10), 0xffc933, { y: 0.15 }),
    ...wedge(0xffc933, 6, 0.42, 0.42),
    part(ball(0.1, 0), 0x3fb6ff, { y: 0.16, z: 0.48 }),
    part(ball(0.1, 0), 0xff5d7a, { x: 0.46, y: 0.16 }),
    part(ball(0.1, 0), 0x52d273, { x: -0.46, y: 0.16 }),
  ],
};

const hats = new Map<HatId, BufferGeometry>();

/** A hat, built the first time it's needed, with its brim at the origin. */
export function hatShape(hat: HatId): BufferGeometry {
  let shape = hats.get(hat);
  if (!shape) {
    shape = merged(HAT_MAKERS[hat]());
    hats.set(hat, shape);
  }
  return shape;
}

export const shapes = {
  bodies: SCARVES.map(snowmanBody),
  heads: SCARVES.map(headOnly),
  carrot: carrot(),
  tongue: tongue(),
  sled: sled(),
  penguin: penguinBody(),
  flipper: flipper(),
  yeti: yetiBody(),
  yetiArm: yetiArm(),
};
