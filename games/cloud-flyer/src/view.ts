import { MathUtils, Vector3, type Group, type Mesh } from 'three';
import type { Stage } from '@playroom/stage3d';
import { CircleGeometry, MeshBasicMaterial, Mesh as ThreeMesh } from 'three';
import { clamp, pathAt, type Course, type Point } from './course.ts';
import { glide, type Flight } from './flight.ts';
import { createAmbient } from './art/ambient.ts';
import { buildFlyer, type FlyerModel } from './art/flyers3d.ts';
import { createFlock, createTunnel, createWhale } from './art/friends.ts';
import { createGates } from './art/gates.ts';
import { createScenery } from './art/scenery.ts';
import { createSky } from './art/sky.ts';
import { createSparkles } from './art/sparkles.ts';
import type { FlyerId } from './flyers.ts';
import type { Span } from './steering.ts';
import type { World } from './worlds.ts';

const CAMERA_BACK = 11;
const CAMERA_UP = 3.3;
const LOOK_AHEAD = 16;
const LOOK_UP = 1.1;
/** How much of the flyer's sideways drift the camera follows. The rest shows on screen as movement. */
const CAMERA_FOLLOW = 0.5;
const CAMERA_RATE = 3.2;
const FLYER_SCALE = 0.85;
const BANK_PER_SPEED = 0.085;
const BANK_PER_CURVE = 9;
const MOST_BANK = 0.85;
const MOST_SPAN_V = 13;
const LOOK_BACK_TURN = 0.55;
const TRAIL_EVERY = 0.045;
const TRAIL_COLORS: readonly (readonly number[])[] = [
  [0xffffff],
  [0xffe27a, 0xffffff],
  [0x7fe0ff, 0xc8f4ff, 0xffffff],
  [0xff8cc8, 0xffc0e0, 0xffe27a],
  [0xff5a6e, 0xff9f43, 0xffd93c, 0x3ecf8e, 0x4cb8ff, 0xa77bff],
];
/** A balloon doesn't lean like a plane does. */
const BANK_SHARE: Record<FlyerId, number> = { plane: 1, dragon: 1, unicorn: 0.9, rocket: 1, balloon: 0.3, bee: 0.8 };

export interface View {
  setScene(world: World, course: Course, calm: boolean): void;
  setFlyer(id: FlyerId | null, trail: number): void;
  update(flight: Flight, time: number, seconds: number): void;
  ringTaken(index: number, flight: Flight): void;
  /** The ring wiggles, and the flyer looks round at it. */
  ringMissed(index: number, flight: Flight): void;
  starTaken(index: number): void;
  bumped(kind: 'cloud' | 'island' | 'arch', index: number): void;
  sneeze(): void;
  splash(colors: readonly number[], count: number): void;
  whale(s: number): void;
  /** How the screen maps to the flyer's reach, at this screen's shape. */
  span(): Span;
  /** Where the flyer is on screen, from 0 to 1, for the "Achoo!" bubble. */
  flyerOnScreen(): { x: number; y: number };
  /** Where a ring is on screen, from 0 to 1, with `u` and `v` for how far it has slid to help. */
  ringOnScreen(index: number, u: number, v: number): { x: number; y: number } | null;
}

