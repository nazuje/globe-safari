import {
  CircleGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import { CAMERA } from './layout.ts';
import { CARROT_Y, CARROT_Z, HAT_Y, hatShape, shapes, TONGUE_Y, TONGUE_Z, toyMaterial } from './models.ts';
import type { Target } from './round.ts';

const POOL = 14;
const SPLAT_SECONDS = 0.75;
const REBUILD_SECONDS = 0.95;
const TEASE_SECONDS = 1.1;
const DUCK = 0.24;

const goldMaterial = new MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
  color: 0xffcf40,
  emissive: 0x6b4300,
});

const shadowMaterial = new MeshBasicMaterial({ color: 0x24305e, transparent: true, opacity: 0.22, depthWrite: false });

const easeBack = (t: number): number => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

function spring(t: number): number {
  return 1 - Math.cos(t * 9) * Math.exp(-t * 5);
}

class Snowman {
  readonly group = new Group();
  readonly body = new Mesh(shapes.bodies[0], toyMaterial);
  readonly hat = new Mesh(hatShape('topHat'), toyMaterial);
  readonly carrot = new Mesh(shapes.carrot, toyMaterial);
  readonly sled = new Mesh(shapes.sled, toyMaterial);
  readonly tongue = new Mesh(shapes.tongue, toyMaterial);
  owner = 0;
  private outfit = '';
  /** How close the giant is to bursting, from 0 to 1. */
  giantShare = 0;

