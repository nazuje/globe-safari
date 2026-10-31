import { Color, DirectionalLight, Fog, HemisphereLight, Matrix4, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Stage } from '@playroom/stage3d';
import { createArena, type Arena } from './art/arena.ts';
import { createHazards, KIND_COLORS, type Hazards } from './art/hazards.ts';
import { createHero, type Hero } from './art/hero.ts';
import { createSparks, type Sparks } from './art/sparks.ts';
import { createTreats, type Treats } from './art/treats.ts';
import type { Run, RunEvent } from './run.ts';

const SPACE = '#0a0528';
const TILT = 1.03;
const WIDE_DISTANCE = 35;
const TALL_DISTANCE = 26;
const WIDE_FOLLOW = 0.3;
const TALL_FOLLOW = 0.55;
const CAMERA_EASE = 5;
const GOLD_RIM = '#ffcf3d';
const SLOW_RIM = '#8fd8ff';
const RIM = '#35e8ff';
const NUDGE_BACK = 8;

export interface View {
  /** Moves the picture on to match the run. */
  update(run: Run, clock: number, seconds: number, calm: boolean): void;
  /** Reacts to something that happened. */
  react(event: RunEvent, calm: boolean): void;
  /** The point on the arena floor under a screen position. */
  groundAt(clientX: number, clientY: number): { x: number; z: number } | null;
  /** The screen position of a point on the floor. */
  screenAt(x: number, z: number): { x: number; y: number };
  /** Numbers a tester needs to turn world places into screen places. */
  cameraMatrix(): readonly number[];
  draws(): number;
}

export function createView(stage: Stage): View {
  const { scene, camera, canvas, renderer } = stage;
  scene.background = new Color(SPACE);
  scene.fog = new Fog(SPACE, 60, 130);
  scene.add(new HemisphereLight('#b9c6ff', '#2a1660', 2.4));
  const sun = new DirectionalLight('#ffffff', 2.2);
  sun.position.set(-8, 20, 10);
  scene.add(sun);

  const decalClock = { value: 0 };
  const arena: Arena = createArena(scene);
  const hazards: Hazards = createHazards(scene, decalClock);
  const hero: Hero = createHero(scene);
  const treats: Treats = createTreats(scene);
  const sparks: Sparks = createSparks(scene);

  const look = new Vector3();
  const lookGoal = new Vector3();
  const ray = new Raycaster();
  const floor = new Plane(new Vector3(0, 1, 0), 0);
  const pointer = new Vector2();
  const hit = new Vector3();
  const matrix = new Matrix4();
  const out: number[] = [];
  let nudge = 0;
  let aspectUsed = 0;
  let placedOnce = false;

  function placeCamera(run: Run, seconds: number, calm: boolean): void {
    const tall = Math.min(1, Math.max(0, (1.25 - camera.aspect) / 0.7));
    const distance = WIDE_DISTANCE + (TALL_DISTANCE - WIDE_DISTANCE) * tall;
    const follow = WIDE_FOLLOW + (TALL_FOLLOW - WIDE_FOLLOW) * tall;
    lookGoal.set(run.player.x * follow, 0, run.player.z * follow * 0.8 + 0.9);
    const ease = !placedOnce || aspectUsed !== camera.aspect ? 1 : 1 - Math.exp(-CAMERA_EASE * seconds);
    look.lerp(lookGoal, calm ? Math.min(ease, 0.5) : ease);
    placedOnce = true;
    aspectUsed = camera.aspect;
    nudge = Math.max(0, nudge - seconds * NUDGE_BACK);
    const back = distance - (calm ? 0 : nudge);
    camera.position.set(look.x, Math.sin(TILT) * back, look.z + Math.cos(TILT) * back);
    camera.lookAt(look);
    camera.updateMatrixWorld();
  }

  return {
    update(run, clock, seconds, calm) {
      decalClock.value = calm ? 0 : clock;
      placeCamera(run, seconds, calm);
      const rim = run.golden > 0 ? GOLD_RIM : run.slow > 0 ? SLOW_RIM : RIM;
      arena.update(seconds, clock, calm, rim);
      hazards.update(run.dangers, clock, run.golden > 0);
      hero.update(run.player, seconds, clock, calm, run.phase === 'lost');
      treats.update(run.pickups, run.ufo, clock, calm);
      sparks.update(seconds);
    },
    react(event, calm) {
      const few = calm ? 0.3 : 1;
      switch (event.type) {
        case 'bonk':
          sparks.burst(event.x, event.z, '#ffe23d', Math.ceil(30 * few), 7);
          nudge = 1.4;
          break;
        case 'blast':
          sparks.burst(event.x, event.z, KIND_COLORS[event.kind], Math.ceil(18 * few));
          break;
        case 'sparkle':
        case 'shielded':
          sparks.burst(event.x, event.z, '#ffcf3d', Math.ceil(14 * few));
          break;
        case 'pickup':
          sparks.burst(event.x, event.z, event.kind === 'heart' ? '#ff3b6b' : '#8fd8ff', Math.ceil(22 * few));
          break;
        case 'wave':
          arena.pulse('#7a4dff');
          break;
        case 'surprise':
          arena.pulse(event.kind === 'golden' ? GOLD_RIM : SLOW_RIM);
          break;
        default:
          break;
      }
    },
    groundAt(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      const found = ray.ray.intersectPlane(floor, hit);
      return found ? { x: found.x, z: found.z } : null;
    },
    screenAt(x, z) {
      hit.set(x, 0.8, z).project(camera);
      const box = canvas.getBoundingClientRect();
      return { x: box.left + ((hit.x + 1) / 2) * box.width, y: box.top + ((1 - hit.y) / 2) * box.height };
    },
    cameraMatrix() {
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      out.length = 0;
      for (const value of matrix.elements) out.push(Math.round(value * 10000) / 10000);
      return out;
    },
    draws: () => renderer.info.render.calls,
  };
}

