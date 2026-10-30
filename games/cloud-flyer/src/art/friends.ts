import {
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  TorusGeometry,
  type Scene,
} from 'three';
import { pathAt, type Course, type Point } from '../course.ts';
import { BIRD_SECONDS } from '../flight.ts';

const HOOP_GAP = 14;
const HOOP_SLOTS = 24;
const HOOPS = [0xff5a6e, 0xff9f43, 0xffd93c, 0x3ecf8e, 0x4cb8ff, 0x7b6bff, 0xd96bff];
const BIRDS = 6;
const BIRD_SIZE = 0.7;
const BIRD_SLOTS = [
  [-3.6, 1.6, -3],
  [3.6, 1.6, -3],
  [-6.4, 1, 0],
  [6.4, 1, 0],
  [-2.4, 3.2, 1],
  [2.4, 3.2, 1],
] as const;

export interface Whale {
  /** Starts the whale drifting along beside the road, just ahead of the flyer. */
  appear(s: number): void;
  update(s: number, time: number, seconds: number, course: Course): void;
  hide(): void;
}

export function createWhale(scene: Scene): Whale {
  const skin = new MeshLambertMaterial({ color: 0x5b7fd6, flatShading: true });
  const belly = new MeshLambertMaterial({ color: 0xdfe9ff, flatShading: true });
  const dark = new MeshBasicMaterial({ color: 0x2b2140 });
  const puff = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const ball = new IcosahedronGeometry(1, 1);
  const whale = new Group();
  const mesh = (material: MeshLambertMaterial | MeshBasicMaterial, x: number, y: number, z: number, sx: number, sy: number, sz: number, parent: Group = whale): Mesh => {
    const made = new Mesh(ball, material);
    made.position.set(x, y, z);
    made.scale.set(sx, sy, sz);
    parent.add(made);
    return made;
  };
  mesh(skin, 0, 0, 0, 6.5, 5.2, 12);
  mesh(belly, 0, -2.2, -2, 5.4, 3.6, 9.5);
  const white = new MeshBasicMaterial({ color: 0xffffff });
  for (const side of [-1, 1]) {
    mesh(white, side * 3.7, 1.8, -9.2, 1.25, 1.25, 1);
    mesh(dark, side * 3.7, 1.8, -10, 0.7, 0.7, 0.5);
    mesh(skin, side * 7, -2.2, -2.5, 3.8, 0.5, 1.8);
  }
  for (let dot = -3; dot <= 3; dot += 1) {
    const depth = -10.6 + Math.abs(dot) * 0.25;
    mesh(dark, dot * 0.75, -1.2 + Math.abs(dot) * 0.2, depth, 0.32, 0.32, 0.32);
  }
  const tail = new Group();
  tail.position.set(0, 0.8, 11);
  whale.add(tail);
  mesh(skin, 0, 0, 2.2, 2.4, 1.8, 4, tail);
  mesh(skin, 3.2, 0.3, 5.4, 3.8, 0.45, 1.8, tail);
  mesh(skin, -3.2, 0.3, 5.4, 3.8, 0.45, 1.8, tail);
  const spout = [0, 1, 2].map((index) => mesh(puff, index - 1, 7, -4, 1, 1, 1));
  whale.scale.setScalar(1.25);
  whale.visible = false;
  scene.add(whale);
  const point: Point = { x: 0, y: 0, z: 0 };
  let along = 0;
  let side = 1;
  let age = 0;

  return {
    appear(s) {
      along = s + 240;
      age = 0;
      side = Math.random() < 0.5 ? 1 : -1;
      whale.visible = true;
    },
    update(s, time, seconds, course) {
      if (!whale.visible) return;
      age += seconds;
      // It drifts towards the flyer, smiling, so it comes out of the haze and floats slowly by.
      along -= seconds * 5;
      pathAt(course.level, course.length, along, point);
      whale.position.set(point.x + side * 30, point.y + 6 + Math.sin(time * 0.8) * 2, point.z);
      whale.rotation.set(Math.sin(time * 0.8) * 0.06, Math.PI - side * 0.45, Math.sin(time * 0.5) * 0.05);
      tail.rotation.x = Math.sin(time * 2) * 0.35;
      spout.forEach((blob, index) => {
        const rise = (age * 0.9 + index * 0.3) % 1;
        blob.position.y = 5.5 + rise * 7;
        blob.scale.setScalar(rise < 0.05 ? 0.01 : 1.6 * (1 - rise * 0.7));
      });
      if (along < s - 40) whale.visible = false;
    },
    hide() {
      whale.visible = false;
    },
  };
}

