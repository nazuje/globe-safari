import { AdditiveBlending, CanvasTexture, CircleGeometry, Color, DoubleSide, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry, Sprite, SpriteMaterial, type Material } from 'three';
import type { CharacterId } from '../characters.ts';
import type { Level } from '../level.ts';
import type { Robot } from '../robots.ts';
import type { Run } from '../run.ts';
import { paintedMaterial } from './build.ts';
import { buildDisguise, buildHero, EYE, ROBOT_HEIGHT, robotPile } from './heroes.ts';

const dummy = new Object3D();
const FACE_CAMERA = 0;
/** Toys look bigger than the room they take up, so a child can always find them. */
const HERO_SCALE = 1.25;
const ROBOT_SCALE = 1.15;

function markTexture(mark: string, color: string, ink: string): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const paint = canvas.getContext('2d');
  if (!paint) return null;
  paint.fillStyle = color;
  paint.strokeStyle = '#ffffff';
  paint.lineWidth = 8;
  paint.beginPath();
  paint.arc(64, 64, 56, 0, Math.PI * 2);
  paint.fill();
  paint.stroke();
  paint.font = '700 92px Fredoka, system-ui, sans-serif';
  paint.textAlign = 'center';
  paint.textBaseline = 'middle';
  paint.fillStyle = ink;
  paint.fillText(mark, 64, 68);
  return new CanvasTexture(canvas);
}

function markSprite(mark: string, color: string, ink: string, group: Group): Sprite {
  const sprite = new Sprite(new SpriteMaterial({ map: markTexture(mark, color, ink), depthTest: false, transparent: true }));
  sprite.scale.setScalar(1.05);
  sprite.visible = false;
  sprite.renderOrder = 5;
  group.add(sprite);
  return sprite;
}

export interface Actors {
  update(run: Run, clock: number, seconds: number, calm: boolean): void;
  /** Puts everyone back for a fresh try. */
  reset(): void;
  dispose(): void;
}

/** Turns from a heading on the maze to the model's own rotation. Models look along +z. */
const modelTurn = (facing: number): number => Math.PI / 2 - facing;

