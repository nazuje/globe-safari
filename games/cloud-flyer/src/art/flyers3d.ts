import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import type { FlyerId } from '../flyers.ts';

export interface FlyerModel {
  group: Group;
  /** Moves the moving parts. `power` is how hard it is working, from 0 to 1. */
  animate(time: number, power: number): void;
}

const GEO = {
  ball: new IcosahedronGeometry(1, 2),
  blob: new IcosahedronGeometry(1, 1),
  box: new BoxGeometry(1, 1, 1),
  cone: new ConeGeometry(1, 1, 8),
  tube: new CylinderGeometry(1, 1, 1, 8),
  ring: new TorusGeometry(1, 0.2, 6, 14),
};

const paints = new Map<number, MeshLambertMaterial>();

function paint(hex: number): MeshLambertMaterial {
  const known = paints.get(hex);
  if (known) return known;
  const made = new MeshLambertMaterial({ color: hex, flatShading: true, side: DoubleSide });
  paints.set(hex, made);
  return made;
}

const flame = new MeshBasicMaterial({ color: 0xffb23c });
const flameCore = new MeshBasicMaterial({ color: 0xfff2a0 });

type Xyz = readonly [number, number, number];

function part(parent: Group, geometry: BufferGeometry, material: Material, at: Xyz, size: Xyz | number, tilt: Xyz = [0, 0, 0]): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(...at);
  if (typeof size === 'number') mesh.scale.setScalar(size);
  else mesh.scale.set(...size);
  mesh.rotation.set(...tilt);
  parent.add(mesh);
  return mesh;
}

function pivot(parent: Group, at: Xyz): Group {
  const group = new Group();
  group.position.set(...at);
  parent.add(group);
  return group;
}

function eyes(parent: Group, x: number, y: number, z: number, size: number): void {
  for (const side of [-1, 1]) {
    part(parent, GEO.ball, paint(0xffffff), [side * x, y, z], size);
    part(parent, GEO.ball, paint(0x2b2140), [side * x, y, z - size * 0.6], size * 0.55);
  }
}

/** A flat wing from its root out along +x, which `side` mirrors. Flapping turns the pivot. */
function wing(parent: Group, at: Xyz, side: number, length: number, width: number, hex: number, tipHex = hex): Group {
  const root = pivot(parent, at);
  part(root, GEO.blob, paint(hex), [side * length * 0.32, 0, 0], [length * 0.36, 0.06, width * 0.5]);
  part(root, GEO.blob, paint(tipHex), [side * length * 0.72, 0, 0.1 * width], [length * 0.3, 0.05, width * 0.36]);
  return root;
}

function flap(left: Group, right: Group, angle: number): void {
  left.rotation.z = -angle;
  right.rotation.z = angle;
}

function plane(): FlyerModel {
  const group = new Group();
  part(group, GEO.ball, paint(0xff5a5a), [0, 0, 0], [0.72, 0.72, 1.6]);
  part(group, GEO.ball, paint(0xffffff), [0, -0.14, 0], [0.58, 0.58, 1.5]);
  part(group, GEO.cone, paint(0xff5a5a), [0, 0.05, 1.8], [0.42, 1.3, 0.42], [Math.PI / 2, 0, 0]);
  part(group, GEO.tube, paint(0xffc93c), [0, 0, -1.72], [0.24, 0.26, 0.24], [Math.PI / 2, 0, 0]);
  part(group, GEO.box, paint(0xffc93c), [0, -0.05, -0.15], [4.6, 0.12, 0.95]);
  part(group, GEO.box, paint(0xff5a5a), [2.1, -0.05, -0.15], [0.5, 0.14, 0.97]);
  part(group, GEO.box, paint(0xff5a5a), [-2.1, -0.05, -0.15], [0.5, 0.14, 0.97]);
  part(group, GEO.box, paint(0xffc93c), [0, 0.15, 2.1], [1.7, 0.08, 0.55]);
  part(group, GEO.box, paint(0xff5a5a), [0, 0.6, 2.2], [0.1, 0.85, 0.65]);
  part(group, GEO.ball, paint(0xbfe6ff), [0, 0.55, -0.25], [0.46, 0.4, 0.6]);
  part(group, GEO.ball, paint(0xffd9a8), [0, 0.72, 0.2], 0.34);
  part(group, GEO.ball, paint(0x4cb8ff), [0, 0.86, 0.2], [0.36, 0.2, 0.36]);
  part(group, GEO.tube, paint(0x3a3a4a), [0.7, -0.75, -0.3], [0.2, 0.14, 0.2], [0, 0, Math.PI / 2]);
  part(group, GEO.tube, paint(0x3a3a4a), [-0.7, -0.75, -0.3], [0.2, 0.14, 0.2], [0, 0, Math.PI / 2]);
  part(group, GEO.box, paint(0xdddddd), [0.45, -0.5, -0.3], [0.08, 0.5, 0.12], [0, 0, 0.5]);
  part(group, GEO.box, paint(0xdddddd), [-0.45, -0.5, -0.3], [0.08, 0.5, 0.12], [0, 0, -0.5]);
  const propeller = pivot(group, [0, 0, -1.9]);
  part(propeller, GEO.box, paint(0x3a3a4a), [0, 0, 0], [2, 0.16, 0.05]);
  part(propeller, GEO.ball, paint(0xffc93c), [0, 0, -0.05], 0.16);
  return {
    group,
    animate(time, power) {
      propeller.rotation.z = time * (18 + power * 14);
    },
  };
}

