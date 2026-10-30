import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
  type Scene,
} from 'three';
import { BACK_Z, LAYOUTS, windowsOf, type House, type Layout, type SceneId, type Wall } from './layout.ts';
import { ball, box, cone, merged, part, SNOW, toyMaterial, tube } from './models.ts';

interface Mood {
  top: number;
  bottom: number;
  fog: number;
  fogFrom: number;
  fogTo: number;
  snow: number;
  hill: number;
  sky: number;
  ground: number;
  skyLight: number;
  sunColor: number;
  sunLight: number;
  flakes: number;
}

const MOODS: Record<SceneId, Mood> = {
  village: {
    top: 0x58b8f5,
    bottom: 0xdff5ff,
    fog: 0xdff5ff,
    fogFrom: 38,
    fogTo: 95,
    snow: 0xf7fbff,
    hill: 0xf4fbff,
    sky: 0xf0f7ff,
    ground: 0x9fc3ea,
    skyLight: 2.1,
    sunColor: 0xfff6e8,
    sunLight: 1.3,
    flakes: 0xffffff,
  },
  lake: {
    top: 0x8fc8f2,
    bottom: 0xffe3ef,
    fog: 0xffe9f0,
    fogFrom: 36,
    fogTo: 95,
    snow: 0xffffff,
    hill: 0xfff4f6,
    sky: 0xf6f3ff,
    ground: 0xb4bfe8,
    skyLight: 2.1,
    sunColor: 0xffeedd,
    sunLight: 1.3,
    flakes: 0xffffff,
  },
  night: {
    top: 0x0e1a52,
    bottom: 0x35508f,
    fog: 0x2a3f80,
    fogFrom: 34,
    fogTo: 90,
    snow: 0xdfe8ff,
    hill: 0x8fa6dc,
    sky: 0xb7c8ff,
    ground: 0x7f8fd0,
    skyLight: 2.6,
    sunColor: 0xcfdcff,
    sunLight: 1.6,
    flakes: 0xe9f0ff,
  },
};

const FLAKES = 220;
const CALM_FLAKES = 60;
const FLAKE_BOX = { x: 34, y: 18, z: 40 };
const FLAKE_FALL = 1.5;

export interface World {
  update(seconds: number, time: number): void;
  dispose(): void;
}

function roundSpot(): CanvasTexture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const pen = canvas.getContext('2d');
  if (pen) {
    const glow = pen.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.55, 'rgba(255,255,255,0.9)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    pen.fillStyle = glow;
    pen.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function skyDome({ top, bottom }: Mood): Mesh {
  const shape = new SphereGeometry(190, 16, 10);
  const high = new Color(top);
  const low = new Color(bottom);
  const heights = shape.getAttribute('position');
  const colors = new Float32Array(heights.count * 3);
  const mix = new Color();
  for (let i = 0; i < heights.count; i++) {
    mix.lerpColors(low, high, Math.min(Math.max(heights.getY(i) / 90, 0), 1));
    colors.set([mix.r, mix.g, mix.b], i * 3);
  }
  shape.setAttribute('color', new BufferAttribute(colors, 3));
  const dome = new Mesh(shape, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -1;
  return dome;
}

function wallParts(wall: Wall, snow: number): BufferGeometry[] {
  const { x, z, halfWidth, height, kind } = wall;
  if (kind === 'bank') {
    const lumps = Math.ceil(halfWidth * 1.5);
    return Array.from({ length: lumps }, (_, index) => {
      const across = lumps === 1 ? 0 : (index / (lumps - 1) - 0.5) * 2;
      return part(ball(1, 1), snow, {
        x: x + across * halfWidth * 0.8,
        y: height * 0.4,
        z,
        sx: halfWidth / lumps + 0.75,
        sy: height * (1.05 - Math.abs(across) * 0.35),
        sz: 0.95,
      });
    });
  }
  if (kind === 'hedge') {
    const lumps = Math.ceil(halfWidth * 1.3);
    return Array.from({ length: lumps }, (_, index) => {
      const lumpX = x - halfWidth + ((index + 0.5) / lumps) * halfWidth * 2;
      const shape = { x: lumpX, z, sx: (halfWidth / lumps) * 1.3, sz: 0.85 };
      return [
        part(ball(1, 1), 0x45a868, { ...shape, y: height * 0.5, sy: height * 0.6 }),
        part(ball(0.9, 1), snow, { ...shape, y: height * 0.92, sy: height * 0.3 }),
      ];
    }).flat();
  }
  const parts = [
    part(box(halfWidth * 2, height, 1), 0xc9705a, { x, y: height / 2, z }),
    part(box(halfWidth * 2 + 0.25, 0.32, 1.25), snow, { x, y: height + 0.1, z }),
  ];
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < Math.floor(halfWidth * 1.4); column++) {
      const brickX = x - halfWidth + 0.5 + column * 1.3 + row * 0.5;
      if (brickX + 0.4 > x + halfWidth) continue;
      parts.push(part(box(0.9, 0.3, 0.06), 0xdd8a72, { x: brickX, y: 0.4 + row * 0.55, z: z + 0.51 }));
    }
  }
  return parts;
}

