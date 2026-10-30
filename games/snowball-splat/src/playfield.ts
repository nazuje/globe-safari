import { burst } from '@playroom/kit';
import type { Stage } from '@playroom/stage3d';
import {
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { Actors } from './actors.ts';
import type { Ray, Vec3 } from './aim.ts';
import { Fx } from './fx.ts';
import { splatGlass } from './glass.ts';
import type { HatId } from './hats.ts';
import { text } from './lang/index.ts';
import { cameraFor, type SceneId, type Spot } from './layout.ts';
import {
  centerOf,
  easiestTarget,
  stepRound,
  takeEvents,
  throwBall,
  type Round,
  type RoundEvent,
  type Target,
} from './round.ts';
import * as sounds from './sounds.ts';
import { element } from './ui.ts';
import { buildWorld, type World } from './world.ts';

const BALL_RADIUS = 0.3;
const MOST_BALLS = 22;
const HAND_DEPTH = 2.2;
const HAND_SIDEWAYS = 0.35;
const MOST_WORDS = 6;
const GLASS_DEPTH = 1.5;
const HINT_MARGIN = 40;
const WORD_MARGIN = 64;
const SPOT_MARGIN = 0.86;
const TEASE_ABOVE = 2.9;

export interface PlayfieldEvents {
  /** A hat came off in a real round. */
  onHat(hat: HatId): void;
  onEvent(event: RoundEvent): void;
}

const v = (from: Vec3): Vector3 => new Vector3(from.x, from.y, from.z);

/** The 3D scene: draws a round, turns taps into throws and plays what happens. */
export class Playfield {
  round: Round | null = null;
  private readonly stage: Stage;
  private readonly host: HTMLElement;
  private readonly glass: HTMLElement;
  private readonly words: HTMLElement;
  private readonly actors: Actors;
  private readonly fx: Fx;
  private readonly calm: boolean;
  private readonly listener: PlayfieldEvents;
  private readonly balls: InstancedMesh;
  private readonly caster = new Raycaster();
  private readonly tapPoint = new Vector2();
  private world: World | null = null;
  private sceneId: SceneId | null = null;
  private time = 0;
  private sparkleIn = 0;
  private aspect = 0;

  constructor(stage: Stage, host: HTMLElement, calm: boolean, listener: PlayfieldEvents) {
    this.stage = stage;
    this.host = host;
    this.calm = calm;
    this.listener = listener;
    this.actors = new Actors(stage.scene);
    this.fx = new Fx(stage.scene, calm);
    this.glass = element('div', 'glass');
    this.words = element('div', 'words');
    host.append(this.glass, this.words);
    this.balls = new InstancedMesh(
      new IcosahedronGeometry(BALL_RADIUS, 1),
      new MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x8899bb }),
      MOST_BALLS,
    );
    this.balls.frustumCulled = false;
    this.balls.count = 0;
    stage.scene.add(this.balls);
    this.lookAhead();
    stage.onFrame((seconds) => this.frame(seconds));
  }

  show(round: Round): void {
    if (this.sceneId !== round.scene) {
      this.world?.dispose();
      this.world = buildWorld(this.stage.scene, round.scene, this.calm);
      this.sceneId = round.scene;
    }
    this.round = round;
    this.glass.replaceChildren();
    this.words.replaceChildren();
  }

  /** Where a point in the world is, in pixels from the top left of the game. */
  project(point: Vec3): { x: number; y: number } {
    const on = v(point).project(this.stage.camera);
    return { x: ((on.x + 1) / 2) * this.host.clientWidth, y: ((1 - on.y) / 2) * this.host.clientHeight };
  }

  private rayAt(x: number, y: number): Ray {
    this.tapPoint.set((x / this.host.clientWidth) * 2 - 1, 1 - (y / this.host.clientHeight) * 2);
    this.caster.setFromCamera(this.tapPoint, this.stage.camera);
    const { origin, direction } = this.caster.ray;
    return { origin: { x: origin.x, y: origin.y, z: origin.z }, dir: { x: direction.x, y: direction.y, z: direction.z } };
  }

  /** A throw at a spot on the screen, starting from just below the screen on that side. */
  throwTo(x: number, y: number): void {
    if (!this.round) return;
    const ray = this.rayAt(x, y);
    const side = (x / this.host.clientWidth) * 2 - 1;
    this.caster.setFromCamera(this.tapPoint.set(side * HAND_SIDEWAYS, -1), this.stage.camera);
    const { origin, direction } = this.caster.ray;
    const hand = origin.clone().addScaledVector(direction, HAND_DEPTH);
    throwBall(this.round, ray, { x: hand.x, y: hand.y, z: hand.z });
    sounds.throwSound();
  }

  /** The spot a hint should point at, in pixels. */
  hintSpot(): { x: number; y: number } | null {
    if (!this.round) return null;
    const spotOf = (target: Target): { x: number; y: number } => this.project(centerOf(target));
    const inView = (target: Target): boolean => {
      const { x, y } = spotOf(target);
      return x > HINT_MARGIN && x < this.host.clientWidth - HINT_MARGIN && y > HINT_MARGIN;
    };
    const target = easiestTarget(this.round, inView);
    return target ? spotOf(target) : null;
  }

  private word(at: Vec3, label: string, kind: string): void {
    if (this.words.childElementCount >= MOST_WORDS) return;
    const { x, y } = this.project(at);
    const made = element('div', `word ${kind}`);
    made.textContent = label;
    made.style.left = `${Math.min(Math.max(x, WORD_MARGIN), this.host.clientWidth - WORD_MARGIN)}px`;
    made.style.top = `${y}px`;
    made.style.rotate = `${Math.random() * 20 - 10}deg`;
    made.addEventListener('animationend', () => made.remove());
    this.words.append(made);
  }

  private splat(event: Extract<RoundEvent, { type: 'splat' }>): void {
    const { target, at, points, hat } = event;
    const scale = Math.max(target.size, 1);
    const pose = this.actors.poseFor(target);
    this.fx.puff(v(at), 1.1 * scale);
    this.fx.hatOff(hat, pose.hat, target.size);
    this.fx.carrotOff(pose.carrot, target.size);
    const words = text().words;
    this.word(at, points > 1 ? `+${points}` : words[Math.floor(Math.random() * words.length)], points > 1 ? 'word-big' : '');
    sounds.splatSound();
    if (target.kind === 'golden') {
      const { x, y } = this.project(at);
      this.fx.confetti(v(at), 40, 7);
      burst(x, this.host.getBoundingClientRect().top + y, 12);
      sounds.goldenSound();
    }
    this.listener.onHat(hat);
  }

  private tease(target: Target): void {
    const words = text().teaseWords;
    const above = { x: target.x, y: target.y + TEASE_ABOVE * target.size, z: target.z };
    this.word(above, words[Math.floor(Math.random() * words.length)], 'word-tease');
    sounds.giggle(1 + Math.random() * 0.2);
  }

  private handle(event: RoundEvent): void {
    switch (event.type) {
      case 'miss':
        this.fx.puff(v(event.at), 0.55);
        sounds.missSound();
        if (event.teaser) this.tease(event.teaser);
        break;
      case 'splat':
        this.splat(event);
        break;
      case 'rebuild':
        this.fx.puff(v(event.at), 0.5);
        sounds.rebuildSound();
        break;
      case 'friend':
        this.fx.puff(v(event.at), 0.5);
        this.word(event.at, event.points > 0 ? `+${event.points}` : text().friendWord, 'word-big');
        if (event.target.kind === 'yeti') sounds.yetiSound();
        else sounds.friendSound();
        break;
      case 'giantHit':
        this.fx.puff(v(event.at).add(new Vector3((Math.random() - 0.5) * 4, Math.random() * 3 - 1, 2.4)), 1.3);
        sounds.giantHitSound(event.share);
        break;
      case 'giantBurst': {
        const middle = v(event.at);
        const { x, y } = this.project(event.at);
        this.fx.blizzard(middle, 3);
        this.fx.confetti(middle, 110, 11);
        this.fx.hatOff(event.hat, middle.clone().setY(9), 3);
        burst(x, this.host.getBoundingClientRect().top + y, 24);
        sounds.burstSound();
        break;
      }
      case 'lob':
        sounds.lobSound();
        break;
      case 'glass':
        splatGlass(this.glass, event.x, event.y, this.calm);
        sounds.glassSound();
        break;
      case 'giantIn':
        sounds.rumble();
        break;
    }
    this.listener.onEvent(event);
  }

  private drawBalls(round: Round): void {
    const matrix = new Matrix4();
    const still = new Quaternion();
    const size = new Vector3(1, 1, 1);
    let count = 0;
    for (const ball of round.balls) {
      const at = v(ball.at);
      matrix.compose(at, still, size);
      this.balls.setMatrixAt(count, matrix);
      count += 1;
      if (ball.t > 0.08) this.fx.trail(at);
    }
    for (const lob of round.lobs) {
      const eye = this.stage.camera.position;
      const glass = new Vector3(lob.glassX * 2 - 1, 1 - lob.glassY * 2, 0.5).unproject(this.stage.camera);
      const end = eye.clone().add(glass.sub(eye).normalize().multiplyScalar(GLASS_DEPTH));
      const at = v(lob.from).lerp(end, lob.t);
      at.y += Math.sin(lob.t * Math.PI) * 2.2;
      matrix.compose(at, still, size);
      this.balls.setMatrixAt(count, matrix);
      count += 1;
    }
    this.balls.count = count;
    this.balls.instanceMatrix.needsUpdate = true;
  }

  private sparkle(round: Round, seconds: number): void {
    this.sparkleIn -= seconds;
    if (this.sparkleIn > 0) return;
    this.sparkleIn = 0.09;
    const golden = round.targets.find((target) => target.kind === 'golden' && target.phase !== 'splat');
    if (!golden) return;
    const spot = new Vector3(golden.x + (Math.random() - 0.5) * 2 * golden.size, golden.y + Math.random() * 3 * golden.size, golden.z + 1);
    this.fx.sparkle(spot);
  }

  /** Follows the shape of the screen, which can change when a phone is turned. */
  private lookAhead(): void {
    const { camera } = this.stage;
    if (camera.aspect === this.aspect) return;
    this.aspect = camera.aspect;
    const { position, lookAt } = cameraFor(camera.aspect);
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.updateMatrixWorld();
  }

  /** Whether a snowman at this spot would be on screen. */
  readonly fits = (spot: Spot): boolean => {
    this.lookAhead();
    const on = v({ x: spot.x, y: spot.y + 1.2, z: spot.z }).project(this.stage.camera);
    return Math.abs(on.x) < SPOT_MARGIN;
  };

  private frame(seconds: number): void {
    const { round } = this;
    this.lookAhead();
    this.time += seconds;
    this.world?.update(seconds, this.time);
    if (round) {
      stepRound(round, seconds);
      for (const event of takeEvents(round)) this.handle(event);
      const giant = round.targets.find((target) => target.kind === 'giant');
      this.actors.sync(round.targets, giant ? giant.hits / round.level.giantHits : 0, this.time, this.calm);
      this.drawBalls(round);
      this.sparkle(round, seconds);
    }
    this.fx.update(seconds);
  }
}