  constructor(scene: Scene) {
    this.carrot.position.set(0, CARROT_Y, CARROT_Z);
    this.hat.position.set(0, HAT_Y, 0);
    this.tongue.position.set(0, TONGUE_Y, TONGUE_Z);
    this.group.add(this.body, this.hat, this.carrot, this.sled, this.tongue);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Changes clothes only when needed, including after a rebuild, however slow the frames are. */
  dress(target: Target): void {
    const outfit = `${target.id}/${target.hat}/${target.look}/${target.motion}`;
    if (outfit === this.outfit) return;
    this.outfit = outfit;
    const head = target.motion === 'window';
    this.owner = target.id;
    this.body.geometry = (head ? shapes.heads : shapes.bodies)[target.look];
    this.hat.geometry = hatShape(target.hat);
    const golden = target.kind === 'golden';
    this.body.material = golden ? goldMaterial : toyMaterial;
    this.sled.visible = target.motion === 'sled';
    this.group.position.y = 0;
  }

  /** Puts everything back to rest before a pose. */
  rest(): void {
    this.body.scale.set(1, 1, 1);
    this.body.position.set(0, 0, 0);
    this.hat.visible = true;
    this.hat.scale.set(1, 1, 1);
    this.hat.position.set(0, HAT_Y, 0);
    this.hat.rotation.set(0, 0, 0);
    this.carrot.visible = true;
    this.carrot.scale.set(1, 1, 1);
    this.tongue.visible = false;
    this.group.rotation.set(0, 0, 0);
  }

  pose(target: Target, time: number, calm: boolean): void {
    this.rest();
    const { group } = this;
    const faceCamera = Math.atan2(CAMERA.position.x - target.x, CAMERA.position.z - target.z);
    const size = target.size;
    group.position.set(target.x, target.y, target.z);
    group.scale.setScalar(size);
    group.rotation.y = faceCamera;
    const seed = target.id * 1.7;
    const wobble = calm ? 0.02 : 0.07;
    if (target.motion === 'window') {
      group.scale.setScalar(size * Math.max(target.shown, 0.001));
      group.rotation.z = Math.sin(time * 3 + seed) * wobble * 1.4;
    } else if (target.motion === 'sled') {
      const leaning = target.phase === 'exit' ? target.shown : 1;
      group.scale.setScalar(size * Math.max(leaning, 0.001));
      group.rotation.y = target.heading > 0 ? Math.PI / 2 - 0.5 : -Math.PI / 2 + 0.5;
      group.rotation.z = Math.sin(time * 2 + seed) * wobble * 0.5;
      this.body.position.y = 0.46;
      this.hat.position.y = HAT_Y + 0.46;
      this.carrot.position.y = CARROT_Y + 0.46;
    } else {
      const walk = target.motion === 'waddle' ? 2.2 : 1;
      group.rotation.z = Math.sin(time * 4 * walk + seed) * wobble * walk;
      group.rotation.x = Math.sin(time * 2.3 + seed) * wobble * 0.4;
      this.body.scale.y = 1 + Math.sin(time * 5 + seed) * (calm ? 0.01 : 0.025);
    }
    if (target.motion !== 'sled') this.carrot.position.y = CARROT_Y;

    if (target.phase === 'splat') {
      const share = Math.min(target.clock / SPLAT_SECONDS, 1);
      const flat = share < 0.12 ? 1 - share / 0.12 * 0.8 : 0.2;
      const shrink = share < 0.65 ? 1 : 1 - (share - 0.65) / 0.35;
      this.body.scale.set(1.4 * shrink, flat * shrink, 1.4 * shrink);
      this.hat.visible = false;
      this.carrot.visible = false;
      group.rotation.x = 0;
      group.rotation.z = 0;
    } else if (target.phase === 'rebuild') {
      const share = Math.min(target.clock / REBUILD_SECONDS, 1);
      const grow = Math.max(spring(share * 1.2), 0.001);
      this.body.scale.set(grow, grow, grow);
      const landed = Math.max((share - 0.55) / 0.45, 0);
      this.hat.visible = landed > 0;
      this.hat.position.y = HAT_Y + (1 - easeBack(landed)) * 2.2;
      this.carrot.scale.setScalar(Math.min(Math.max((share - 0.8) / 0.2, 0.001), 1));
      group.rotation.z += Math.sin(time * 14) * 0.08 * (1 - share);
    } else if (target.kind === 'giant') {
      const share = this.giantShare;
      const amount = 0.02 + share * 0.2;
      const speed = 2.4 + share * 7;
      group.rotation.z = Math.sin(time * speed) * amount;
      group.rotation.x = Math.cos(time * speed * 0.7) * amount * 0.5;
      this.body.scale.y = 1 + Math.sin(time * speed * 1.3) * amount * 0.5;
    }
    if (target.teasing > 0 && target.phase === 'stay') this.tease(target, time, calm);
  }

  /** Ducks down, sticks its tongue out and giggles from side to side. */
  private tease(target: Target, time: number, calm: boolean): void {
    const left = target.teasing / TEASE_SECONDS;
    const amount = Math.min(left * 5, (1 - left) * 8, 1);
    this.group.scale.y *= 1 - DUCK * amount;
    this.group.rotation.z += Math.sin(time * 15) * (calm ? 0.03 : 0.13) * amount;
    this.hat.position.y += 0.3 * amount;
    this.tongue.visible = true;
    this.tongue.position.y = TONGUE_Y + (target.motion === 'sled' ? 0.46 : 0);
    this.tongue.scale.setScalar(Math.max(amount, 0.01));
  }
}

class Friend {
  readonly group = new Group();
  readonly sled = new Mesh(shapes.sled, toyMaterial);
  readonly left: Mesh;
  readonly right: Mesh;

  constructor(scene: Scene, body: Mesh, left: Mesh, right: Mesh) {
    this.left = left;
    this.right = right;
    this.group.add(body, left, right, this.sled);
    this.group.visible = false;
    scene.add(this.group);
  }
}

function makePenguin(scene: Scene): Friend {
  const left = new Mesh(shapes.flipper, toyMaterial);
  const right = new Mesh(shapes.flipper, toyMaterial);
  left.position.set(-0.72, 1.6, 0);
  right.position.set(0.72, 1.6, 0);
  const body = new Mesh(shapes.penguin, toyMaterial);
  body.position.y = 0.3;
  left.position.y += 0.3;
  right.position.y += 0.3;
  return new Friend(scene, body, left, right);
}

function makeYeti(scene: Scene): Friend {
  const left = new Mesh(shapes.yetiArm, toyMaterial);
  const right = new Mesh(shapes.yetiArm, toyMaterial);
  left.position.set(-1.1, 2.2, 0);
  right.position.set(1.1, 2.2, 0);
  const friend = new Friend(scene, new Mesh(shapes.yeti, toyMaterial), left, right);
  friend.sled.visible = false;
  return friend;
}

const matrix = new Matrix4();
const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const place = new Vector3();
const scale = new Vector3();

/** Draws whichever targets a round has out, from a fixed set of toys. */
export class Actors {
  private readonly pool: Snowman[];
  private readonly penguin: Friend;
  private readonly yeti: Friend;
  private readonly shadows: InstancedMesh;

