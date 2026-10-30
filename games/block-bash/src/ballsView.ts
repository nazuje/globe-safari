import { BufferGeometry, Color, Float32BufferAttribute, IcosahedronGeometry, Mesh, MeshLambertMaterial, Scene, Vector3 } from 'three';
import type { BallId } from './balls.ts';
import type { ThrownView } from './physics.ts';

type Painter = (point: Vector3) => number;

const PAINTERS: Record<BallId, Painter> = {
  bowling: (p) => {
    const hole = [new Vector3(0.2, 0.75, 0.6), new Vector3(-0.2, 0.75, 0.6), new Vector3(0, 0.55, 0.82)];
    return hole.some((spot) => spot.distanceTo(p) < 0.17) ? 0x17112b : 0x5b3fd6;
  },
  beach: (p) => {
    const wedge = Math.floor(((Math.atan2(p.z, p.x) + Math.PI) / (Math.PI * 2)) * 6) % 6;
    if (Math.abs(p.y) > 0.86) return 0xffffff;
    return [0xff5f5f, 0xffffff, 0xffd23f, 0xffffff, 0x4a9bff, 0xffffff][wedge] ?? 0xffffff;
  },
  tiny: (p) => (p.y > 0.3 ? 0xffe27a : 0xf2b632),
  slime: (p) => (Math.sin(p.x * 7) * Math.sin(p.y * 6) * Math.sin(p.z * 5) > 0.2 ? 0xa6f06a : 0x62d84a),
  basket: (p) => {
    const seam = Math.abs(p.y) < 0.07 || Math.abs(p.x) < 0.07 || Math.abs(Math.hypot(p.x, p.y) - 0.72) < 0.06;
    return seam ? 0x402010 : 0xf0822e;
  },
};

function ballGeometry(id: BallId): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 4);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const paint = PAINTERS[id];
  const color = new Color();
  const corner = new Vector3();
  for (let face = 0; face < position.count; face += 3) {
    const middle = new Vector3();
    for (let i = 0; i < 3; i += 1) middle.add(corner.fromBufferAttribute(position, face + i));
    color.setHex(paint(middle.divideScalar(3).normalize()));
    for (let i = 0; i < 3; i += 1) colors.set([color.r, color.g, color.b], (face + i) * 3);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

export interface BallsView {
  sync(balls: readonly ThrownView[]): void;
  clear(): void;
}

/** One mesh per flying ball, and there are never more than a few. Shapes are shared. */
export function createBallsView(scene: Scene): BallsView {
  const material = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const geometries = new Map<BallId, BufferGeometry>();
  const meshes: Mesh[] = [];

  function shapeFor(id: BallId): BufferGeometry {
    const known = geometries.get(id);
    if (known) return known;
    const made = ballGeometry(id);
    geometries.set(id, made);
    return made;
  }

  return {
    sync(balls) {
      balls.forEach(({ ball, position, quaternion }, index) => {
        let mesh = meshes[index];
        if (!mesh) {
          mesh = new Mesh(shapeFor(ball.id), material);
          mesh.scale.setScalar(ball.radius);
          meshes[index] = mesh;
          scene.add(mesh);
        }
        mesh.position.set(position.x, position.y, position.z);
        mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      });
    },
    clear() {
      for (const mesh of meshes.splice(0)) scene.remove(mesh);
    },
  };
}
