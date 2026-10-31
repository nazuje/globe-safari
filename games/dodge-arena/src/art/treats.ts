import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type Scene,
} from 'three';
import type { Pickup, Ufo } from '../run.ts';

export interface Treats {
  update(pickups: readonly Pickup[], ufo: Ufo | null, clock: number, calm: boolean): void;
}

function heartShape(): ExtrudeGeometry {
  const shape = new Shape();
  shape.moveTo(0, -0.6);
  shape.bezierCurveTo(-1.1, 0.1, -0.6, 0.85, 0, 0.35);
  shape.bezierCurveTo(0.6, 0.85, 1.1, 0.1, 0, -0.6);
  return new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.15);
}

function buildUfo(): Group {
  const saucer = new Group();
  const hull = new Mesh(new CylinderGeometry(0.5, 1.9, 0.5, 10), new MeshStandardMaterial({ color: '#d9e6ff', emissive: '#4466aa', emissiveIntensity: 0.5, flatShading: true }));
  const dome = new Mesh(new IcosahedronGeometry(0.75, 1), new MeshBasicMaterial({ color: '#7dffb2' }));
  dome.position.y = 0.4;
  const beam = new Mesh(new CylinderGeometry(0.3, 1.6, 6, 12, 1, true), new MeshBasicMaterial({ color: '#7dffb2', transparent: true, opacity: 0.2, depthWrite: false, side: 2 }));
  beam.position.y = -3.2;
  saucer.add(hull, dome, beam);
  return saucer;
}

/** The rare good things: heart, slow-motion orb and a friendly UFO. */
export function createTreats(scene: Scene): Treats {
  const heart = new Mesh(heartShape(), new MeshStandardMaterial({ color: '#ff3b6b', emissive: '#a01238', emissiveIntensity: 0.8, flatShading: true }));
  const orb = new Group();
  orb.add(new Mesh(new SphereGeometry(0.55, 12, 8), new MeshBasicMaterial({ color: '#8fd8ff' })));
  const hoop = new Mesh(new TorusGeometry(0.85, 0.07, 6, 20), new MeshBasicMaterial({ color: '#ffffff' }));
  orb.add(hoop);
  const ufoArt = buildUfo();
  heart.visible = orb.visible = ufoArt.visible = false;
  scene.add(heart, orb, ufoArt);

  return {
    update(pickups, ufo, clock, calm) {
      heart.visible = orb.visible = false;
      const bob = calm ? 0 : Math.sin(clock * 4) * 0.15;
      for (const pickup of pickups) {
        const art = pickup.kind === 'heart' ? heart : orb;
        art.visible = pickup.left > 2 || Math.floor(clock * 6) % 2 === 0;
        art.position.set(pickup.x, 1 + bob, pickup.z);
        art.rotation.y = clock * 2;
        hoop.rotation.x = clock * 3;
      }
      ufoArt.visible = ufo !== null;
      if (ufo) {
        ufoArt.position.set(ufo.x, 6 + bob, ufo.z);
        ufoArt.rotation.y = clock * 2.5;
      }
    },
  };
}
