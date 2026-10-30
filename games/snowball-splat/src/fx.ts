import {
  Color,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Scene,
} from 'three';
import type { HatId } from './hats.ts';
import { hatShape, shapes, toyMaterial } from './models.ts';

const BITS = 360;
const CALM_BITS = 90;
const GRAVITY = 16;
const FLYERS = 10;
const CONFETTI = [0xff5d5d, 0xffc933, 0x52d273, 0x3fb6ff, 0xc06bff, 0xff9ed1];

interface Bit {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  full: number;
  size: number;
  spin: number;
  fall: number;
}

const matrix = new Matrix4();
const place = new Vector3();
const size = new Vector3();
const turn = new Quaternion();
const euler = new Euler();
const white = new Color(0xffffff);
const tint = new Color();

/** Puffs of snow and confetti, all one draw call. */
class Bits {
  private readonly mesh: InstancedMesh;
  private readonly bits: Bit[] = [];
  private readonly limit: number;

  constructor(scene: Scene, calm: boolean) {
    this.limit = calm ? CALM_BITS : BITS;
    this.mesh = new InstancedMesh(
      new IcosahedronGeometry(1, 0),
      new MeshLambertMaterial({ flatShading: true }),
      this.limit,
    );
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  add(at: Vector3, color: Color, bit: Omit<Bit, 'x' | 'y' | 'z'>): void {
    if (this.bits.length >= this.limit) return;
    this.mesh.setColorAt(this.bits.length, color);
    this.bits.push({ x: at.x, y: at.y, z: at.z, ...bit });
  }

  update(seconds: number): void {
    let kept = 0;
    for (let index = 0; index < this.bits.length; index++) {
      const bit = this.bits[index];
      bit.life -= seconds;
      if (bit.life <= 0) continue;
      bit.vy -= GRAVITY * bit.fall * seconds;
      bit.x += bit.vx * seconds;
      bit.y += bit.vy * seconds;
      bit.z += bit.vz * seconds;
      if (bit.y < 0.05) {
        bit.y = 0.05;
        bit.vy = 0;
        bit.vx *= 0.8;
        bit.vz *= 0.8;
      }
      if (kept !== index) {
        this.mesh.getColorAt(index, tint);
        this.mesh.setColorAt(kept, tint);
        this.bits[kept] = bit;
      }
      const s = bit.size * Math.min(bit.life / (bit.full * 0.4), 1);
      place.set(bit.x, bit.y, bit.z);
      size.set(s, s, s);
      euler.set(bit.life * bit.spin, bit.life * bit.spin * 0.7, 0);
      matrix.compose(place, turn.setFromEuler(euler), size);
      this.mesh.setMatrixAt(kept, matrix);
      kept += 1;
    }
    this.bits.length = kept;
    this.mesh.count = kept;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

interface Flyer {
  mesh: Mesh;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  life: number;
  bounce: number;
}

/** Hats and carrots on their way somewhere funny. */
class Flyers {
  private readonly flyers: Flyer[];
  private next = 0;

  constructor(scene: Scene) {
    this.flyers = Array.from({ length: FLYERS }, () => {
      const mesh = new Mesh(shapes.carrot, toyMaterial);
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, vx: 0, vy: 0, vz: 0, spin: 0, life: 0, bounce: 0 };
    });
  }

  launch(shape: BufferGeometry, at: Vector3, scale: number, velocity: Vector3, spin: number, bounce: number, life: number): void {
    const flyer = this.flyers[this.next];
    this.next = (this.next + 1) % FLYERS;
    flyer.mesh.geometry = shape;
    flyer.mesh.position.copy(at);
    flyer.mesh.scale.setScalar(scale);
    flyer.mesh.rotation.set(0, 0, 0);
    flyer.mesh.visible = true;
    flyer.vx = velocity.x;
    flyer.vy = velocity.y;
    flyer.vz = velocity.z;
    flyer.spin = spin;
    flyer.bounce = bounce;
    flyer.life = life;
  }

  update(seconds: number): void {
    for (const flyer of this.flyers) {
      if (flyer.life <= 0) continue;
      const { mesh } = flyer;
      flyer.life -= seconds;
      flyer.vy -= GRAVITY * seconds;
      mesh.position.x += flyer.vx * seconds;
      mesh.position.y += flyer.vy * seconds;
      mesh.position.z += flyer.vz * seconds;
      mesh.rotation.x += flyer.spin * seconds;
      mesh.rotation.z += flyer.spin * 0.6 * seconds;
      if (mesh.position.y < 0.15 && flyer.vy < 0) {
        mesh.position.y = 0.15;
        flyer.vy = -flyer.vy * flyer.bounce;
        flyer.vx *= 0.8;
        flyer.vz *= 0.8;
      }
      if (flyer.life < 0.2) mesh.scale.multiplyScalar(0.85);
      if (flyer.life <= 0) mesh.visible = false;
    }
  }
}

const spread = (amount: number): number => (Math.random() - 0.5) * amount * 2;

/** Everything that flies, puffs and flutters. */
export class Fx {
  private readonly bits: Bits;
  private readonly flyers: Flyers;
  private readonly calm: boolean;

  constructor(scene: Scene, calm: boolean) {
    this.bits = new Bits(scene, calm);
    this.flyers = new Flyers(scene);
    this.calm = calm;
  }

  /** A puff of snow, big enough to see at any distance. */
  puff(at: Vector3, power: number): void {
    const count = this.calm ? 5 : Math.round(9 + power * 10);
    for (let i = 0; i < count; i++) {
      this.bits.add(at, white, {
        vx: spread(4.5 * power),
        vy: 1.5 + Math.random() * 5.5 * power,
        vz: spread(4.5 * power),
        life: 0.35 + Math.random() * 0.45,
        full: 0.8,
        size: 0.14 + Math.random() * 0.2 * power,
        spin: 6,
        fall: 0.8,
      });
    }
  }

  trail(at: Vector3): void {
    if (this.calm) return;
    this.bits.add(at, white, { vx: 0, vy: 0.3, vz: 0, life: 0.22, full: 0.22, size: 0.1, spin: 3, fall: 0.1 });
  }

  sparkle(at: Vector3): void {
    if (this.calm) return;
    tint.set(0xffe27a);
    this.bits.add(at, tint, {
      vx: spread(1.4),
      vy: 1 + Math.random() * 2,
      vz: spread(1.4),
      life: 0.55,
      full: 0.55,
      size: 0.11,
      spin: 9,
      fall: 0.12,
    });
  }

  confetti(at: Vector3, count: number, reach: number): void {
    const pieces = this.calm ? Math.min(count, 30) : count;
    for (let i = 0; i < pieces; i++) {
      tint.set(CONFETTI[i % CONFETTI.length]);
      this.bits.add(at, tint, {
        vx: spread(reach),
        vy: 2 + Math.random() * reach,
        vz: spread(reach * 0.7),
        life: 1.5 + Math.random() * 1.3,
        full: 2.8,
        size: 0.16 + Math.random() * 0.14,
        spin: 8,
        fall: 0.3,
      });
    }
  }

  /** The giant's last moment: a whole snowman's worth of snow. */
  blizzard(at: Vector3, size: number): void {
    const pieces = this.calm ? 40 : 170;
    for (let i = 0; i < pieces; i++) {
      this.bits.add(at, white, {
        vx: spread(11),
        vy: 2 + Math.random() * 14,
        vz: spread(7),
        life: 1.1 + Math.random() * 1.4,
        full: 2.5,
        size: 0.2 + Math.random() * 0.34 * size * 0.5,
        spin: 6,
        fall: 0.75,
      });
    }
  }

  hatOff(hat: HatId, at: Vector3, scale: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const velocity = new Vector3(side * (1.5 + Math.random() * 2.5), 8 + Math.random() * 3, 0.3 + Math.random());
    this.flyers.launch(hatShape(hat), at, scale, velocity, side * (7 + Math.random() * 6), 0.4, this.calm ? 0.8 : 1.6);
  }

  carrotOff(at: Vector3, scale: number): void {
    const side = Math.random() < 0.5 ? -1 : 1;
    const velocity = new Vector3(side * (2 + Math.random() * 2.5), 7, 2.2);
    this.flyers.launch(shapes.carrot, at, scale, velocity, side * 12, 0.72, this.calm ? 0.8 : 1.8);
  }

  update(seconds: number): void {
    this.bits.update(seconds);
    this.flyers.update(seconds);
  }
}
