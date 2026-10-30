import { Color, InstancedMesh, MeshBasicMaterial, Object3D, OctahedronGeometry, type Scene } from 'three';

const CAPACITY = 180;
const GRAVITY = 3;

export interface Sparkles {
  spray(x: number, y: number, z: number, count: number, colors: readonly number[], speed: number, size: number, life?: number): void;
  update(seconds: number): void;
}

interface Sparkle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
}

export function createSparkles(scene: Scene): Sparkles {
  const mesh = new InstancedMesh(new OctahedronGeometry(1, 0), new MeshBasicMaterial({ color: 0xffffff }), CAPACITY);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const placer = new Object3D();
  const color = new Color();
  const all: Sparkle[] = Array.from({ length: CAPACITY }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 1, life: 0, size: 0 }));
  let next = 0;
  mesh.setColorAt(0, color.setHex(0xffffff));

  return {
    spray(x, y, z, count, colors, speed, size, life = 0.6) {
      for (let made = 0; made < count; made += 1) {
        const one = all[next];
        if (!one) return;
        one.x = x;
        one.y = y;
        one.z = z;
        one.vx = (Math.random() - 0.5) * speed;
        one.vy = (Math.random() - 0.3) * speed;
        one.vz = (Math.random() - 0.5) * speed;
        one.age = 0;
        one.life = life * (0.7 + Math.random() * 0.6);
        one.size = size * (0.6 + Math.random() * 0.7);
        mesh.setColorAt(next, color.setHex(colors[made % colors.length] ?? 0xffffff));
        next = (next + 1) % CAPACITY;
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    update(seconds) {
      all.forEach((one, index) => {
        if (one.age < one.life) {
          one.age += seconds;
          one.x += one.vx * seconds;
          one.y += one.vy * seconds;
          one.z += one.vz * seconds;
          one.vy -= GRAVITY * seconds;
        }
        const left = Math.max(1 - one.age / Math.max(one.life, 0.001), 0);
        placer.position.set(one.x, one.y, one.z);
        placer.rotation.set(one.age * 5, one.age * 7, 0);
        placer.scale.setScalar(one.size * left + 1e-4);
        placer.updateMatrix();
        mesh.setMatrixAt(index, placer.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
