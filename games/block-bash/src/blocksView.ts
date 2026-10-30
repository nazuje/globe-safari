import {
  CircleGeometry,
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Quaternion,
  Scene,
  ShapeGeometry,
  Shape,
  SphereGeometry,
  Vector3,
  DoubleSide,
} from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { Level } from './levels.ts';
import { MAX_BLOCKS } from './levels.ts';
import { LAWN_Y, type BlockBody } from './physics.ts';

const BEVEL = 0.06;
const MOST_FACES = 16;
const MOST_POPS = 16;
const SHADOW_COUNT = MAX_BLOCKS + 3;
const INTRO_S = 0.45;
const WOBBLE_DECAY = 5;
const POP_TINTS = [0xff5fa2, 0xffd23f, 0x4fcf7c, 0x4a9bff, 0x9a6bff];

/** A unit cube with its corners cut, which looks far more like a wooden toy than a sharp box. */
function bevelledCube() {
  const half = 0.5;
  const inner = half - BEVEL;
  const points: Vector3[] = [];
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        points.push(new Vector3(x * half, y * inner, z * inner));
        points.push(new Vector3(x * inner, y * half, z * inner));
        points.push(new Vector3(x * inner, y * inner, z * half));
      }
    }
  }
  return new ConvexGeometry(points);
}

function starGeometry() {
  const shape = new Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 1 : 0.48;
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return new ShapeGeometry(shape);
}

function instanced(geometry: ConstructorParameters<typeof InstancedMesh>[0], material: ConstructorParameters<typeof InstancedMesh>[1], count: number): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export interface BlocksView {
  load(level: Level, reducedMotion: boolean): void;
  /** Blocks that burst vanish from the picture straight away. */
  sync(blocks: readonly BlockBody[], seconds: number, tableHalf: number): void;
  wobble(index: number, strength: number): void;
  scare(index: number): void;
  /** Every face calms down, for a fresh pile of blocks. */
  wake(): void;
}

const scratch = new Object3D();
const blockMatrix = new Matrix4();
const partMatrix = new Matrix4();
const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const local = new Vector3();
const tint = new Color();

