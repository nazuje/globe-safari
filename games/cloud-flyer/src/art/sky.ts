import {
  BackSide,
  BufferAttribute,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { World } from '../worlds.ts';

const DOME_RADIUS = 500;
const FOG_NEAR = 130;
const FOG_FAR = 400;

export interface Sky {
  paint(world: World): void;
  follow(camera: PerspectiveCamera): void;
  /** The lights, for drawing the flyer pictures in the same light. */
  lights: Group;
}

function gradient(colors: Float32Array, heights: ArrayLike<number>, world: World): void {
  const top = new Color(world.skyTop);
  const middle = new Color(world.skyMid);
  const low = new Color(world.skyLow);
  const mixed = new Color();
  for (let index = 0; index < heights.length; index += 1) {
    const height = (heights[index] ?? 0) / DOME_RADIUS;
    if (height > 0.25) mixed.lerpColors(middle, top, Math.min((height - 0.25) / 0.6, 1));
    else if (height > -0.05) mixed.lerpColors(low, middle, (height + 0.05) / 0.3);
    else mixed.copy(low);
    colors.set([mixed.r, mixed.g, mixed.b], index * 3);
  }
}

export function createSky(scene: Scene): Sky {
  const shape = new SphereGeometry(DOME_RADIUS, 20, 16);
  const position = shape.getAttribute('position');
  const heights = Array.from({ length: position.count }, (_, index) => position.getY(index));
  const colors = new Float32Array(position.count * 3);
  shape.setAttribute('color', new BufferAttribute(colors, 3));
  const dome = new Mesh(shape, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -2;

  const glow = new MeshBasicMaterial({ fog: false, depthWrite: false, transparent: true, opacity: 0.35 });
  const face = new MeshBasicMaterial({ fog: false, depthWrite: false });
  const halo = new Mesh(new CircleGeometry(40, 24), glow);
  const disc = new Mesh(new CircleGeometry(24, 24), face);
  const sun = new Group();
  sun.add(halo, disc);
  halo.renderOrder = -1;
  disc.renderOrder = -1;
  sun.position.set(-130, 120, -440);
  sun.lookAt(0, 0, 0);

  const holder = new Group();
  holder.add(dome, sun);
  scene.add(holder);

  const hemi = new HemisphereLight();
  const light = new DirectionalLight();
  light.position.set(-60, 90, 40);
  const lights = new Group();
  lights.add(hemi, light);
  scene.add(lights);
  scene.fog = new Fog(0xffffff, FOG_NEAR, FOG_FAR);

  return {
    lights,
    paint(world) {
      gradient(colors, heights, world);
      shape.getAttribute('color').needsUpdate = true;
      glow.color.setHex(world.disc);
      face.color.setHex(world.discHigh);
      hemi.color.setHex(world.hemiSky);
      hemi.groundColor.setHex(world.hemiGround);
      hemi.intensity = world.hemiPower;
      light.color.setHex(world.sun);
      light.intensity = world.sunPower;
      if (scene.fog instanceof Fog) scene.fog.color.setHex(world.fog);
    },
    follow(camera) {
      holder.position.copy(camera.position);
    },
  };
}