function houseParts(house: House, snow: number, night: boolean): { toy: BufferGeometry[]; glow: BufferGeometry[] } {
  const { x, z, width, height, depth, color, roof } = house;
  const front = z + depth / 2;
  const toy = [
    part(box(width, height, depth), color, { x, y: height / 2, z }),
    part(cone(Math.hypot(width, depth) * 0.58, 2.4, 4), roof, { x, y: height + 1.2, z, ry: Math.PI / 4, sz: depth / width }),
    part(cone(Math.hypot(width, depth) * 0.45, 1.6, 4), snow, { x, y: height + 1.65, z, ry: Math.PI / 4, sz: depth / width }),
    part(box(0.8, 1.6, 0.8), 0xa86a55, { x: x + width * 0.28, y: height + 1.2, z }),
    part(box(1, 0.2, 1), snow, { x: x + width * 0.28, y: height + 2.05, z }),
    part(box(1.1, 2, 0.14), 0x8a5a3a, { x, y: 1, z: front + 0.05 }),
    part(ball(0.07, 0), 0xffd34d, { x: x + 0.34, y: 1, z: front + 0.16 }),
  ];
  const glow: BufferGeometry[] = [];
  const pane = night ? 0xffd66e : 0xbfe6ff;
  for (const spot of windowsOf(house)) {
    toy.push(part(box(1.6, 1.6, 0.12), 0xfff5e6, { x: spot.x, y: spot.y, z: front + 0.04 }));
    toy.push(part(box(1.7, 0.2, 0.5), snow, { x: spot.x, y: spot.y - 0.85, z: front + 0.2 }));
    glow.push(part(box(1.3, 1.3, 0.1), pane, { x: spot.x, y: spot.y, z: front + 0.08 }));
  }
  return { toy, glow };
}

function hills(mood: Mood, layout: Layout): BufferGeometry[] {
  const lumps: [number, number, number, number, number][] = [
    [-60, -62, 44, 15, 22],
    [-12, -72, 52, 19, 24],
    [46, -64, 46, 17, 22],
    [-28, BACK_Z - 16, 34, 8, 14],
    [26, BACK_Z - 15, 36, 9, 14],
    [84, -38, 34, 13, 26],
    [-90, -36, 34, 13, 26],
  ];
  const parts = lumps.map(([x, z, sx, sy, sz]) => part(ball(1, 2), mood.hill, { x, z, sx, sy, sz }));
  parts.push(part(ball(1, 2), mood.snow, { x: layout.yeti.x, y: -0.7, z: layout.yeti.z + 3, sx: 13, sy: 3, sz: 5 }));
  return parts;
}

function fort(snow: number): BufferGeometry[] {
  const lumps = [-5.2, -3.4, -1.7, 0, 1.7, 3.4, 5.2].map((x, index) =>
    part(ball(1.05, 1), snow, { x, y: 0.05 + (index % 2) * 0.16, z: 5.1, sx: 1.25, sy: 0.92, sz: 1 }),
  );
  const pile = [
    [2.6, 1.05],
    [3.2, 1.05],
    [2.9, 1.5],
  ].map(([x, y]) => part(ball(0.34, 1), 0xf7fbff, { x, y, z: 5.2 }));
  return [...lumps, ...pile, ...drifts(snow)];
}

/** Soft drifts at the player's feet, which only a tall phone can see. */
function drifts(snow: number): BufferGeometry[] {
  return [
    [-2.4, 7.4, 1.6],
    [2.2, 7.8, 1.3],
    [0, 6.8, 1.1],
  ].map(([x, z, size]) => part(ball(1, 1), snow, { x, y: -0.05, z, sx: size * 1.4, sy: size * 0.2, sz: size }));
}