/** All blocks, drawn with a handful of instanced meshes: the whole structure costs seven draw calls. */
export function createBlocksView(scene: Scene): BlocksView {
  const cube = bevelledCube();
  const solid = instanced(cube, new MeshLambertMaterial({ flatShading: true }), MAX_BLOCKS);
  const jelly = instanced(cube, new MeshLambertMaterial({ flatShading: true, transparent: true, opacity: 0.78 }), MAX_BLOCKS);
  const eyes = instanced(new IcosahedronGeometry(1, 1), new MeshLambertMaterial({ color: 0xffffff, flatShading: true }), MOST_FACES * 2);
  const pupils = instanced(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: 0x241c33 }), MOST_FACES * 2);
  const mouths = instanced(new SphereGeometry(1, 8, 6), new MeshBasicMaterial({ color: 0x5a2238 }), MOST_FACES);
  const stars = instanced(starGeometry(), new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide }), MOST_POPS * 2);
  const shadows = instanced(
    new CircleGeometry(0.72, 16).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x1d2a3a, transparent: true, opacity: 0.13, depthWrite: false }),
    SHADOW_COUNT,
  );
  shadows.renderOrder = 1;
  scene.add(solid, jelly, eyes, pupils, mouths, stars, shadows);

  let level: Level | null = null;
  let slotOf: { mesh: InstancedMesh; slot: number }[] = [];
  let wobbles: number[] = [];
  let scared: boolean[] = [];
  let age = 0;
  let calm = false;

  function wipeColors(): void {
    for (const mesh of [solid, jelly]) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function placeFacePart(offsetX: number, offsetY: number, offsetZ: number, sx: number, sy: number, sz: number, mesh: InstancedMesh, slot: number): void {
    local.set(offsetX, offsetY, offsetZ);
    scratch.position.copy(local);
    scratch.quaternion.identity();
    scratch.scale.set(sx, sy, sz);
    scratch.updateMatrix();
    partMatrix.multiplyMatrices(blockMatrix, scratch.matrix);
    mesh.setMatrixAt(slot, partMatrix);
  }

  function drawFace(block: BlockBody, index: number, slot: number): void {
    const { w, h, d } = block.spec;
    const size = Math.min(w, h) * 0.5;
    const front = d / 2 + 0.01;
    const eye = size * (0.34 + (index % 3) * 0.04);
    const gap = size * 0.5;
    const up = size * 0.28;
    // The pupils lag behind the block, so they jiggle like googly eyes.
    const lagX = Math.max(Math.min(-block.body.velocity.x * 0.02, 0.5), -0.5) * eye;
    const lagY = Math.max(Math.min(-block.body.velocity.y * 0.03, 0.5), -0.5) * eye;
    for (const side of [0, 1]) {
      const x = side === 0 ? -gap : gap;
      placeFacePart(x, up, front, eye, eye, eye * 0.5, eyes, slot * 2 + side);
      placeFacePart(x + lagX, up + lagY, front + eye * 0.4, eye * 0.5, eye * 0.5, eye * 0.3, pupils, slot * 2 + side);
    }
    const isScared = scared[index] === true;
    const mouthWide = isScared ? size * 0.3 : size * 0.5;
    const mouthTall = isScared ? size * 0.38 : size * 0.16;
    placeFacePart(0, -size * 0.45, front, mouthWide, mouthTall, 0.03, mouths, slot);
  }

  function drawStar(block: BlockBody, spot: number): number {
    const { w, h, d } = block.spec;
    const size = Math.min(w, h) * 0.32;
    placeFacePart(0, 0, d / 2 + 0.012, size, size, 1, stars, spot);
    const across = Math.min(d, h) * 0.32;
    scratch.position.set(w / 2 + 0.012, 0, 0);
    scratch.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    scratch.scale.set(across, across, 1);
    scratch.updateMatrix();
    partMatrix.multiplyMatrices(blockMatrix, scratch.matrix);
    stars.setMatrixAt(spot + 1, partMatrix);
    return spot + 2;
  }

  function drawShadow(block: BlockBody, slot: number, half: number): void {
    const { x, y, z } = block.body.position;
    const overTable = Math.abs(x) < half && Math.abs(z) < half && y > -0.4;
    const ground = overTable ? 0.015 : LAWN_Y + 0.02;
    const lift = Math.max(y - ground, 0);
    const spread = Math.max(1 - lift * 0.05, 0.35);
    scratch.position.set(x, ground, z);
    scratch.quaternion.identity();
    const { w, d } = block.spec;
    scratch.scale.set(w * spread, 1, d * spread);
    scratch.updateMatrix();
    shadows.setMatrixAt(slot, scratch.matrix);
  }

  function hideShadow(slot: number): void {
    scratch.scale.set(0, 0, 0);
    scratch.updateMatrix();
    shadows.setMatrixAt(slot, scratch.matrix);
  }

  function blockScale(index: number, stagger: number): { grow: number; squash: number } {
    const wobble = wobbles[index] ?? 0;
    const appear = calm ? 1 : Math.min(Math.max((age - stagger) / 0.22, 0), 1);
    // A small overshoot makes each block plop into place.
    const grow = appear >= 1 ? 1 : appear * (1.5 - 0.5 * appear);
    return { grow, squash: 1 + wobble * Math.sin(age * 26 + index) * 0.22 };
  }

  return {
    load(next, reducedMotion) {
      level = next;
      calm = reducedMotion;
      age = 0;
      wobbles = next.blocks.map(() => 0);
      scared = next.blocks.map(() => false);
      slotOf = [];
      let solidCount = 0;
      let jellyCount = 0;
      next.blocks.forEach((spec) => {
        const isJelly = spec.kind === 'jelly';
        const mesh = isJelly ? jelly : solid;
        const slot = isJelly ? jellyCount : solidCount;
        if (isJelly) jellyCount += 1;
        else solidCount += 1;
        slotOf.push({ mesh, slot });
        mesh.setColorAt(slot, tint.setHex(spec.color));
      });
      solid.count = solidCount;
      jelly.count = jellyCount;
      eyes.count = 0;
      pupils.count = 0;
      mouths.count = 0;
      stars.count = 0;
      shadows.count = next.blocks.length;
      wipeColors();
    },

    sync(blocks, seconds, half) {
      if (!level) return;
      age += seconds;
      const top = Math.max(...level.blocks.map((block) => block.y), 1);
      let face = 0;
      let star = 0;
      blocks.forEach((block, index) => {
        const entry = slotOf[index];
        if (!entry) return;
        if (block.gone) {
          entry.mesh.setMatrixAt(entry.slot, blockMatrix.makeScale(0, 0, 0));
          hideShadow(index);
          return;
        }
        const { w, h, d, kind, y } = block.spec;
        const { grow, squash } = blockScale(index, (y / top) * INTRO_S);
        wobbles[index] = (wobbles[index] ?? 0) * Math.exp(-WOBBLE_DECAY * seconds);
        position.set(block.body.position.x, block.body.position.y, block.body.position.z);
        quaternion.set(block.body.quaternion.x, block.body.quaternion.y, block.body.quaternion.z, block.body.quaternion.w);
        scale.set(w * grow * (2 - squash), h * grow * squash, d * grow * (2 - squash));
        blockMatrix.compose(position, quaternion, scale);
        entry.mesh.setMatrixAt(entry.slot, blockMatrix);
        drawShadow(block, index, half);
        if (kind !== 'face' && kind !== 'pop') return;
        if (grow < 1) return;
        blockMatrix.compose(position, quaternion, scale.set(1, 1, 1));
        if (kind === 'face' && face < MOST_FACES) {
          drawFace(block, index, face);
          face += 1;
        }
        if (kind === 'pop' && star < MOST_POPS * 2) {
          star = drawStar(block, star);
          if (!calm) {
            const shade = POP_TINTS[Math.floor(age * 3 + index) % POP_TINTS.length] ?? 0xff5fa2;
            entry.mesh.setColorAt(entry.slot, tint.setHex(shade));
          }
        }
      });
      eyes.count = face * 2;
      pupils.count = face * 2;
      mouths.count = face;
      stars.count = star;
      for (const mesh of [solid, jelly, eyes, pupils, mouths, stars, shadows]) mesh.instanceMatrix.needsUpdate = true;
      if (star > 0 && !calm) wipeColors();
    },

    wobble(index, strength) {
      wobbles[index] = Math.min((wobbles[index] ?? 0) + strength, 1);
    },

    scare(index) {
      scared[index] = true;
    },

    wake() {
      scared = scared.map(() => false);
    },
  };
}