export function createView(stage: Stage): View {
  const { scene, camera } = stage;
  const sky = createSky(scene);
  const scenery = createScenery(scene);
  const gates = createGates(scene);
  const sparkles = createSparkles(scene);
  const tunnel = createTunnel(scene);
  const whale = createWhale(scene);
  const flock = createFlock(scene);
  const ambient = createAmbient(scene);

  const shadow: Mesh = new ThreeMesh(
    new CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x2b2140, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.visible = false;
  scene.add(shadow);

  let model: FlyerModel | null = null;
  let flyerId: FlyerId | null = null;
  let course: Course | null = null;
  let calm = false;
  let trail = 0;
  let trailClock = 0;
  let camU = 0;
  let camSpeedU = 0;
  let camV = 0;
  let camSpeedV = 0;
  let orbit = 0;
  let wobble = 0;
  let lookBack = 0;
  let lookSide = 1;

  const probe = new Vector3();
  const here: Point = { x: 0, y: 0, z: 0 };
  const behind: Point = { x: 0, y: 0, z: 0 };
  const ahead: Point = { x: 0, y: 0, z: 0 };

  function poseFlyer(group: Group, flight: Flight, time: number): void {
    const level = flight.course;
    const span = 3;
    pathAt(level.level, level.length, flight.s - span, behind);
    pathAt(level.level, level.length, flight.s + span, ahead);
    const slopeX = (ahead.x - behind.x) / (span * 2);
    const slopeY = (ahead.y - behind.y) / (span * 2);
    pathAt(level.level, level.length, flight.s, here);
    const curve = (ahead.x + behind.x - here.x * 2) / (span * span);
    const pace = Math.max(flight.speed, 6);
    const bank = clamp(flight.speedU * BANK_PER_SPEED + curve * pace * BANK_PER_CURVE * 0.05, -MOST_BANK, MOST_BANK);
    const wobbling = calm ? wobble * 0.3 : wobble;
    group.position.set(here.x + flight.u, here.y + flight.v + flight.hop, -flight.s);
    group.rotation.set(
      Math.atan(slopeY + flight.speedV / pace) * 0.8 + Math.sin(time * 19) * 0.16 * wobbling,
      -Math.atan(slopeX + (flight.speedU / pace) * 0.6) + Math.sin(time * 13) * 0.3 * wobbling - lookSide * LOOK_BACK_TURN * lookBack,
      -bank * (flyerId ? BANK_SHARE[flyerId] : 1) + Math.sin(time * 23) * 0.5 * wobbling,
      'YXZ',
    );
    const puff = 1 + wobbling * 0.14 * Math.sin(time * 31);
    group.scale.setScalar(FLYER_SCALE * puff);
  }

  function emitTrail(group: Group, seconds: number): void {
    trailClock += seconds;
    if (trailClock < TRAIL_EVERY * (trail === 0 ? 2 : 1) || calm) return;
    trailClock = 0;
    const colors = TRAIL_COLORS[trail] ?? [0xffffff];
    sparkles.spray(group.position.x, group.position.y, group.position.z + 1.8, 1, [colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff], 1.4, trail === 0 ? 0.14 : 0.24, 0.9);
  }

  function placeCamera(flight: Flight, seconds: number): void {
    const level = flight.course;
    [camU, camSpeedU] = glide(camU, camSpeedU, flight.u * CAMERA_FOLLOW, CAMERA_RATE, seconds);
    [camV, camSpeedV] = glide(camV, camSpeedV, flight.v * CAMERA_FOLLOW, CAMERA_RATE, seconds);
    const landed = flight.phase === 'bouncing' || flight.phase === 'landed';
    orbit += ((landed ? 1 : 0) - orbit) * (1 - Math.exp(-1.4 * seconds));
    const back = CAMERA_BACK + (flight.boost - 1) * 2 + orbit * 3;
    pathAt(level.level, level.length, flight.s - back, behind);
    pathAt(level.level, level.length, flight.s + LOOK_AHEAD * (1 - orbit * 0.9), ahead);
    camera.position.set(behind.x + camU + orbit * 9, behind.y + camV + CAMERA_UP + orbit * 1.2, -(flight.s - back));
    camera.lookAt(ahead.x + camU * 0.8, ahead.y + camV * 0.8 + LOOK_UP - orbit, ahead.z);
  }

  return {
    setScene(world, nextCourse, nextCalm) {
      course = nextCourse;
      calm = nextCalm;
      sky.paint(world);
      scenery.reset(world, nextCourse);
      gates.reset(nextCourse, world, nextCalm);
      tunnel.reset(nextCourse);
      ambient.reset(world, nextCalm);
      whale.hide();
      camU = 0;
      camV = 0;
      camSpeedU = 0;
      camSpeedV = 0;
      orbit = 0;
      wobble = 0;
    },
    setFlyer(id, nextTrail) {
      if (model) scene.remove(model.group);
      flyerId = id;
      trail = nextTrail;
      model = id ? buildFlyer(id) : null;
      if (model) scene.add(model.group);
    },
    update(flight, time, seconds) {
      wobble = clamp(flight.bumpLeft / 0.9, 0, 1);
      lookBack *= Math.exp(-2.5 * seconds);
      if (model) {
        poseFlyer(model.group, flight, time);
        model.animate(time, clamp(flight.boost - 1 + (flight.phase === 'flying' ? 0.3 : 0), 0, 1));
        if (flight.phase === 'flying') emitTrail(model.group, seconds);
      }
      placeCamera(flight, seconds);
      if (model) flock.update(model.group.position.x, model.group.position.y, model.group.position.z, 0, flight.birdsLeft, time);
      sky.follow(camera);
      scenery.update(flight.s, seconds);
      gates.update(flight, time, seconds);
      tunnel.update(flight.s);
      sparkles.update(seconds);
      if (course) {
        whale.update(flight.s, time, seconds, course);
        ambient.update(camera.position.x, camera.position.y, camera.position.z, flight.s, time, course);
      }
      const onCloud = flight.phase === 'bouncing' || flight.phase === 'landed';
      shadow.visible = onCloud && model !== null;
      if (onCloud && model) {
        const size = 1.9 - flight.hop * 0.15;
        shadow.position.set(model.group.position.x, model.group.position.y - flight.hop - 1.15, model.group.position.z);
        shadow.scale.set(size, 1, size);
      }
    },
    ringTaken(index, flight) {
      gates.ringTaken(index);
      const spot = gates.ringAt(index);
      if (spot && model) {
        const size = flight.chain >= 5 ? 26 : 14;
        sparkles.spray(model.group.position.x, model.group.position.y, model.group.position.z - 2, calm ? 6 : size, TRAIL_COLORS[4] ?? [], 12, 0.3);
      }
    },
    ringMissed(index, flight) {
      gates.ringMissed(index);
      const ring = flight.course.rings[index];
      if (!ring) return;
      lookSide = ring.u >= flight.u ? 1 : -1;
      lookBack = 1;
    },
    starTaken(index) {
      gates.starTaken(index);
      if (model) sparkles.spray(model.group.position.x, model.group.position.y, model.group.position.z - 1, calm ? 2 : 5, [0xffe27a, 0xffffff], 7, 0.2);
    },
    bumped(kind, index) {
      gates.bumped(kind, index);
    },
    sneeze() {
      if (model) sparkles.spray(model.group.position.x, model.group.position.y, model.group.position.z - 2.2, calm ? 8 : 22, [0xffffff, 0xd8f0ff], 11, 0.32, 0.8);
    },
    splash(colors, count) {
      if (model) sparkles.spray(model.group.position.x, model.group.position.y - 0.6, model.group.position.z, calm ? Math.ceil(count / 3) : count, colors, 13, 0.34, 0.9);
    },
    whale(s) {
      whale.appear(s);
    },
    span() {
      const tanV = Math.tan(MathUtils.degToRad(camera.fov / 2));
      const tanH = tanV * camera.aspect;
      const share = 1 - CAMERA_FOLLOW;
      const drop = (CAMERA_UP - LOOK_UP * (CAMERA_BACK / (CAMERA_BACK + LOOK_AHEAD))) / CAMERA_BACK;
      return {
        u: (CAMERA_BACK * tanH) / share,
        v: Math.min((CAMERA_BACK * tanV) / share, MOST_SPAN_V),
        restY: clamp(drop / tanV, 0.05, 0.6),
      };
    },
    flyerOnScreen() {
      if (!model) return { x: 0.5, y: 0.6 };
      const at = model.group.position.clone().project(camera);
      return { x: (at.x + 1) / 2, y: (1 - at.y) / 2 };
    },
    ringOnScreen(index, u, v) {
      const spot = gates.ringAt(index);
      if (!spot) return null;
      const at = probe.set(spot.x + u, spot.y + v, spot.z).project(camera);
      return { x: clamp((at.x + 1) / 2, 0.06, 0.94), y: clamp((1 - at.y) / 2, 0.08, 0.92) };
    },
  };
}
