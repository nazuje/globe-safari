import { Color, InstancedMesh, Matrix4, Object3D, Quaternion, Vector3, type BufferGeometry, type Material, type Scene } from 'three';

const holder = new Object3D();
const place = new Vector3();
const size = new Vector3();
const turn = new Quaternion();
const matrix = new Matrix4();

/** One draw call however many are on screen. Filled from scratch each frame. */
export class Pool {
  readonly mesh: InstancedMesh;
  private used = 0;

  constructor(scene: Scene, geometry: BufferGeometry, material: Material, capacity: number) {
    this.mesh = new InstancedMesh(geometry, material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.setColorAt(0, new Color('#ffffff'));
    this.mesh.count = 0;
    scene.add(this.mesh);
  }

  begin(): void {
    this.used = 0;
  }

  /** Adds one, with a rotation already set on `from` or a plain turn about the vertical. */
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw: number, color: Color, tilt = 0): void {
    if (this.used >= this.mesh.instanceMatrix.count) return;
    holder.rotation.set(tilt, yaw, 0);
    turn.setFromEuler(holder.rotation);
    matrix.compose(place.set(x, y, z), turn, size.set(sx, sy, sz));
    this.mesh.setMatrixAt(this.used, matrix);
    this.mesh.setColorAt(this.used, color);
    this.used += 1;
  }

  end(): void {
    this.mesh.count = this.used;
    this.mesh.visible = this.used > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
