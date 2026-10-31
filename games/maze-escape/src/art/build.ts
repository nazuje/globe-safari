import { BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Euler, IcosahedronGeometry, Matrix4, MeshLambertMaterial, OctahedronGeometry, Quaternion, Vector3 } from 'three';

/** One flat-shaded colour-per-vertex material, so a whole character draws in a single call. */
export const paintedMaterial = (): MeshLambertMaterial => new MeshLambertMaterial({ vertexColors: true, flatShading: true });

const solids = (geometry: BufferGeometry): Float32Array => {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  return new Float32Array(flat.getAttribute('position').array);
};

/** The handful of low-poly solids every toy here is stacked from. */
export const SHAPES = {
  ball: solids(new IcosahedronGeometry(1, 2)),
  lump: solids(new IcosahedronGeometry(1, 1)),
  gem: solids(new OctahedronGeometry(1, 0)),
  cone: solids(new ConeGeometry(1, 1, 8)),
  drum: solids(new CylinderGeometry(1, 1, 1, 12)),
  box: solids(new BoxGeometry(1, 1, 1)),
};

export interface Place {
  x?: number;
  y?: number;
  z?: number;
  /** One number for all three sizes, or give sx, sy and sz. */
  s?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

const matrix = new Matrix4();
const spot = new Vector3();
const size = new Vector3();
const twist = new Quaternion();
const angles = new Euler();
const tint = new Color();

/** A growing pile of triangles, stacked into one geometry when finished. */
export class Pile {
  private positions: number[] = [];
  private colors: number[] = [];

  add(shape: Float32Array, place: Place, hex: number): this {
    const { x = 0, y = 0, z = 0, s = 1, sx = s, sy = s, sz = s, rx = 0, ry = 0, rz = 0 } = place;
    matrix.compose(spot.set(x, y, z), twist.setFromEuler(angles.set(rx, ry, rz)), size.set(sx, sy, sz));
    tint.setHex(hex);
    for (let index = 0; index < shape.length; index += 3) {
      spot.set(shape[index] ?? 0, shape[index + 1] ?? 0, shape[index + 2] ?? 0).applyMatrix4(matrix);
      this.positions.push(spot.x, spot.y, spot.z);
      this.colors.push(tint.r, tint.g, tint.b);
    }
    return this;
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    geometry.computeVertexNormals();
    return geometry;
  }
}