function firTree(): BufferGeometry {
  return merged([
    part(tube(0.2, 0.28, 0.9, 6), 0x7a5233, { y: 0.45 }),
    part(cone(1.25, 1.6, 7), 0x2f9a6b, { y: 1.5 }),
    part(cone(0.98, 1.4, 7), 0x38b37b, { y: 2.4 }),
    part(cone(0.68, 1.2, 7), 0x45c78a, { y: 3.2 }),
    part(cone(0.42, 0.56, 7), SNOW, { y: 3.56 }),
    part(tube(0.5, 0.92, 0.2, 7), SNOW, { y: 2.0 }),
    part(tube(0.28, 0.6, 0.18, 7), SNOW, { y: 2.92 }),
  ]);
}

function forest(layout: Layout): { x: number; z: number; size: number }[] {
  const near = layout.trees.map((tree) => ({ ...tree }));
  const far: { x: number; z: number; size: number }[] = [];
  for (let i = 0; i < 34; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (22 + ((i * 37) % 60));
    const z = -((i * 23) % 44) - 8 + (i % 3);
    far.push({ x, z, size: 1.4 + ((i * 13) % 10) / 8 });
  }
  for (let i = 0; i < 14; i++) far.push({ x: -46 + i * 7 + (i % 3), z: BACK_Z - 3 - (i % 4) * 2, size: 1.2 + (i % 3) * 0.3 });
  return [...near, ...far];
}

