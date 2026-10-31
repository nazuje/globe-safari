import { Color, DirectionalLight, Fog, Group, HemisphereLight, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Stage } from '@playroom/stage3d';
import { createActors, type Actors } from './art/actors3d.ts';
import { createFx, type Fx } from './art/fx.ts';
import { createHazards, type Hazards } from './art/hazards3d.ts';
import { BACKDROP, buildMaze, PALETTES } from './art/maze3d.ts';
import { createProps, type Props } from './art/props3d.ts';
import type { CharacterId } from './characters.ts';
import type { Point } from './grid.ts';
import type { Level } from './level.ts';
import { fitDistance, framed, MOST_BELOW_MIDDLE, reachOnScreen, TILT } from './rig.ts';
import type { Run } from './run.ts';
import { PLAYER_SPEED } from './tuning.ts';

const FOLLOW_RATE = 7;
/** Where a finger's point lands: about the character's middle. */
const AIM_HEIGHT = 0.4;

export interface View {
  setLevel(level: Level, character: CharacterId): void;
  update(run: Run, clock: number, seconds: number, calm: boolean): void;
  /** Starts this try from scratch: the camera snaps to the player. */
  restart(run: Run): void;
  lost(run: Run, calm: boolean): void;
  won(run: Run, calm: boolean): void;
  /** The spot on the maze under a point on the page. */
  floorAt(pageX: number, pageY: number): Point | null;
  /** Where a spot on the maze is on the page. */
  onPage(spot: Point): Point;
}

export function createView(stage: Stage): View {
  const { scene, camera, canvas } = stage;
  scene.background = new Color(BACKDROP);
  scene.fog = new Fog(BACKDROP, 26, 70);
  const key = new DirectionalLight(0xffffff, 1.9);
  key.position.set(-3, 9, 5);
  scene.add(new HemisphereLight(0xdfe6ff, 0x5a3f9e, 2), key);

  const world = new Group();
  scene.add(world);
  const fx: Fx = createFx(scene);
  const focus = new Vector3();
  const floor = new Plane(new Vector3(0, 1, 0), -AIM_HEIGHT);
  const ray = new Raycaster();
  const pointer = new Vector2();
  const hit = new Vector3();
  const page = new Vector3();
  let hazards: Hazards | null = null;
  let actors: Actors | null = null;
  let props: Props | null = null;
  let clearMaze: () => void = () => {};
  let fittedAspect = 0;
  let fittedFov = 0;
  let distance = 20;

  function fit(): void {
    if (camera.aspect === fittedAspect && camera.fov === fittedFov) return;
    fittedAspect = camera.aspect;
    fittedFov = camera.fov;
    distance = fitDistance(camera.fov, camera.aspect);
  }

  const lookX = (run: Run): number => framed(run.x, run.level.grid.width, reachOnScreen(distance, camera.fov, camera.aspect).x);
  const lookZ = (run: Run): number => framed(run.y, run.level.grid.height, reachOnScreen(distance, camera.fov, camera.aspect).z, MOST_BELOW_MIDDLE);

  function aim(): void {
    camera.position.set(focus.x, distance * Math.sin(TILT), focus.z + distance * Math.cos(TILT));
    camera.lookAt(focus);
  }

  return {
    setLevel(level, character) {
      hazards?.dispose();
      actors?.dispose();
      props?.dispose();
      clearMaze();
      fx.clear();
      clearMaze = buildMaze(world, level, PALETTES[level.data.theme]);
      hazards = createHazards(world, level);
      props = createProps(world, level);
      actors = createActors(world, level, character);
    },
    restart(run) {
      fit();
      focus.set(lookX(run), 0, lookZ(run));
      aim();
      fx.clear();
      actors?.reset();
      props?.reset();
    },
    update(run, clock, seconds, calm) {
      fit();
      hazards?.update(run, clock);
      props?.update(run, clock, calm);
      actors?.update(run, clock, seconds, calm);
      fx.update(seconds);
      const lead = run.moving && run.phase === 'play' ? PLAYER_SPEED / FOLLOW_RATE : 0;
      const ease = 1 - Math.exp(-FOLLOW_RATE * seconds);
      focus.x += (lookX(run) + Math.cos(run.facing) * lead - focus.x) * ease;
      focus.z += (lookZ(run) + Math.sin(run.facing) * lead - focus.z) * ease;
      aim();
    },
    lost(run, calm) {
      fx.puff(run.x, run.y, calm);
    },
    won(run, calm) {
      props?.burst();
      fx.confetti(run.level.exit.x, run.level.exit.y, calm);
    },
    floorAt(pageX, pageY) {
      const box = canvas.getBoundingClientRect();
      pointer.set(((pageX - box.left) / box.width) * 2 - 1, -((pageY - box.top) / box.height) * 2 + 1);
      ray.setFromCamera(pointer, camera);
      return ray.ray.intersectPlane(floor, hit) ? { x: hit.x, y: hit.z } : null;
    },
    onPage({ x, y }) {
      page.set(x, AIM_HEIGHT, y).project(camera);
      const box = canvas.getBoundingClientRect();
      return { x: box.left + ((page.x + 1) / 2) * box.width, y: box.top + ((1 - page.y) / 2) * box.height };
    },
  };
}
