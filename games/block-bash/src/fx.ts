import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Scene,
} from 'three';
import type { Point } from './aim.ts';

const CONFETTI = 150;
const DUST = 40;
const CONFETTI_TINTS = [0xff5f7e, 0xffd23f, 0x4fcf7c, 0x4a9bff, 0x9a6bff, 0xff9838];

interface Bit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  life: number;
  full: number;
  size: number;
}

const blank = (): Bit => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, life: 0, full: 1, size: 1 });
const dummy = new Object3D();
const tint = new Color();

export interface Fx {
  confetti(at: Point, amount: number): void;
  dust(at: Point, amount: number): void;
  update(seconds: number): void;
  clear(): void;
}

/** Confetti and dust. Both are fixed pools of instances, so a big crash allocates nothing. */
export function createFx(scene: Scene): Fx {
  const paper = new InstancedMesh(new PlaneGeometry(0.22, 0.15), new MeshBasicMaterial({ side: DoubleSide }), CONFETTI);
  const puff = new InstancedMesh(
    new IcosahedronGeometry(1, 1),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
    DUST,
  );
  for (const mesh of [paper, puff]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    scene.add(mesh);
  }
  for (let i = 0; i < CONFETTI; i += 1) {
    paper.setColorAt(i, tint.setHex(CONFETTI_TINTS[i % CONFETTI_TINTS.length] ?? 0xffffff));
    paper.setMatrixAt(i, new Matrix4());
  }
  const bits = Array.from({ length: CONFETTI }, blank);
  const puffs = Array.from({ length: DUST }, blank);
  let nextBit = 0;
  let nextPuff = 0;

  function update(list: Bit[], mesh: InstancedMesh, seconds: number, gravity: number, drag: number, draw: (bit: Bit, age: number) => void): void {
    let shown = 0;
    for (const bit of list) {
      if (bit.life <= 0) continue;
      bit.life -= seconds;
      bit.vy -= gravity * seconds;
      const slow = Math.exp(-drag * seconds);
      bit.vx *= slow;
      bit.vy *= slow;
      bit.vz *= slow;
      bit.x += bit.vx * seconds;
      bit.y += bit.vy * seconds;
      bit.z += bit.vz * seconds;
      draw(bit, 1 - Math.max(bit.life, 0) / bit.full);
      dummy.updateMatrix();
      mesh.setMatrixAt(shown, dummy.matrix);
      shown += 1;
    }
    mesh.count = shown;
    mesh.instanceMatrix.needsUpdate = shown > 0;
  }

  return {
    confetti(at, amount) {
      for (let i = 0; i < amount; i += 1) {
        const bit = bits[nextBit];
        nextBit = (nextBit + 1) % CONFETTI;
        if (!bit) continue;
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        Object.assign(bit, {
          x: at.x,
          y: at.y,
          z: at.z,
          vx: Math.cos(angle) * speed,
          vy: 3 + Math.random() * 7,
          vz: Math.sin(angle) * speed,
          spin: Math.random() * 12 - 6,
          life: 1.4 + Math.random() * 0.8,
          full: 2.2,
        });
      }
    },
    dust(at, amount) {
      for (let i = 0; i < amount; i += 1) {
        const bit = puffs[nextPuff];
        nextPuff = (nextPuff + 1) % DUST;
        if (!bit) continue;
        const angle = Math.random() * Math.PI * 2;
        Object.assign(bit, {
          x: at.x,
          y: at.y,
          z: at.z,
          vx: Math.cos(angle) * 2.4,
          vy: 0.8 + Math.random(),
          vz: Math.sin(angle) * 2.4,
          life: 0.6,
          full: 0.6,
          size: 0.2 + Math.random() * 0.2,
        });
      }
    },
    update(seconds) {
      update(bits, paper, seconds, 7, 1.6, (bit, age) => {
        dummy.position.set(bit.x, bit.y, bit.z);
        dummy.rotation.set(age * bit.spin * 4, age * bit.spin * 3, age * bit.spin);
        dummy.scale.setScalar(1 + age * 0.2);
      });
      update(puffs, puff, seconds, 0, 3, (bit, age) => {
        dummy.position.set(bit.x, bit.y, bit.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(bit.size * (1 + age * 1.6) * (1 - age * age));
      });
    },
    clear() {
      for (const bit of [...bits, ...puffs]) bit.life = 0;
      paper.count = 0;
      puff.count = 0;
    },
  };
}