export function createActors(host: Group, level: Level, character: CharacterId): Actors {
  const group = new Group();
  host.add(group);
  const robots = level.robots.length;

  const shadows = new InstancedMesh(new CircleGeometry(0.42, 18).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }), robots + 1);
  shadows.instanceMatrix.setUsage(DynamicDrawUsage);
  shadows.frustumCulled = false;
  group.add(shadows);

  const ring = new Mesh(new RingGeometry(0.44, 0.54, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  group.add(ring);

  const hero = buildHero(character);
  const disguise = buildDisguise();
  group.add(hero, disguise);
  disguise.visible = false;

  const stars = new InstancedMesh(new OctahedronGeometry(0.11, 0).scale(1, 1, 0.5), new MeshBasicMaterial({ color: 0xffe45c }), 5);
  stars.visible = false;
  stars.frustumCulled = false;
  group.add(stars);

  const robotMaterial = paintedMaterial();
  const bodies = new InstancedMesh(robotPile().build(), robotMaterial, Math.max(robots, 1));
  bodies.count = robots;
  bodies.frustumCulled = false;
  bodies.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(bodies);
  const pupilColor = new Color();
  const pupils = new InstancedMesh(new IcosahedronGeometry(0.1, 1), new MeshBasicMaterial({ color: 0xffffff }), Math.max(robots * 2, 1));
  pupils.count = robots * 2;
  pupils.frustumCulled = false;
  pupils.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(pupils);
  // A bright ring on the floor, so a robot's outline stands out on any level's colours.
  const halos = new InstancedMesh(new RingGeometry(0.46, 0.6, 28).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }), Math.max(robots, 1));
  halos.count = robots;
  halos.frustumCulled = false;
  halos.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(halos);

  const shouts = level.robots.map(() => ({ alert: markSprite('!', '#ff2e4d', '#ffffff', group), lost: markSprite('?', '#ffe45c', '#2a1a40', group) }));
  let bob = 0;

  function drawRobot(robot: Robot, index: number, clock: number, calm: boolean): void {
    const wiggle = calm ? 0 : Math.sin(clock * 9 + index * 2);
    const dancing = robot.mode === 'dance';
    const jump = dancing && !calm ? Math.abs(Math.sin(clock * 8 + index)) * 0.3 : Math.abs(wiggle) * 0.03;
    const spin = dancing && !calm ? clock * 7 : modelTurn(robot.facing);
    const lean = dancing ? Math.sin(clock * 8) * 0.3 : robot.mode === 'confused' ? Math.sin(clock * 6) * 0.3 : wiggle * 0.05;
    dummy.position.set(robot.x, jump, robot.y);
    dummy.rotation.set(0, spin, lean, 'YXZ');
    dummy.scale.setScalar(ROBOT_SCALE);
    dummy.updateMatrix();
    bodies.setMatrixAt(index, dummy.matrix);
    dummy.position.set(robot.x, 0.01, robot.y);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1.2, 1, 1.2);
    dummy.updateMatrix();
    shadows.setMatrixAt(index + 1, dummy.matrix);
    dummy.scale.setScalar(1);
    dummy.position.y = 0.025;
    dummy.updateMatrix();
    halos.setMatrixAt(index, dummy.matrix);
    drawPupils(robot, index, jump, spin, clock);
    const shout = shouts[index];
    if (!shout) return;
    const alarmed = robot.mode === 'alert' || robot.mode === 'chase';
    shout.alert.visible = alarmed;
    shout.lost.visible = robot.mode === 'confused';
    for (const sprite of [shout.alert, shout.lost]) sprite.position.set(robot.x, ROBOT_HEIGHT + 0.7, robot.y - 0.42);
  }

  function drawPupils(robot: Robot, index: number, jump: number, spin: number, clock: number): void {
    const startled = robot.mode === 'alert' || robot.mode === 'chase';
    pupilColor.set(startled ? 0xff2040 : 0x161230);
    for (const side of [0, 1]) {
      const sign = side === 0 ? -1 : 1;
      const goofy = robot.mode === 'confused' ? Math.sin(clock * 12 + side) * 0.05 : 0;
      const x = (EYE.x * sign + goofy) * ROBOT_SCALE;
      const z = EYE.z * ROBOT_SCALE;
      dummy.position.set(robot.x + Math.sin(spin) * z + Math.cos(spin) * x, jump + EYE.y * ROBOT_SCALE, robot.y + Math.cos(spin) * z - Math.sin(spin) * x);
      dummy.rotation.set(0, spin, 0);
      dummy.scale.setScalar(startled ? 1.25 : 1);
      dummy.updateMatrix();
      pupils.setMatrixAt(index * 2 + side, dummy.matrix);
      pupils.setColorAt(index * 2 + side, pupilColor);
    }
  }

  function drawHero(run: Run, clock: number, seconds: number, calm: boolean): void {
    const boxed = run.boxLeft > 0;
    const lost = run.phase === 'lost';
    bob = run.moving && !calm ? bob + seconds * 15 : 0;
    const hop = lost ? 0 : Math.abs(Math.sin(bob)) * 0.14;
    const turn = run.moving || lost ? modelTurn(run.facing) : FACE_CAMERA;
    const waddle = lost ? 0 : Math.sin(bob) * 0.12;
    hero.visible = !boxed;
    hero.position.set(run.x, hop, run.y);
    hero.rotation.set(lost ? -0.25 : 0, lost ? FACE_CAMERA : turn, waddle, 'YXZ');
    hero.scale.set(HERO_SCALE, HERO_SCALE * (lost ? 0.72 : 1), HERO_SCALE);
    disguise.visible = boxed;
    const running = run.boxLeft < 1.6 && Math.sin(clock * 14) > 0.2;
    disguise.position.set(run.x, hop * 0.5, run.y);
    disguise.rotation.y = run.moving ? modelTurn(run.facing) : 0;
    disguise.scale.setScalar(boxed && running ? 1.08 : 1);
    ring.position.set(run.x, 0.02, run.y);
    ring.scale.setScalar(calm ? 1 : 1 + Math.sin(clock * 4) * 0.07);
    ring.visible = !lost;
    dummy.position.set(run.x, 0.01, run.y);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    shadows.setMatrixAt(0, dummy.matrix);
    drawDizzy(run, clock, calm);
  }

  function drawDizzy(run: Run, clock: number, calm: boolean): void {
    stars.visible = run.phase === 'lost';
    if (!stars.visible) return;
    const turnBy = calm ? 0 : clock * 5;
    for (let index = 0; index < 5; index += 1) {
      const angle = turnBy + (index * Math.PI * 2) / 5;
      dummy.position.set(run.x + Math.cos(angle) * 0.5, 1.08 + Math.sin(angle * 2) * 0.05, run.y + Math.sin(angle) * 0.34);
      dummy.rotation.set(0.4, angle, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      stars.setMatrixAt(index, dummy.matrix);
    }
    stars.instanceMatrix.needsUpdate = true;
  }

  return {
    update(run, clock, seconds, calm) {
      drawHero(run, clock, seconds, calm);
      run.robots.forEach((robot, index) => drawRobot(robot, index, clock, calm));
      bodies.instanceMatrix.needsUpdate = true;
      pupils.instanceMatrix.needsUpdate = true;
      halos.instanceMatrix.needsUpdate = true;
      if (pupils.instanceColor) pupils.instanceColor.needsUpdate = true;
      shadows.instanceMatrix.needsUpdate = true;
    },
    reset() {
      bob = 0;
    },
    dispose() {
      host.remove(group);
      group.traverse((node) => {
        if (node instanceof Mesh || node instanceof Sprite) {
          node.geometry.dispose();
          ([] as Material[]).concat(node.material).forEach((material) => material.dispose());
        }
      });
    },
  };
}