function plantTrees(layout: Layout): InstancedMesh {
  const trees = forest(layout);
  const mesh = new InstancedMesh(firTree(), toyMaterial, trees.length);
  const matrix = new Matrix4();
  const spin = new Quaternion();
  const up = new Vector3(0, 1, 0);
  trees.forEach(({ x, z, size }, index) => {
    spin.setFromAxisAngle(up, index * 1.7);
    matrix.compose(new Vector3(x, 0, z), spin, new Vector3(size, size, size));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function lanternParts(layout: Layout): { toy: BufferGeometry[]; glow: BufferGeometry[]; lights: Vector3[] } {
  const toy: BufferGeometry[] = [];
  const glow: BufferGeometry[] = [];
  const lights: Vector3[] = [];
  for (const { x, z } of layout.lanterns) {
    toy.push(part(tube(0.07, 0.11, 2.9, 6), 0x3a3f5c, { x, y: 1.45, z }));
    toy.push(part(cone(0.42, 0.34, 4), 0x3a3f5c, { x, y: 3.5, z, ry: Math.PI / 4 }));
    toy.push(part(box(0.5, 0.08, 0.5), 0x3a3f5c, { x, y: 2.86, z }));
    glow.push(part(ball(0.32, 1), 0xffd878, { x, y: 3.14, z }));
    lights.push(new Vector3(x, 3.14, z));
  }
  return { toy, glow, lights };
}

function lakeParts(lake: NonNullable<Layout['lake']>): BufferGeometry[] {
  const parts = [part(tube(1, 1, 0.04, 28), 0xaee6fb, { x: lake.x, y: 0.02, z: lake.z, sx: lake.width, sz: lake.depth })];
  parts.push(part(tube(1, 1, 0.04, 28), 0xc9f1ff, { x: lake.x - 3, y: 0.05, z: lake.z - 1, sx: lake.width * 0.72, sz: lake.depth * 0.66 }));
  for (let i = 0; i < 9; i++) {
    const x = lake.x - lake.width * 0.55 + i * 3.1;
    const z = lake.z - 6 + ((i * 7) % 12);
    parts.push(part(box(1.6 + (i % 3), 0.02, 0.09), SNOW, { x, y: 0.08, z, ry: 0.5 + i }));
  }
  return parts;
}

function glowHalos(lights: Vector3[], spot: CanvasTexture, color: number, size: number): Points {
  const shape = new BufferGeometry().setFromPoints(lights);
  return new Points(
    shape,
    new PointsMaterial({
      map: spot,
      color,
      size,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
}

function nightSky(spot: CanvasTexture): Points {
  const stars: Vector3[] = [];
  for (let i = 0; i < 120; i++) {
    const angle = (i * 2.399) % Math.PI;
    const rise = 0.14 + ((i * 0.37) % 1) * 0.75;
    stars.push(new Vector3(Math.cos(angle) * 170 * (1 - rise * 0.5), rise * 110, -Math.sin(angle) * 170 * (1 - rise * 0.5)));
  }
  const shape = new BufferGeometry().setFromPoints(stars);
  return new Points(
    shape,
    new PointsMaterial({ map: spot, color: 0xffffff, size: 2.6, transparent: true, depthWrite: false, fog: false }),
  );
}

class Flakes {
  readonly points: Points;
  private readonly places: Float32Array;
  private readonly count: number;

  constructor(spot: CanvasTexture, color: number, calm: boolean) {
    this.count = calm ? CALM_FLAKES : FLAKES;
    this.places = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      this.places.set(
        [(Math.random() - 0.5) * FLAKE_BOX.x * 2, Math.random() * FLAKE_BOX.y, Math.random() * -FLAKE_BOX.z + 9],
        i * 3,
      );
    }
    const shape = new BufferGeometry();
    shape.setAttribute('position', new BufferAttribute(this.places, 3));
    this.points = new Points(
      shape,
      new PointsMaterial({ map: spot, color, size: 0.3, transparent: true, depthWrite: false, opacity: 0.95 }),
    );
    this.points.frustumCulled = false;
  }

  update(seconds: number, time: number, speed: number): void {
    const { places, count } = this;
    for (let i = 0; i < count; i++) {
      const at = i * 3;
      places[at] += Math.sin(time * 0.7 + i) * 0.4 * seconds * speed;
      places[at + 1] -= FLAKE_FALL * (0.7 + (i % 5) * 0.12) * seconds * speed;
      if (places[at + 1] < 0) places[at + 1] += FLAKE_BOX.y;
    }
    this.points.geometry.getAttribute('position').needsUpdate = true;
  }
}

/** Builds a scene: sky, hills, trees, houses and falling snow, in a handful of draw calls. */
export function buildWorld(scene: Scene, id: SceneId, calm: boolean): World {
  const mood = MOODS[id];
  const layout = LAYOUTS[id];
  const night = id === 'night';
  const group = new Group();
  const spot = roundSpot();
  const madeMaterials: Material[] = [];

  scene.fog = new Fog(mood.fog, mood.fogFrom, mood.fogTo);
  group.add(skyDome(mood));

  const hemisphere = new HemisphereLight(mood.sky, mood.ground, mood.skyLight);
  const sun = new DirectionalLight(mood.sunColor, mood.sunLight);
  sun.position.set(-8, 16, 12);
  group.add(hemisphere, sun);

  const ground = part(new PlaneGeometry(420, 320, 1, 1), mood.snow, { rx: -Math.PI / 2, z: -60 });
  const groundMesh = new Mesh(ground, toyMaterial);
  group.add(groundMesh);

  const lanterns = lanternParts(layout);
  const toy: BufferGeometry[] = [...hills(mood, layout), ...fort(mood.snow), ...lanterns.toy];
  const glow: BufferGeometry[] = [...lanterns.glow];
  for (const wall of layout.walls) toy.push(...wallParts(wall, mood.snow));
  for (const house of layout.houses) {
    const parts = houseParts(house, mood.snow, night);
    toy.push(...parts.toy);
    glow.push(...parts.glow);
  }
  if (layout.lake) toy.push(...lakeParts(layout.lake));
  group.add(new Mesh(merged(toy), toyMaterial));

  const glowMaterial = new MeshBasicMaterial({ vertexColors: true, fog: false, side: DoubleSide });
  madeMaterials.push(glowMaterial);
  group.add(new Mesh(merged(glow), glowMaterial));
  group.add(plantTrees(layout));

  if (night) {
    group.add(glowHalos(lanterns.lights, spot, 0xffc765, 5));
    group.add(nightSky(spot));
    const moon = new Mesh(ball(9, 2), new MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
    moon.position.set(-58, 62, -150);
    group.add(moon);
  }

  const flakes = new Flakes(spot, mood.flakes, calm);
  group.add(flakes.points);
  scene.add(group);

  return {
    update(seconds, time) {
      flakes.update(seconds, time, calm ? 0.4 : 1);
    },
    dispose() {
      scene.remove(group);
      group.traverse((object) => {
        if (object instanceof Mesh || object instanceof Points || object instanceof InstancedMesh) {
          object.geometry.dispose();
          const { material } = object;
          if (material !== toyMaterial) (material as Material).dispose();
        }
      });
      spot.dispose();
      for (const material of madeMaterials) material.dispose();
    },
  };
}
