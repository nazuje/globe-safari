import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, type Camera, type Scene } from 'three';
import type { Spark, Trace } from '../rules/trace.ts';
import { additive, BEAM_COLORS, sparkTexture, stripTexture } from './look.ts';

const MOST_SEGMENTS = 96;
const MOST_SPARKS = 90;
export const BEAM_HEIGHT = 0.3;
const FLOOR_GLOW_HEIGHT = 0.03;
const CORE_WIDTH = 0.055;
const GLOW_WIDTH = 0.5;
const FLOOR_WIDTH = 0.96;
const GLOW_POWER = 0.6;
const FLOOR_POWER = 0.4;
const SPARK_SIZE = 0.62;
const BURST_SECONDS = 0.5;
const PHOTON_SPACING = 0.9;
const PHOTON_SPEED = 2.6;
const PHOTON_SIZE = 0.2;

interface Burst extends Spark {
  age: number;
}

interface Photon {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  phase: number;
  steps: number;
  color: Color;
}

function flatPlane(): PlaneGeometry {
  const plane = new PlaneGeometry(1, 1);
  plane.rotateX(-Math.PI / 2);
  return plane;
}

/** Light: a hot core, a soft glow around it, and a wide pool of color on the tiles below. */
export class Beams {
  private readonly core: InstancedMesh;
  private readonly glow: InstancedMesh;
  private readonly floor: InstancedMesh;
  private readonly sparks: InstancedMesh;
  private readonly glowMaterial: ReturnType<typeof additive>;
  private readonly floorMaterial: ReturnType<typeof additive>;
  private readonly dummy = new Object3D();
  private readonly tint = new Color();
  private readonly camera: Camera;
  private bounces: Spark[] = [];
  private bursts: Burst[] = [];
  private photons: Photon[] = [];
  private clock = 0;
  private power = 1;

