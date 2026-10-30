import { BufferGeometry, Color, ConeGeometry, Float32BufferAttribute, IcosahedronGeometry, Matrix4, Mesh, MeshLambertMaterial, Scene } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BlockBody } from './physics.ts';

const NOTICES_MOVE_AT = 0.3;
const STILL_SPEED = 0.5;
const STILL_FOR_S = 0.5;
const RUN_SPEED = 5;
const RUN_FOR_S = 1.4;

function part(geometry: BufferGeometry, color: number, matrix: Matrix4): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  flat.applyMatrix4(matrix);
  const { r, g, b } = new Color(color);
  const colors = new Float32Array(flat.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) colors.set([r, g, b], i);
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  return flat;
}

const at = (x: number, y: number, z: number, sx: number, sy = sx, sz = sx): Matrix4 =>
  new Matrix4().makeTranslation(x, y, z).multiply(new Matrix4().makeScale(sx, sy, sz));

function mouseShape(): BufferGeometry {
  const blob = new IcosahedronGeometry(1, 1);
  const gray = 0xb9b4c4;
  const pink = 0xff9fc0;
  const dark = 0x241c33;
  const tail = new ConeGeometry(0.05, 0.75, 5).rotateZ(1.25);
  return (
    mergeGeometries([
      part(blob, gray, at(0, 0.24, 0, 0.36, 0.26, 0.26)),
      part(blob, gray, at(0.34, 0.36, 0, 0.2)),
      part(blob, pink, at(0.26, 0.56, 0.16, 0.13, 0.13, 0.05)),
      part(blob, pink, at(0.26, 0.56, -0.16, 0.13, 0.13, 0.05)),
      part(blob, pink, at(0.54, 0.33, 0, 0.05)),
      part(blob, dark, at(0.44, 0.42, 0.12, 0.035)),
      part(blob, dark, at(0.44, 0.42, -0.12, 0.035)),
      part(tail, pink, new Matrix4().makeTranslation(-0.62, 0.3, 0)),
    ]) ?? new BufferGeometry()
  );
}

type Phase = 'away' | 'sitting' | 'riding' | 'running';

export interface Mouse {
  sitOn(block: BlockBody): void;
  leave(): void;
  /** Returns true on the moment the ride starts. */
  update(seconds: number): boolean;
}

/** A tiny visitor who rides a falling block down and then scampers off, perfectly happy. */
export function createMouse(scene: Scene): Mouse {
  const mesh = new Mesh(mouseShape(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.visible = false;
  mesh.scale.setScalar(1.25);
  scene.add(mesh);

  let phase: Phase = 'away';
  let block: BlockBody | null = null;
  let startX = 0;
  let startY = 0;
  let startZ = 0;
  let still = 0;
  let clock = 0;
  let running = 0;

  function ride(hop: number): void {
    if (!block) return;
    const { x, y, z } = block.body.position;
    const { w, h, d } = block.spec;
    const tipped = Math.abs(block.body.quaternion.x) + Math.abs(block.body.quaternion.z);
    const lift = tipped > 0.2 ? Math.max(w, h, d) * 0.55 : h / 2;
    mesh.position.set(x, y + lift + hop, z);
  }

  return {
    sitOn(next) {
      block = next;
      phase = 'sitting';
      startX = next.body.position.x;
      startY = next.body.position.y;
      startZ = next.body.position.z;
      still = 0;
      mesh.visible = true;
      mesh.rotation.y = -0.5;
      ride(0);
    },
    leave() {
      phase = 'away';
      block = null;
      mesh.visible = false;
    },
    update(seconds) {
      if (phase === 'away' || !block) return false;
      clock += seconds;
      if (phase === 'sitting') {
        ride(Math.abs(Math.sin(clock * 3)) * 0.05);
        const moved = Math.hypot(block.body.position.x - startX, block.body.position.y - startY, block.body.position.z - startZ);
        if (moved < NOTICES_MOVE_AT) return false;
        phase = 'riding';
        return true;
      }
      if (phase === 'riding') {
        ride(0);
        mesh.rotation.z = Math.sin(clock * 16) * 0.3;
        still = block.body.velocity.length() < STILL_SPEED ? still + seconds : 0;
        if (still >= STILL_FOR_S || block.gone) {
          phase = 'running';
          running = 0;
          mesh.rotation.z = 0;
          mesh.rotation.y = Math.atan2(-mesh.position.z, mesh.position.x) + Math.PI;
        }
        return false;
      }
      running += seconds;
      mesh.position.x += Math.cos(mesh.rotation.y) * RUN_SPEED * seconds;
      mesh.position.z -= Math.sin(mesh.rotation.y) * RUN_SPEED * seconds;
      mesh.position.y += Math.sin(clock * 22) * 0.02;
      if (running >= RUN_FOR_S) {
        phase = 'away';
        block = null;
        mesh.visible = false;
      }
      return false;
    },
  };
}
