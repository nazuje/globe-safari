import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DodecahedronGeometry,
  Float32BufferAttribute,
  Fog,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  CircleGeometry,
  Scene,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LAWN_Y } from './physics.ts';

interface Theme {
  sky: number;
  lawn: number;
  table: number;
  trim: number;
}

const THEMES: readonly Theme[] = [
  { sky: 0xa8e4ff, lawn: 0x7cd67a, table: 0xe8b37a, trim: 0xc98a4e },
  { sky: 0xffd9b0, lawn: 0x9bd46a, table: 0xf0a8a0, trim: 0xd67f76 },
  { sky: 0xc8ccff, lawn: 0x6fd0ae, table: 0xb9c3ff, trim: 0x8b97e8 },
  { sky: 0xb8f2e6, lawn: 0xa9de6a, table: 0xffd98a, trim: 0xe0ab4c },
];

const LAWN_RADIUS = 180;
const TABLE_DEPTH = 0.8;
const CORNERS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const;

/** Paints a piece one color, so many pieces can merge into a single draw call. */
function painted(geometry: BufferGeometry, color: number, at?: Matrix4): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (at) flat.applyMatrix4(at);
  const count = flat.getAttribute('position').count;
  const { r, g, b } = new Color(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([r, g, b], i * 3);
  flat.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  return flat;
}

const place = (x: number, y: number, z: number, scale = 1): Matrix4 =>
  new Matrix4().makeTranslation(x, y, z).multiply(new Matrix4().makeScale(scale, scale, scale));

function tree(x: number, z: number, scale: number, leaf: number): BufferGeometry[] {
  return [
    painted(new CylinderGeometry(0.4, 0.55, 2.4, 6), 0x9a6a40, place(x, LAWN_Y + 1.2 * scale, z, scale)),
    painted(new ConeGeometry(2.1, 4, 7), leaf, place(x, LAWN_Y + 4 * scale, z, scale)),
    painted(new ConeGeometry(1.6, 3.2, 7), leaf, place(x, LAWN_Y + 5.8 * scale, z, scale)),
  ];
}

function bush(x: number, z: number, scale: number, color: number): BufferGeometry {
  return painted(new DodecahedronGeometry(1.6, 0), color, place(x, LAWN_Y + 0.9 * scale, z, scale));
}

function cloud(x: number, y: number, z: number, scale: number): BufferGeometry[] {
  return [
    painted(new IcosahedronGeometry(2.2, 1), 0xffffff, place(x, y, z, scale)),
    painted(new IcosahedronGeometry(1.7, 1), 0xffffff, place(x + 2.6 * scale, y - 0.3, z, scale)),
    painted(new IcosahedronGeometry(1.5, 1), 0xffffff, place(x - 2.5 * scale, y - 0.4, z, scale)),
  ];
}

function scenery(): BufferGeometry {
  const pieces: BufferGeometry[] = [];
  const trees: [number, number, number, number][] = [
    [-26, -26, 1.5, 0x3fb56b],
    [-14, -36, 1.8, 0x35a58d],
    [8, -38, 1.5, 0x3fb56b],
    [24, -28, 1.9, 0x58c05a],
    [36, -10, 1.6, 0x35a58d],
    [-38, -8, 1.7, 0x58c05a],
    [-34, 12, 1.3, 0x3fb56b],
    [32, 14, 1.4, 0x3fb56b],
  ];
  for (const [x, z, scale, leaf] of trees) pieces.push(...tree(x, z, scale, leaf));
  pieces.push(bush(-18, -20, 1.2, 0x58c05a), bush(18, -22, 1.4, 0x4cb76b), bush(26, 2, 1.1, 0x58c05a), bush(-24, 2, 1.3, 0x4cb76b));
  for (const [x, z, color] of [
    [-12, 12, 0xff7fb6],
    [13, 10, 0xffd23f],
    [-16, -8, 0xffffff],
    [15, -12, 0xff9838],
  ] as const) {
    pieces.push(painted(new IcosahedronGeometry(0.35, 0), color, place(x, LAWN_Y + 0.4, z)));
  }
  pieces.push(...cloud(-22, 20, -40, 1.5), ...cloud(16, 26, -46, 1.9), ...cloud(40, 18, -30, 1.3), ...cloud(-44, 24, -22, 1.4));
  return mergeGeometries(pieces) ?? new BufferGeometry();
}

function tableGeometry(trim: number, top: number): BufferGeometry {
  const pieces = [painted(new BoxGeometry(2, 0.8, 2), top, new Matrix4().makeTranslation(0, -0.4, 0))];
  pieces.push(painted(new BoxGeometry(2.03, 0.26, 2.03), trim, new Matrix4().makeTranslation(0, -0.72, 0)));
  return mergeGeometries(pieces) ?? new BufferGeometry();
}

export interface WorldScene {
  setTable(half: number, theme: number): void;
}

/** The lawn, the sky and the table: everything that stays put, in a few draw calls. */
export function buildWorld(scene: Scene): WorldScene {
  const light = new DirectionalLight(0xffffff, 1.9);
  light.position.set(9, 16, 12);
  const hemisphere = new HemisphereLight(0xffffff, 0x8fbf8a, 1.75);
  scene.add(light, hemisphere);
  scene.fog = new Fog(0xa8e4ff, 40, 110);

  const lawnMaterial = new MeshLambertMaterial();
  const lawn = new Mesh(new CircleGeometry(LAWN_RADIUS, 32).rotateX(-Math.PI / 2), lawnMaterial);
  lawn.position.y = LAWN_Y;

  const flat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const things = new Mesh(scenery(), flat);

  const tableMaterial = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  let tableMesh = new Mesh(new BufferGeometry(), tableMaterial);
  const legMaterial = new MeshLambertMaterial({ flatShading: true });
  const legs = new InstancedMesh(new CylinderGeometry(0.42, 0.3, -LAWN_Y - TABLE_DEPTH, 7), legMaterial, 4);
  const tableShadow = new Mesh(
    new CircleGeometry(1, 24).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x1d2a3a, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  tableShadow.position.y = LAWN_Y + 0.01;
  scene.add(lawn, things, tableMesh, legs, tableShadow);

  let builtFor = -1;
  return {
    setTable(half, themeIndex) {
      const theme = THEMES[themeIndex % THEMES.length] ?? (THEMES[0] as Theme);
      scene.background = new Color(theme.sky);
      scene.fog = new Fog(theme.sky, 40, 110);
      lawnMaterial.color.setHex(theme.lawn);
      if (builtFor !== themeIndex % THEMES.length) {
        builtFor = themeIndex % THEMES.length;
        scene.remove(tableMesh);
        tableMesh.geometry.dispose();
        tableMesh = new Mesh(tableGeometry(theme.trim, theme.table), tableMaterial);
        scene.add(tableMesh);
      }
      tableMesh.scale.set(half, 1, half);
      legMaterial.color.setHex(theme.trim);
      const inset = half * 0.8;
      CORNERS.forEach(([x, z], leg) => legs.setMatrixAt(leg, new Matrix4().makeTranslation(x * inset, (LAWN_Y - TABLE_DEPTH) / 2, z * inset)));
      legs.instanceMatrix.needsUpdate = true;
      tableShadow.scale.set(half * 1.5, 1, half * 1.5);
    },
  };
}

