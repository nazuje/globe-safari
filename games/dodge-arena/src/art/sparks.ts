import { AdditiveBlending, Color, MeshBasicMaterial, TetrahedronGeometry, type Scene } from 'three';
import { Pool } from './pool.ts';

const MOST = 140;
const GRAVITY = 9;

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  color: Color;
}

export interface Sparks {
  burst(x: number, z: number, color: string, count: number, speed?: number): void;
  update(seconds: number): void;
}

/** Small glowing bits for bonks, pops and landings, all in one draw call. */
export function createSparks(scene: Scene): Sparks {
  const pool = new Pool(scene, new TetrahedronGeometry(1, 0), new MeshBasicMaterial({ color: '#ffffff', blending: AdditiveBlending, transparent: true, depthWrite: false }), MOST);
  const sparks: Spark[] = [];
  const tint = new Color();

  return {
    burst(x, z, color, count, speed = 6) {
      const paint = new Color(color);
      for (let at = 0; at < count && sparks.length < MOST; at += 1) {
        const angle = Math.random() * Math.PI * 2;
        const pace = speed * (0.4 + Math.random() * 0.8);
        sparks.push({ x, y: 0.5, z, vx: Math.cos(angle) * pace, vy: 2 + Math.random() * 4, vz: Math.sin(angle) * pace, age: 0, life: 0.4 + Math.random() * 0.4, size: 0.1 + Math.random() * 0.14, color: paint });
      }
    },
    update(seconds) {
      pool.begin();
      for (let at = sparks.length - 1; at >= 0; at -= 1) {
        const spark = sparks[at] as Spark;
        spark.age += seconds;
        if (spark.age >= spark.life) {
          sparks.splice(at, 1);
          continue;
        }
        spark.vy -= GRAVITY * seconds;
        spark.x += spark.vx * seconds;
        spark.y = Math.max(0.05, spark.y + spark.vy * seconds);
        spark.z += spark.vz * seconds;
        const left = 1 - spark.age / spark.life;
        pool.add(spark.x, spark.y, spark.z, spark.size, spark.size, spark.size, spark.age * 8, tint.copy(spark.color).multiplyScalar(left));
      }
      pool.end();
    },
  };
}
