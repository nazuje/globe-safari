import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  type Scene,
} from 'three';
import { makeRandom, pathAt, type Course, type Point } from '../course.ts';
import type { World } from '../worlds.ts';
import { Pile, SHAPES } from './build.ts';

const FLAKES = 70;
const BOX = 70;
const LANTERNS = 14;
const LANTERN_GAP = 34;
const NIGHT_STARS = 260;
const STAR_RADIUS = 470;

export interface Ambient {
  reset(world: World, calm: boolean): void;
  update(x: number, y: number, z: number, s: number, time: number, course: Course): void;
}

function lanternGeometry(): BufferGeometry {
  const pile = new Pile(makeRandom(3));
  pile.add(SHAPES.blob, { x: 0, y: 0, z: 0, sx: 1, sy: 1.25, sz: 1 }, 0xff8c3c);
  pile.add(SHAPES.drum, { x: 0, y: 1.2, z: 0, sx: 0.55, sy: 0.2 }, 0xc0392b);
  pile.add(SHAPES.drum, { x: 0, y: -1.2, z: 0, sx: 0.55, sy: 0.2 }, 0xc0392b);
  pile.add(SHAPES.blob, { x: 0, y: 0, z: 0, sx: 0.55, sy: 0.8, sz: 0.55 }, 0xffe27a);
  return pile.finish();
}

function spread(count: number, radius: number, seed: number): Float32Array {
  const random = makeRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const turn = random() * Math.PI * 2;
    const rise = random() * 0.95 + 0.02;
    const across = Math.sqrt(1 - rise * rise);
    positions.set([Math.cos(turn) * across * radius, rise * radius, Math.sin(turn) * across * radius], index * 3);
  }
  return positions;
}

function softDot(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const paint = canvas.getContext('2d');
  if (paint) {
    const fade = paint.createRadialGradient(16, 16, 2, 16, 16, 16);
    fade.addColorStop(0, 'rgb(255 255 255 / 100%)');
    fade.addColorStop(1, 'rgb(255 255 255 / 0%)');
    paint.fillStyle = fade;
    paint.fillRect(0, 0, 32, 32);
  }
  return new CanvasTexture(canvas);
}

export function createAmbient(scene: Scene): Ambient {
  const offsets = new Float32Array(FLAKES * 3);
  const random = makeRandom(8);
  for (let index = 0; index < offsets.length; index += 1) offsets[index] = random() * BOX;
  const flakePositions = new BufferAttribute(new Float32Array(FLAKES * 3), 3);
  const flakeShape = new BufferGeometry();
  flakeShape.setAttribute('position', flakePositions);
  const flakeMaterial = new PointsMaterial({ size: 0.5, map: softDot(), transparent: true, depthWrite: false });
  const flakes = new Points(flakeShape, flakeMaterial);
  flakes.frustumCulled = false;
  scene.add(flakes);

  const starShape = new BufferGeometry();
  starShape.setAttribute('position', new BufferAttribute(spread(NIGHT_STARS, STAR_RADIUS, 9), 3));
  const nightStars = new Points(starShape, new PointsMaterial({ size: 2.4, sizeAttenuation: false, color: 0xfff6c8, fog: false, depthWrite: false }));
  nightStars.frustumCulled = false;
  nightStars.visible = false;
  scene.add(nightStars);

  const lanterns = new InstancedMesh(lanternGeometry(), new MeshBasicMaterial({ vertexColors: true, fog: false }), LANTERNS);
  const glows = new InstancedMesh(
    new IcosahedronGeometry(2.4, 1),
    new MeshBasicMaterial({ color: 0xff9c3c, transparent: true, opacity: 0.2, blending: AdditiveBlending, depthWrite: false, fog: false }),
    LANTERNS,
  );
  lanterns.frustumCulled = false;
  glows.frustumCulled = false;
  lanterns.visible = false;
  glows.visible = false;
  scene.add(lanterns, glows);

  const placer = new Object3D();
  const point: Point = { x: 0, y: 0, z: 0 };
  let calm = false;
  let showLanterns = false;

  return {
    reset(world, nextCalm) {
      calm = nextCalm;
      if (world.flake !== null) flakeMaterial.color.setHex(world.flake);
      flakes.visible = !calm && world.flake !== null;
      showLanterns = world.lanterns;
      lanterns.visible = showLanterns;
      glows.visible = showLanterns;
      nightStars.visible = world.id === 'night';
    },
    update(x, y, z, s, time, course) {
      if (flakes.visible) {
        const array = flakePositions.array as Float32Array;
        for (let index = 0; index < FLAKES; index += 1) {
          const ox = offsets[index * 3] ?? 0;
          const oy = offsets[index * 3 + 1] ?? 0;
          const oz = offsets[index * 3 + 2] ?? 0;
          array[index * 3] = x + ((ox - x) % BOX + BOX) % BOX - BOX / 2;
          array[index * 3 + 1] = y + ((oy - y - time * 1.6) % BOX + BOX) % BOX - BOX / 2;
          array[index * 3 + 2] = z + ((oz - z) % BOX + BOX) % BOX - BOX * 0.8;
        }
        flakePositions.needsUpdate = true;
      }
      nightStars.position.set(x, y, z);
      if (!showLanterns) return;
      const first = Math.floor(s / LANTERN_GAP);
      for (let slot = 0; slot < LANTERNS; slot += 1) {
        const index = first + slot;
        const along = index * LANTERN_GAP;
        const side = index % 2 === 0 ? 1 : -1;
        const out = 12 + ((index * 37) % 11);
        const up = ((index * 53) % 13) - 4;
        pathAt(course.level, course.length, along, point);
        placer.position.set(point.x + side * out, point.y + up + (calm ? 0 : Math.sin(time + index) * 0.8), point.z);
        placer.rotation.set(0, 0, calm ? 0 : Math.sin(time * 0.7 + index) * 0.08);
        placer.scale.setScalar(1);
        placer.updateMatrix();
        lanterns.setMatrixAt(slot, placer.matrix);
        glows.setMatrixAt(slot, placer.matrix);
      }
      lanterns.instanceMatrix.needsUpdate = true;
      glows.instanceMatrix.needsUpdate = true;
    },
  };
}
