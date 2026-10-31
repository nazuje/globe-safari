import { AdditiveBlending, BoxGeometry, Color, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, Object3D, type Scene } from 'three';

const MOST = 140;
const GRAVITY = -7;
const CONFETTI = [0xff4fd8, 0x27e8ff, 0xffe45c, 0x7dff6a, 0xff8a2b];
const PUFF = [0xc8cce8, 0xffffff, 0x9aa3c8];
const ZAP = [0xffe45c, 0xff3fa0, 0xffffff];
const dummy = new Object3D();
const color = new Color();

interface Bit {
  life: number;
  full: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fall: number;
  size: number;
  spin: number;
}

export interface Fx {
  confetti(x: number, z: number, calm: boolean): void;
  puff(x: number, z: number, calm: boolean): void;
  update(seconds: number): void;
  clear(): void;
}

/** A small shared pool of bits for every burst in the game, in a single draw call. */
export function createFx(scene: Scene): Fx {
  const mesh = new InstancedMesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: AdditiveBlending, depthWrite: false }), MOST);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.visible = false;
  scene.add(mesh);
  const bits: (Bit | null)[] = Array.from({ length: MOST }, () => null);
  let next = 0;
  let lively = 0;

  function spawn(x: number, z: number, count: number, colors: readonly number[], speed: number, fall: number, size: number, life: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const push = speed * (0.4 + Math.random() * 0.8);
      const slot = next;
      next = (next + 1) % MOST;
      bits[slot] = {
        life,
        full: life,
        x,
        y: 0.5,
        z,
        vx: Math.cos(angle) * push,
        vy: speed * (0.6 + Math.random()),
        vz: Math.sin(angle) * push,
        fall,
        size,
        spin: Math.random() * 6,
      };
      mesh.setColorAt(slot, color.set(colors[index % colors.length] ?? 0xffffff));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.visible = true;
  }

  return {
    confetti(x, z, calm) {
      spawn(x, z, calm ? 24 : 90, CONFETTI, 3.4, GRAVITY, 1.1, 1.6);
    },
    puff(x, z, calm) {
      spawn(x, z, calm ? 6 : 16, ZAP, 2.6, GRAVITY, 0.8, 0.5);
      spawn(x, z, calm ? 5 : 14, PUFF, 1.1, 0.8, 2.3, 0.75);
    },
    update(seconds) {
      if (!mesh.visible) return;
      lively = 0;
      bits.forEach((bit, index) => {
        if (!bit) {
          dummy.scale.setScalar(0);
        } else {
          bit.life -= seconds;
          if (bit.life <= 0) {
            bits[index] = null;
            dummy.scale.setScalar(0);
          } else {
            lively += 1;
            bit.vy += bit.fall * seconds;
            bit.x += bit.vx * seconds;
            bit.y = Math.max(0.04, bit.y + bit.vy * seconds);
            bit.z += bit.vz * seconds;
            dummy.position.set(bit.x, bit.y, bit.z);
            dummy.rotation.set(bit.spin * bit.life, bit.spin, 0);
            dummy.scale.setScalar(bit.size * Math.min(1, (bit.life / bit.full) * 2));
          }
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (lively === 0) mesh.visible = false;
    },
    clear() {
      bits.fill(null);
      mesh.visible = false;
    },
  };
}
