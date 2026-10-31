import {
  BoxGeometry,
  BufferAttribute,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Scene,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { leapHeight, type Player } from '../run.ts';
import { BLINK_SECONDS } from '../tuning.ts';

const BONK_SQUASH_SECONDS = 0.35;
const HERO_SCALE = 1.25;

function painted(geometry: BufferGeometry, color: string): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const { count } = flat.getAttribute('position');
  const paint = new Color(color);
  const colors = new Float32Array(count * 3);
  for (let at = 0; at < count; at += 1) colors.set([paint.r, paint.g, paint.b], at * 3);
  flat.setAttribute('color', new BufferAttribute(colors, 3));
  flat.deleteAttribute('uv');
  return flat;
}

function heroBody(): BufferGeometry {
  const parts = [
    painted(new IcosahedronGeometry(0.62, 1).scale(1, 1.1, 0.95).translate(0, 0.72, 0), '#ff5fb1'),
    painted(new SphereGeometry(0.34, 10, 6).scale(1.15, 0.72, 0.5).translate(0, 0.88, 0.48), '#e9fbff'),
    painted(new SphereGeometry(0.1, 6, 4).translate(-0.15, 0.9, 0.62), '#1a1147'),
    painted(new SphereGeometry(0.1, 6, 4).translate(0.15, 0.9, 0.62), '#1a1147'),
    painted(new CylinderGeometry(0.03, 0.03, 0.42, 5).translate(0, 1.55, 0), '#e9fbff'),
    painted(new SphereGeometry(0.12, 6, 4).translate(0, 1.8, 0), '#ffe23d'),
    painted(new ConeGeometry(0.2, 0.34, 5).translate(0, -0.1, -0.1).rotateX(-1).translate(0, 0.6, -0.6), '#35e8ff'),
  ];
  return mergeGeometries(parts);
}

export interface Hero {
  group: Group;
  update(player: Player, seconds: number, clock: number, calm: boolean, flopped: boolean): void;
}

/** A small round space-suited explorer, gender-neutral and easy to spot: the only pink thing on the floor. */
export function createHero(scene: Scene): Hero {
  const group = new Group();
  const body = new Group();
  body.add(new Mesh(heroBody(), new MeshStandardMaterial({ vertexColors: true, emissive: '#5a1140', emissiveIntensity: 0.5, flatShading: true, roughness: 0.45 })));
  const footMaterial = new MeshStandardMaterial({ color: '#35e8ff', emissive: '#0a6a7a', flatShading: true });
  const footShape = new BoxGeometry(0.22, 0.2, 0.36);
  const left = new Mesh(footShape, footMaterial);
  const right = new Mesh(footShape, footMaterial);
  left.position.set(-0.24, 0.1, 0);
  right.position.set(0.24, 0.1, 0);
  body.add(left, right);
  group.add(body);
  body.scale.setScalar(HERO_SCALE);
  const shadow = new Mesh(new CircleGeometry(0.62, 20).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.position.y = 0.03;
  const marker = new Mesh(new CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#ff5fb1', transparent: true, opacity: 0.22, depthWrite: false }));
  marker.position.y = 0.025;
  const shield = new Mesh(new IcosahedronGeometry(1.5, 1), new MeshBasicMaterial({ color: '#35e8ff', transparent: true, opacity: 0.25, depthWrite: false }));
  shield.position.y = 0.9;
  shield.visible = false;
  group.add(shield);
  scene.add(group, shadow, marker);

  let stride = 0;
  let squash = 0;
  let lastBlink = 0;

  return {
    group,
    update(player, seconds, clock, calm, flopped) {
      const height = leapHeight(player.air);
      group.position.set(player.x, height, player.z);
      shadow.position.x = marker.position.x = player.x;
      shadow.position.z = marker.position.z = player.z;
      const shrink = 1 - (height / 2) * 0.5;
      shadow.scale.setScalar(shrink);
      group.rotation.y = Math.atan2(player.faceX, player.faceZ);
      const speed = Math.hypot(player.vx, player.vz);
      stride += seconds * speed * 2.4;
      const swing = height > 0 || calm ? 0 : Math.sin(stride) * Math.min(speed / 7, 1);
      left.position.z = swing * 0.26;
      right.position.z = -swing * 0.26;
      left.position.y = 0.1 + Math.max(0, swing) * 0.12;
      right.position.y = 0.1 + Math.max(0, -swing) * 0.12;
      body.rotation.x = Math.min(speed / 7, 1) * 0.22;
      if (player.blink > lastBlink && player.blink > BLINK_SECONDS - 0.1) squash = BONK_SQUASH_SECONDS;
      lastBlink = player.blink;
      squash = Math.max(0, squash - seconds);
      const flat = calm ? 0 : squash / BONK_SQUASH_SECONDS;
      const spinFlip = height > 0.05 && !calm ? (player.air / 0.6) * Math.PI * 2 : 0;
      body.rotation.x += spinFlip;
      body.scale.set(HERO_SCALE * (1 + flat * 0.5), HERO_SCALE * (1 - flat * 0.55), HERO_SCALE * (1 + flat * 0.5));
      // The last bonk leaves them flat on their back, feet up.
      if (flopped) body.rotation.x = -1.4;
      const blinking = !flopped && player.blink > 0 && Math.floor(clock * (calm ? 5 : 12)) % 2 === 0;
      body.visible = !blinking;
      shield.visible = player.shield > 0;
      shield.rotation.y = clock;
    },
  };
}
