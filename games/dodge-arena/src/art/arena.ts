import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type Scene,
} from 'three';
import { ARENA_RADIUS } from '../tuning.ts';

const HEX = 1.05;
const DARK = new Color('#1a1147');
const DARK_2 = new Color('#231a63');
const PULSE_SECONDS = 1.4;
const PULSE_SPEED = 26;
const STAR_COUNT = 500;
const ROCK_COUNT = 16;

export interface Arena {
  /** Sends a ring of colour across the floor from the middle. The signature of a new wave. */
  pulse(color: string): void;
  update(seconds: number, clock: number, calm: boolean, rim: string): void;
}

function hexCentres(): { x: number; z: number }[] {
  const centres: { x: number; z: number }[] = [];
  const across = Math.sqrt(3) * HEX;
  const down = 1.5 * HEX;
  const rows = Math.ceil(ARENA_RADIUS / down) + 1;
  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -rows; column <= rows; column += 1) {
      const x = (column + (row % 2 ? 0.5 : 0)) * across;
      const z = row * down;
      if (Math.hypot(x, z) < ARENA_RADIUS - 0.3) centres.push({ x, z });
    }
  }
  return centres;
}

function addStars(scene: Scene): void {
  const places = new Float32Array(STAR_COUNT * 3);
  for (let star = 0; star < STAR_COUNT; star += 1) {
    const angle = star * 2.399;
    const up = (star / STAR_COUNT) * 2 - 1;
    const wide = Math.sqrt(1 - up * up);
    places[star * 3] = Math.cos(angle) * wide * 110;
    places[star * 3 + 1] = up * 110 - 10;
    places[star * 3 + 2] = Math.sin(angle) * wide * 110;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(places, 3));
  scene.add(new Points(geometry, new PointsMaterial({ color: '#cfe0ff', size: 2.2, sizeAttenuation: false, fog: false })));
}

function addPlanet(scene: Scene): void {
  const planet = new Mesh(
    new IcosahedronGeometry(9, 1),
    new MeshStandardMaterial({ color: '#ff4fa3', emissive: '#7a1650', flatShading: true, roughness: 0.8, fog: false }),
  );
  planet.position.set(-30, -18, -38);
  const hoop = new Mesh(new TorusGeometry(13.5, 0.5, 4, 40), new MeshBasicMaterial({ color: '#ffb347', fog: false }));
  hoop.rotation.set(1.2, 0.3, 0);
  hoop.scale.z = 0.25;
  planet.add(hoop);
  scene.add(planet);
}

function addRocks(scene: Scene): InstancedMesh {
  const rocks = new InstancedMesh(new DodecahedronGeometry(1, 0), new MeshStandardMaterial({ color: '#3a2f7c', emissive: '#1a1147', flatShading: true }), ROCK_COUNT);
  const holder = new Object3D();
  for (let rock = 0; rock < ROCK_COUNT; rock += 1) {
    const angle = rock * 1.7;
    const distance = ARENA_RADIUS + 7 + (rock * 37) % 16;
    holder.position.set(Math.cos(angle) * distance, -6 - (rock * 53) % 12, Math.sin(angle) * distance);
    holder.rotation.set(rock, rock * 2, 0);
    holder.scale.setScalar(0.5 + (rock % 5) * 0.4);
    holder.updateMatrix();
    rocks.setMatrixAt(rock, holder.matrix);
  }
  scene.add(rocks);
  return rocks;
}

/** A round glowing floor of hexagons, floating in space. */
export function createArena(scene: Scene): Arena {
  const centres = hexCentres();
  const tiles = new InstancedMesh(
    new CylinderGeometry(HEX * 0.96, HEX * 0.96, 0.4, 6),
    new MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.55, metalness: 0.1 }),
    centres.length,
  );
  const holder = new Object3D();
  centres.forEach(({ x, z }, at) => {
    holder.position.set(x, -0.2, z);
    holder.updateMatrix();
    tiles.setMatrixAt(at, holder.matrix);
    tiles.setColorAt(at, at % 3 === 0 ? DARK_2 : DARK);
  });
  scene.add(tiles);

  const base = new Mesh(new CylinderGeometry(ARENA_RADIUS + 0.1, 2.5, 7, 12, 2), new MeshStandardMaterial({ color: '#241a58', emissive: '#150c3f', flatShading: true }));
  base.position.y = -3.9;
  const shelf = new Mesh(new CylinderGeometry(ARENA_RADIUS + 0.1, ARENA_RADIUS + 0.1, 0.36, 48), new MeshBasicMaterial({ color: '#0b0730' }));
  shelf.position.y = -0.22;
  const rimMaterial = new MeshBasicMaterial({ color: '#35e8ff' });
  const rim = new Mesh(new TorusGeometry(ARENA_RADIUS, 0.14, 6, 64), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.04;
  const haloMaterial = new MeshBasicMaterial({ color: '#35e8ff', transparent: true, opacity: 0.2, blending: AdditiveBlending, depthWrite: false });
  const halo = new Mesh(new RingGeometry(ARENA_RADIUS, ARENA_RADIUS + 1.5, 64), haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.1;
  const glowDot = new Mesh(new SphereGeometry(0.6, 8, 6), new MeshBasicMaterial({ color: '#35e8ff' }));
  glowDot.position.y = -7.8;
  scene.add(base, shelf, rim, halo, glowDot);

  addStars(scene);
  addPlanet(scene);
  const rocks = addRocks(scene);

  let pulseAge = PULSE_SECONDS;
  const pulseColor = new Color('#35e8ff');
  const tint = new Color();
  const rimNow = new Color('#35e8ff');
  const rimGoal = new Color();
  let dirty = false;

  function paint(calm: boolean): void {
    const front = pulseAge * PULSE_SPEED;
    const fade = 1 - pulseAge / PULSE_SECONDS;
    centres.forEach(({ x, z }, at) => {
      const away = Math.abs(Math.hypot(x, z) - front);
      const glow = (calm ? 0.2 : Math.max(0, 1 - away / 3.2)) * fade;
      tiles.setColorAt(at, tint.copy(at % 3 === 0 ? DARK_2 : DARK).lerp(pulseColor, glow));
    });
    if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
  }

  return {
    pulse(color) {
      pulseColor.set(color);
      pulseAge = 0;
      dirty = true;
    },
    update(seconds, _clock, calm, rimColor) {
      if (!calm) rocks.rotation.y += seconds * 0.02;
      rimNow.lerp(rimGoal.set(rimColor), Math.min(1, seconds * 3));
      rimMaterial.color.copy(rimNow);
      haloMaterial.color.copy(rimNow);
      if (pulseAge < PULSE_SECONDS) {
        pulseAge += seconds;
        paint(calm);
      } else if (dirty) {
        dirty = false;
        paint(calm);
      }
    },
  };
}