function dragon(): FlyerModel {
  const group = new Group();
  const green = paint(0x37c07a);
  const belly = paint(0xffe08a);
  part(group, GEO.ball, green, [0, 0, 0.1], [0.8, 0.8, 1.5]);
  part(group, GEO.ball, belly, [0, -0.28, 0], [0.62, 0.58, 1.3]);
  part(group, GEO.ball, green, [0, 0.5, -1.25], [0.46, 0.5, 0.7], [-0.6, 0, 0]);
  const head = pivot(group, [0, 1, -1.8]);
  part(head, GEO.ball, green, [0, 0, 0], [0.6, 0.55, 0.65]);
  part(head, GEO.ball, paint(0x5fdc9a), [0, -0.12, -0.6], [0.42, 0.32, 0.5]);
  part(head, GEO.ball, paint(0x25976a), [0.18, 0, -1], 0.07);
  part(head, GEO.ball, paint(0x25976a), [-0.18, 0, -1], 0.07);
  eyes(head, 0.3, 0.28, -0.35, 0.2);
  part(head, GEO.cone, paint(0xffc93c), [0.3, 0.6, 0.15], [0.12, 0.5, 0.12], [0.4, 0, 0]);
  part(head, GEO.cone, paint(0xffc93c), [-0.3, 0.6, 0.15], [0.12, 0.5, 0.12], [0.4, 0, 0]);
  for (const [index, z] of [-0.7, 0, 0.7].entries()) {
    part(group, GEO.cone, paint(0xff7a59), [0, 0.86 - index * 0.04, z], [0.17, 0.42, 0.26]);
  }
  const tail = [pivot(group, [0, 0.05, 1.4])];
  let holder = tail[0] as Group;
  for (let link = 0; link < 3; link += 1) {
    const size = 0.42 - link * 0.1;
    part(holder, GEO.ball, green, [0, 0, 0.35], [size, size, 0.55]);
    holder = pivot(holder, [0, 0, 0.62]);
    tail.push(holder);
  }
  part(holder, GEO.cone, paint(0xff7a59), [0, 0, 0.1], [0.3, 0.5, 0.1], [-Math.PI / 2, 0, 0]);
  const left = wing(group, [-0.55, 0.4, -0.2], -1, 3, 1.9, 0x25976a, 0xff9e80);
  const right = wing(group, [0.55, 0.4, -0.2], 1, 3, 1.9, 0x25976a, 0xff9e80);
  return {
    group,
    animate(time, power) {
      flap(left, right, Math.sin(time * (6 + power * 4)) * 0.6 + 0.1);
      tail.forEach((link, index) => {
        link.rotation.y = Math.sin(time * 4 - index) * 0.25;
      });
      head.rotation.x = Math.sin(time * 2) * 0.08;
    },
  };
}