  constructor(scene: Scene, camera: Camera) {
    this.camera = camera;
    const strip = stripTexture();
    this.glowMaterial = additive(strip, 0xffffff, GLOW_POWER);
    this.floorMaterial = additive(strip, 0xffffff, FLOOR_POWER);
    this.core = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ toneMapped: false }), MOST_SEGMENTS);
    this.glow = new InstancedMesh(flatPlane(), this.glowMaterial, MOST_SEGMENTS);
    this.floor = new InstancedMesh(flatPlane(), this.floorMaterial, MOST_SEGMENTS);
    this.sparks = new InstancedMesh(new PlaneGeometry(1, 1), additive(sparkTexture()), MOST_SPARKS);
    for (const mesh of [this.core, this.glow, this.floor, this.sparks]) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
    }
    this.floor.renderOrder = 1;
    this.glow.renderOrder = 2;
    this.sparks.renderOrder = 3;
  }

  private place(mesh: InstancedMesh, index: number, x: number, y: number, z: number, length: number, width: number, angle: number): void {
    const { dummy } = this;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, angle, 0);
    dummy.scale.set(length, mesh === this.core ? width : 1, width);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  /** Shows a trace. Boards are centered, so `worldX` and `worldZ` turn tiles into scene positions. */
  show(trace: Trace, worldX: (x: number) => number, worldZ: (y: number) => number, instant: boolean): void {
    const segments = trace.segments.slice(0, MOST_SEGMENTS);
    const photons: Photon[] = [];
    segments.forEach((segment, index) => {
      const x1 = worldX(segment.x1);
      const z1 = worldZ(segment.y1);
      const x2 = worldX(segment.x2);
      const z2 = worldZ(segment.y2);
      const length = Math.hypot(x2 - x1, z2 - z1);
      const middleX = (x1 + x2) / 2;
      const middleZ = (z1 + z2) / 2;
      const angle = -Math.atan2(z2 - z1, x2 - x1);
      const color = this.tint.set(BEAM_COLORS[segment.color]);
      this.place(this.core, index, middleX, BEAM_HEIGHT, middleZ, length + CORE_WIDTH, CORE_WIDTH, angle);
      this.place(this.glow, index, middleX, BEAM_HEIGHT, middleZ, length, GLOW_WIDTH, angle);
      this.place(this.floor, index, middleX, FLOOR_GLOW_HEIGHT, middleZ, length, FLOOR_WIDTH, angle);
      this.core.setColorAt(index, color);
      this.glow.setColorAt(index, color);
      this.floor.setColorAt(index, color);
      const steps = Math.max(1, Math.round(length / PHOTON_SPACING));
      for (let step = 0; step < steps; step += 1) {
        photons.push({ x1, z1, x2, z2, phase: step / steps, steps, color: new Color(BEAM_COLORS[segment.color]) });
      }
    });
    for (const mesh of [this.core, this.glow, this.floor]) {
      mesh.count = segments.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    if (!instant) this.addBursts(trace.bounces, worldX, worldZ);
    this.bounces = trace.bounces.map(({ x, y, color }) => ({ x: worldX(x), y: worldZ(y), color }));
    this.photons = photons;
  }

  private addBursts(bounces: Spark[], worldX: (x: number) => number, worldZ: (y: number) => number): void {
    for (const { x, y, color } of bounces) {
      const placedX = worldX(x);
      const placedZ = worldZ(y);
      if (this.bounces.some((known) => known.x === placedX && known.y === placedZ)) continue;
      this.bursts.push({ x: placedX, y: placedZ, color, age: 0 });
    }
  }

  setPower(power: number): void {
    this.power = power;
    this.glowMaterial.opacity = GLOW_POWER * power;
    this.floorMaterial.opacity = FLOOR_POWER * power;
    this.core.visible = power > 0.05;
  }

  private spark(index: number, x: number, z: number, size: number, hex: number, y = BEAM_HEIGHT): void {
    const { dummy } = this;
    dummy.position.set(x, y + 0.05, z);
    dummy.quaternion.copy(this.camera.quaternion);
    dummy.rotateZ(index * 0.7 + this.clock * 0.6);
    dummy.scale.setScalar(Math.max(size, 0.001));
    dummy.updateMatrix();
    this.sparks.setMatrixAt(index, dummy.matrix);
    this.sparks.setColorAt(index, this.tint.set(hex));
  }

  tick(seconds: number, still: boolean): void {
    this.clock += still ? 0 : seconds;
    let used = 0;
    if (this.power > 0.5) {
      this.bounces.forEach(({ x, y, color }, index) => {
        if (used >= MOST_SPARKS) return;
        const pulse = 1 + (still ? 0 : Math.sin(this.clock * 7 + index * 2) * 0.22);
        this.spark(used, x, y, SPARK_SIZE * pulse, BEAM_COLORS[color]);
        used += 1;
      });
      if (!still) used = this.drawPhotons(used);
    }
    this.bursts = this.bursts.filter((burst) => burst.age < BURST_SECONDS);
    for (const burst of this.bursts) {
      burst.age += seconds;
      if (used >= MOST_SPARKS) break;
      const rise = burst.age / BURST_SECONDS;
      this.spark(used, burst.x, burst.y, SPARK_SIZE * (1 + (still ? 0.8 : rise * 2.4)) * (1 - rise * 0.5), BEAM_COLORS[burst.color]);
      used += 1;
    }
    this.sparks.count = used;
    this.sparks.instanceMatrix.needsUpdate = true;
    if (this.sparks.instanceColor) this.sparks.instanceColor.needsUpdate = true;
  }

  private drawPhotons(from: number): number {
    let used = from;
    for (const { x1, z1, x2, z2, phase, steps, color } of this.photons) {
      if (used >= MOST_SPARKS) break;
      const along = (phase + (this.clock * PHOTON_SPEED) / steps / PHOTON_SPACING) % 1;
      this.spark(used, x1 + (x2 - x1) * along, z1 + (z2 - z1) * along, PHOTON_SIZE, color.getHex());
      used += 1;
    }
    return used;
  }
}