  constructor(scene: Scene) {
    this.pool = Array.from({ length: POOL }, () => new Snowman(scene));
    this.penguin = makePenguin(scene);
    this.yeti = makeYeti(scene);
    this.shadows = new InstancedMesh(new CircleGeometry(1, 14), shadowMaterial, POOL + 2);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    scene.add(this.shadows);
  }

  /** Where a target's own hat and carrot are, for when they fly off. */
  poseFor(target: Target): { hat: Vector3; carrot: Vector3 } {
    const s = target.size;
    const lift = target.motion === 'sled' ? 0.46 : 0;
    return {
      hat: new Vector3(target.x, target.y + (HAT_Y + lift + 0.2) * s, target.z),
      carrot: new Vector3(target.x, target.y + (CARROT_Y + lift) * s, target.z + 0.7 * s),
    };
  }

  private shadow(index: number, target: Target, spread: number): number {
    const onWindow = target.motion === 'window';
    const size = onWindow ? 0 : spread * target.size * target.shown;
    place.set(target.x, 0.06, target.z);
    scale.set(size, size, size);
    matrix.compose(place, flat, scale);
    this.shadows.setMatrixAt(index, matrix);
    return index + 1;
  }

  private poseFriend(friend: Friend, target: Target, time: number, calm: boolean): void {
    const { group, left, right } = friend;
    group.visible = true;
    group.position.set(target.x, target.y, target.z);
    const s = Math.max(target.size * (target.phase === 'exit' && target.motion === 'sled' ? target.shown : 1), 0.001);
    group.scale.setScalar(s);
    const waving = target.waving > 0;
    if (target.kind === 'penguin') {
      group.rotation.set(0, target.heading > 0 ? 0.75 : -0.75, Math.sin(time * 3) * 0.04);
      left.rotation.z = -0.25;
      right.rotation.z = waving ? 2.5 + Math.sin(time * 18) * 0.5 : 0.25;
    } else {
      const dance = waving ? 2.2 : 1;
      const beat = time * 4 * dance;
      const wide = calm ? 0.2 : 0.5;
      group.rotation.set(0, Math.atan2(-target.x, CAMERA.position.z - target.z) + Math.sin(beat * 0.5) * wide, Math.sin(beat) * 0.09 * dance);
      group.position.y += Math.abs(Math.sin(beat)) * 0.3 * dance;
      left.rotation.z = -2.5 + Math.sin(beat * 1.5) * 0.5;
      right.rotation.z = waving ? 2.4 + Math.sin(beat * 1.5 + 1) * 0.5 : 0.5 + Math.sin(beat) * 0.3;
    }
  }

  sync(targets: readonly Target[], giantShare: number, time: number, calm: boolean): void {
    let shadow = 0;
    const free = this.pool.filter((actor) => !targets.some((target) => target.id === actor.owner));
    this.penguin.group.visible = false;
    this.yeti.group.visible = false;
    for (const actor of free) {
      actor.group.visible = false;
      actor.owner = 0;
    }
    for (const target of targets) {
      if (target.kind === 'penguin' || target.kind === 'yeti') {
        this.poseFriend(target.kind === 'penguin' ? this.penguin : this.yeti, target, time, calm);
        shadow = this.shadow(shadow, target, target.kind === 'yeti' ? 1.3 : 1.2);
        continue;
      }
      let actor = this.pool.find((candidate) => candidate.owner === target.id);
      if (!actor) {
        actor = free.pop();
        if (!actor) continue;
      }
      actor.dress(target);
      actor.group.visible = true;
      actor.giantShare = giantShare;
      actor.pose(target, time, calm);
      shadow = this.shadow(shadow, target, target.motion === 'sled' ? 1.3 : 1);
    }
    this.shadows.count = shadow;
    this.shadows.instanceMatrix.needsUpdate = true;
  }
}