function unicorn(): FlyerModel {
  const group = new Group();
  const coat = paint(0xfdf3ff);
  part(group, GEO.ball, coat, [0, 0, 0.1], [0.72, 0.74, 1.35]);
  part(group, GEO.ball, coat, [0, 0.55, -1.05], [0.38, 0.62, 0.42], [-0.6, 0, 0]);
  const head = pivot(group, [0, 1.15, -1.5]);
  part(head, GEO.ball, coat, [0, 0, 0], [0.42, 0.42, 0.55]);
  part(head, GEO.ball, paint(0xffc0dc), [0, -0.1, -0.5], [0.3, 0.26, 0.3]);
  eyes(head, 0.28, 0.14, -0.26, 0.15);
  part(head, GEO.cone, paint(0xffc93c), [0, 0.68, -0.18], [0.13, 0.9, 0.13], [-0.3, 0, 0]);
  part(head, GEO.cone, coat, [0.26, 0.42, 0.14], [0.1, 0.28, 0.1]);
  part(head, GEO.cone, coat, [-0.26, 0.42, 0.14], [0.1, 0.28, 0.1]);
  for (const [index, hex] of [0xff6b6b, 0xffc93c, 0x3ecf8e, 0x4cb8ff, 0x8b5cf6].entries()) {
    part(group, GEO.ball, paint(hex), [0, 1.4 - index * 0.2, -1.2 + index * 0.2], [0.14, 0.24, 0.2]);
  }
  const legs: Group[] = [];
  for (const [x, z] of [[0.35, -0.7], [-0.35, -0.7], [0.35, 0.8], [-0.35, 0.8]] as const) {
    const leg = pivot(group, [x, -0.45, z]);
    part(leg, GEO.tube, coat, [0, -0.35, 0], [0.13, 0.75, 0.13]);
    part(leg, GEO.tube, paint(0xffc93c), [0, -0.75, 0], [0.15, 0.16, 0.15]);
    legs.push(leg);
  }
  const tail = pivot(group, [0, 0.25, 1.4]);
  for (const [index, hex] of [0xff6b6b, 0xffc93c, 0x3ecf8e, 0x4cb8ff, 0x8b5cf6].entries()) {
    part(tail, GEO.ball, paint(hex), [(index - 2) * 0.1, -0.08 * index, 0.25 + index * 0.17], [0.16, 0.16, 0.34]);
  }
  const left = wing(group, [-0.5, 0.45, -0.25], -1, 2.7, 1.5, 0xffffff, 0xd8c8ff);
  const right = wing(group, [0.5, 0.45, -0.25], 1, 2.7, 1.5, 0xffffff, 0xd8c8ff);
  return {
    group,
    animate(time, power) {
      flap(left, right, Math.sin(time * (5.5 + power * 4)) * 0.55 + 0.15);
      legs.forEach((leg, index) => {
        leg.rotation.x = Math.sin(time * 5 + index * 1.7) * 0.28 + 0.35;
      });
      tail.rotation.y = Math.sin(time * 3) * 0.3;
    },
  };
}

function rocket(): FlyerModel {
  const group = new Group();
  group.rotation.x = 0;
  const body = pivot(group, [0, 0, 0]);
  body.rotation.x = -Math.PI / 2;
  part(body, GEO.tube, paint(0xf4f6ff), [0, 0.1, 0], [0.82, 2.3, 0.82]);
  part(body, GEO.ball, paint(0xf4f6ff), [0, 1.25, 0], [0.8, 0.5, 0.8]);
  part(body, GEO.cone, paint(0xff5a5a), [0, 1.95, 0], [0.74, 1.15, 0.74]);
  part(body, GEO.tube, paint(0xff5a5a), [0, -0.5, 0], [0.84, 0.24, 0.84]);
  part(body, GEO.tube, paint(0x3a3a4a), [0, -1.15, 0], [0.5, 0.3, 0.5]);
  part(body, GEO.tube, paint(0x4cb8ff), [0, 0.65, -0.74], [0.42, 0.14, 0.42], [Math.PI / 2, 0, 0]);
  part(body, GEO.ring, paint(0xffc93c), [0, 0.65, -0.8], 0.42);
  part(body, GEO.ball, paint(0xffd9a8), [0, 0.65, -0.72], 0.26);
  for (let fin = 0; fin < 4; fin += 1) {
    const holder = pivot(body, [0, -0.7, 0]);
    holder.rotation.y = (fin * Math.PI) / 2 + Math.PI / 4;
    part(holder, GEO.box, paint(0x4cb8ff), [0.9, -0.1, 0], [0.75, 0.95, 0.12], [0, 0, -0.35]);
  }
  const fire = pivot(body, [0, -1.3, 0]);
  const outer = part(fire, GEO.cone, flame, [0, -0.55, 0], [0.42, 1.1, 0.42], [Math.PI, 0, 0]);
  const inner = part(fire, GEO.cone, flameCore, [0, -0.35, 0], [0.22, 0.7, 0.22], [Math.PI, 0, 0]);
  group.scale.setScalar(0.92);
  return {
    group,
    animate(time, power) {
      const flick = 1 + Math.sin(time * 37) * 0.14 + power * 0.5;
      outer.scale.y = 1.1 * flick;
      inner.scale.y = 0.7 * flick;
      body.rotation.y = time * 1.2;
    },
  };
}

