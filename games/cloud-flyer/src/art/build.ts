import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  BoxGeometry,
} from 'three';

/** One flat-shaded, colour-per-vertex material lets a whole island chain draw in a single call. */
export const paintedMaterial = (): MeshLambertMaterial => new MeshLambertMaterial({ vertexColors: true, flatShading: true });

const solids = (geometry: BufferGeometry): Float32Array => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute('position');
  return new Float32Array(position.array);
};

/** The handful of low-poly solids everything in the world is stacked from, as plain triangles. */
export const SHAPES = {
  blob: solids(new IcosahedronGeometry(1, 1)),
  lump: solids(new IcosahedronGeometry(1, 0)),
  cone: solids(new ConeGeometry(1, 1, 7)),
  drum: solids(new CylinderGeometry(1, 1, 1, 7)),
  /** Wide at the top, a point at the bottom: the underside of a floating island. */
  keel: solids(new ConeGeometry(1, 1, 8).rotateX(Math.PI)),
  plate: solids(new CylinderGeometry(1, 0.92, 1, 9)),
  box: solids(new BoxGeometry(1, 1, 1)),
};

const up = new Vector3(0, 1, 0);
const spot = new Vector3();
const twist = new Quaternion();
const stretch = new Vector3();
const matrix = new Matrix4();
const tint = new Color();

export interface Place {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy?: number;
  sz?: number;
  turn?: number;
}

/** A growing pile of triangles, stacked into one geometry when finished. */
export class Pile {
  private positions: number[] = [];
  private colors: number[] = [];
  private random: () => number;

  constructor(random: () => number) {
    this.random = random;
  }

  /** Adds a shape in one colour, with each face a touch lighter or darker, which is what makes low-poly look hand-cut. */
  add(shape: Float32Array, { x, y, z, sx, sy = sx, sz = sx, turn = 0 }: Place, hex: number, rough = 0): void {
    matrix.compose(spot.set(x, y, z), twist.setFromAxisAngle(up, turn), stretch.set(sx, sy, sz));
    tint.setHex(hex);
    const { positions, colors, random } = this;
    const base = positions.length;
    for (let index = 0; index < shape.length; index += 3) {
      const a = shape[index] ?? 0;
      const b = shape[index + 1] ?? 0;
      const c = shape[index + 2] ?? 0;
      // Rough edges come from the corner's own position, so neighbouring faces stay joined.
      const push = rough === 0 ? 1 : 1 + rough * Math.sin(a * 12.9 + b * 78.2 + c * 37.7 + x);
      spot.set(a * push, b * (rough === 0 ? 1 : 1 + rough * 0.5 * Math.cos(a * 41 + c * 17 + z)), c * push).applyMatrix4(matrix);
      positions.push(spot.x, spot.y, spot.z);
    }
    for (let face = base; face < positions.length; face += 9) {
      const shade = 1 + (random() - 0.5) * 0.12;
      for (let corner = 0; corner < 3; corner += 1) colors.push(tint.r * shade, tint.g * shade, tint.b * shade);
    }
  }

  get empty(): boolean {
    return this.positions.length === 0;
  }

  finish(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    geometry.computeBoundingSphere();
    return geometry;
  }
}