function birdBody(): BufferGeometry {
  return new IcosahedronGeometry(0.42, 0).scale(0.8, 0.8, 1.5);
}

function birdWing(): BufferGeometry {
  return new IcosahedronGeometry(0.5, 0).scale(1.5, 0.12, 0.7).translate(0.72, 0, 0);
}

export interface Flock {
  /** `share` is how far the birds have joined in, from 0 to 1. */
  update(x: number, y: number, z: number, yaw: number, left: number, time: number): void;
}

export function createFlock(scene: Scene): Flock {
  const material = new MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: DoubleSide });
  const bodies = new InstancedMesh(birdBody(), material, BIRDS);
  const wings = new InstancedMesh(birdWing(), material, BIRDS * 2);
  bodies.frustumCulled = false;
  wings.frustumCulled = false;
  const color = new Color();
  for (let bird = 0; bird < BIRDS; bird += 1) {
    color.setHex(HOOPS[bird % HOOPS.length] ?? 0xffffff);
    bodies.setColorAt(bird, color);
    wings.setColorAt(bird * 2, color);
    wings.setColorAt(bird * 2 + 1, color);
  }
  scene.add(bodies, wings);
  bodies.visible = false;
  wings.visible = false;
  const placer = new Object3D();

  return {
    update(x, y, z, yaw, left, time) {
      const on = left > 0;
      bodies.visible = on;
      wings.visible = on;
      if (!on) return;
      const joining = Math.min((BIRD_SECONDS - left) / 1.6, 1);
      const leaving = Math.min(left / 1.6, 1);
      const share = joining * leaving;
      const easy = share * share * (3 - 2 * share);
      BIRD_SLOTS.forEach(([bx, by, bz], bird) => {
        const bob = Math.sin(time * 3 + bird * 1.9) * 0.4;
        const px = x + bx * (1 + (1 - easy) * 2);
        const py = y + by + bob + (1 - easy) * 18;
        const pz = z + bz - (1 - easy) * 30;
        placer.position.set(px, py, pz);
        placer.rotation.set(0, yaw, 0);
        placer.scale.setScalar(BIRD_SIZE);
        placer.updateMatrix();
        bodies.setMatrixAt(bird, placer.matrix);
        const beat = Math.sin(time * 15 + bird * 2.3) * 0.7;
        placer.rotation.set(0, yaw, beat);
        placer.updateMatrix();
        wings.setMatrixAt(bird * 2, placer.matrix);
        placer.rotation.set(0, yaw, -beat);
        placer.scale.x = -BIRD_SIZE;
        placer.updateMatrix();
        wings.setMatrixAt(bird * 2 + 1, placer.matrix);
      });
      bodies.instanceMatrix.needsUpdate = true;
      wings.instanceMatrix.needsUpdate = true;
    },
  };
}

export interface TunnelArt {
  reset(course: Course): void;
  update(s: number): void;
}

export function createTunnel(scene: Scene): TunnelArt {
  const hoops = new InstancedMesh(new TorusGeometry(11, 1.15, 6, 26), new MeshBasicMaterial({ color: 0xffffff }), HOOP_SLOTS);
  hoops.frustumCulled = false;
  hoops.visible = false;
  scene.add(hoops);
  const placer = new Object3D();
  const color = new Color();
  const point: Point = { x: 0, y: 0, z: 0 };
  let from = 0;
  let to = 0;

  return {
    reset(course) {
      const { tunnel } = course;
      hoops.count = 0;
      from = tunnel?.from ?? 0;
      to = tunnel?.to ?? 0;
      if (!tunnel) return;
      const count = Math.min(Math.floor((tunnel.to - tunnel.from) / HOOP_GAP), HOOP_SLOTS);
      hoops.count = count;
      for (let hoop = 0; hoop < count; hoop += 1) {
        const s = tunnel.from + hoop * HOOP_GAP;
        pathAt(course.level, course.length, s, point);
        placer.position.set(point.x, point.y, point.z);
        placer.updateMatrix();
        hoops.setMatrixAt(hoop, placer.matrix);
        hoops.setColorAt(hoop, color.setHex(HOOPS[hoop % HOOPS.length] ?? 0xffffff));
      }
      hoops.instanceMatrix.needsUpdate = true;
      if (hoops.instanceColor) hoops.instanceColor.needsUpdate = true;
    },
    update(s) {
      hoops.visible = to > from && s > from - 420 && s < to + 30;
    },
  };
}