const STRIPES = [0xff6b6b, 0xffc93c, 0x3ecf8e, 0x4cb8ff, 0x8b5cf6, 0xff9e43];

function balloon(): FlyerModel {
  const group = new Group();
  const big = pivot(group, [0, 0.7, 0]);
  const panels = 12;
  const slice = (Math.PI * 2) / panels;
  for (let index = 0; index < panels; index += 1) {
    const panel = new SphereGeometry(2, 3, 8, index * slice, slice, 0, Math.PI * 0.82);
    part(big, panel, paint(STRIPES[index % STRIPES.length] ?? 0xffffff), [0, 0.3, 0], [1, 1.12, 1]);
  }
  part(big, GEO.tube, paint(0xffc93c), [0, -1.72, 0], [0.5, 0.25, 0.5]);
  const basket = pivot(group, [0, -1.3, 0]);
  part(basket, GEO.box, paint(0xc98a5a), [0, -0.5, 0], [0.8, 0.6, 0.8]);
  part(basket, GEO.box, paint(0x8a5a3a), [0, -0.2, 0], [0.86, 0.1, 0.86]);
  for (const [x, z] of [[0.35, 0.35], [-0.35, 0.35], [0.35, -0.35], [-0.35, -0.35]] as const) {
    part(basket, GEO.box, paint(0x8a5a3a), [x, 0.2, z], [0.04, 0.8, 0.04]);
  }
  part(basket, GEO.ball, paint(0xffd9a8), [0, 0.02, -0.1], 0.2);
  const fire = part(basket, GEO.cone, flame, [0, 0.45, 0], [0.16, 0.5, 0.16]);
  group.scale.setScalar(0.88);
  return {
    group,
    animate(time, power) {
      basket.rotation.z = Math.sin(time * 1.6) * 0.1;
      basket.rotation.x = Math.cos(time * 1.3) * 0.07;
      big.rotation.y = time * 0.25;
      fire.scale.y = 0.5 + Math.abs(Math.sin(time * 19)) * (0.25 + power * 0.4);
    },
  };
}

function bee(): FlyerModel {
  const group = new Group();
  part(group, GEO.ball, paint(0xffc93c), [0, 0, 0.25], [0.92, 0.9, 1.3]);
  for (const [z, size] of [[-0.25, 0.86], [0.35, 0.92], [0.95, 0.72]] as const) {
    part(group, GEO.tube, paint(0x2b2140), [0, 0, z], [size, 0.26, size], [Math.PI / 2, 0, 0]);
  }
  part(group, GEO.cone, paint(0x2b2140), [0, 0, 1.6], [0.16, 0.4, 0.16], [Math.PI / 2, 0, 0]);
  const head = pivot(group, [0, 0.15, -1.05]);
  part(head, GEO.ball, paint(0x2b2140), [0, 0, 0], 0.62);
  eyes(head, 0.3, 0.14, -0.4, 0.2);
  part(head, GEO.ball, paint(0xffffff), [0, -0.18, -0.56], [0.2, 0.08, 0.1]);
  for (const side of [-1, 1]) {
    part(head, GEO.tube, paint(0x2b2140), [side * 0.28, 0.72, 0], [0.04, 0.6, 0.04], [0, 0, -side * 0.35]);
    part(head, GEO.ball, paint(0xff6b6b), [side * 0.4, 1.04, 0], 0.12);
  }
  const glass = new MeshLambertMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.8, side: DoubleSide });
  const left = pivot(group, [-0.4, 0.75, -0.1]);
  const right = pivot(group, [0.4, 0.75, -0.1]);
  part(left, GEO.ball, glass, [-1, 0, 0], [1.1, 0.05, 0.62]);
  part(right, GEO.ball, glass, [1, 0, 0], [1.1, 0.05, 0.62]);
  return {
    group,
    animate(time) {
      flap(left, right, Math.sin(time * 50) * 0.5 + 0.2);
      head.rotation.y = Math.sin(time * 1.5) * 0.15;
    },
  };
}

const BUILDERS: Record<FlyerId, () => FlyerModel> = { plane, dragon, unicorn, rocket, balloon, bee };

/** The flyer, facing -z, about 3 units long. */
export const buildFlyer = (id: FlyerId): FlyerModel => BUILDERS[id]();
