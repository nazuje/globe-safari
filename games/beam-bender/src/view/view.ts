import { AmbientLight, Color, DirectionalLight, Fog, HemisphereLight, IcosahedronGeometry, InstancedMesh, Mesh, Object3D, PlaneGeometry, Vector3 } from 'three';
import type { Stage } from '@playroom/stage3d';
import type { Board } from '../rules/board.ts';
import type { Play } from '../rules/play.ts';
import { calm } from '../ui.ts';
import { Beams, BEAM_HEIGHT } from './beams.ts';
import { additive, BEAM_COLORS, flat, haloTexture, PALETTE } from './look.ts';
import { BoardPieces } from './pieces.ts';
import { buildRoom } from './room.ts';

const TILT = (19 * Math.PI) / 180;
const TRAY_TOP = 0.3;
const RIM_SPACE = 0.12;
const LARGEST_TILE_PX = 128;
const FIT_STEPS = 8;
const SPOTS = 16;
const DISCO_SECONDS = 2.6;
const FIZZLE_SECONDS = 0.7;
const DISCO_COLORS = [BEAM_COLORS.red, BEAM_COLORS.green, BEAM_COLORS.blue, 0xffd84a, 0xc56bff];

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Spot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface View {
  showLevel(board: Board, play: Play): void;
  update(play: Play): void;
  restart(play: Play): void;
  fizzle(): void;
  disco(): void;
  /** Where a tile is on screen, in canvas pixels. */
  tileSpot(at: number): Spot;
  /** Fits the tray into a part of the canvas. */
  frameBoard(safe: Rect): void;
  onFit(listener: () => void): void;
}

const CORNERS = [[-1, 0, -1], [1, 0, -1], [-1, 0, 1], [1, 0, 1], [-1, 1, -1], [1, 1, -1]] as const;

export function createView(stage: Stage): View {
  const { scene, camera, canvas } = stage;
  scene.background = new Color(PALETTE.night);
  scene.fog = new Fog(PALETTE.night, 26, 62);
  scene.add(new AmbientLight(0x6a6aa8, 0.9));
  const sky = new HemisphereLight(0xa8b4ff, 0x2a1810, 1.5);
  const lamp = new DirectionalLight(0xffe6c0, 2.3);
  lamp.position.set(-4, 12, 5);
  scene.add(sky, lamp);
  buildRoom(scene);

  const beams = new Beams(scene, camera);
  const tray = new BoardPieces(camera);
  scene.add(tray.group);

  const dummy = new Object3D();
  const spots = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive(haloTexture(), 0xffffff, 0.75), SPOTS);
  spots.frustumCulled = false;
  spots.visible = false;
  spots.renderOrder = 5;
  const ball = new Mesh(new IcosahedronGeometry(0.62, 1), flat(0xd8e6ff, 0x3a4468));
  ball.visible = false;
  scene.add(spots, ball);

  const point = new Vector3();
  const lookAt = new Vector3();
  const spotTint = new Color();
  const fitListeners = new Set<() => void>();
  let board: Board | null = null;
  let play: Play | null = null;
  let safe: Rect = { left: 0, top: 0, right: 1, bottom: 1 };
  let lastWidth = 0;
  let lastHeight = 0;
  let discoLeft = 0;
  let fizzleLeft = 0;

  const canvasWidth = (): number => canvas.clientWidth || 1;
  const canvasHeight = (): number => canvas.clientHeight || 1;

  function placeCamera(distance: number): void {
    camera.position.set(lookAt.x, lookAt.y + Math.cos(TILT) * distance, lookAt.z + Math.sin(TILT) * distance);
    camera.lookAt(lookAt);
    camera.updateMatrixWorld();
  }

  function toScreen(x: number, y: number, z: number): { x: number; y: number } {
    point.set(x, y, z).project(camera);
    return { x: ((point.x + 1) / 2) * canvasWidth(), y: ((1 - point.y) / 2) * canvasHeight() };
  }

  function trayExtent(halfWidth: number, halfDepth: number): Rect {
    const seen: Rect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const [signX, up, signZ] of CORNERS) {
      const { x, y } = toScreen(signX * halfWidth, up * TRAY_TOP, signZ * halfDepth);
      seen.left = Math.min(seen.left, x);
      seen.right = Math.max(seen.right, x);
      seen.top = Math.min(seen.top, y);
      seen.bottom = Math.max(seen.bottom, y);
    }
    return seen;
  }

  /** Steps the camera until the tray fills the safe area, however the lens and the screen are shaped. */
  function fitCamera(): void {
    if (!board) return;
    camera.updateProjectionMatrix();
    const halfWidth = board.width / 2 + RIM_SPACE;
    const halfDepth = board.height / 2 + RIM_SPACE;
    const safeWidth = Math.max(safe.right - safe.left, 40);
    const safeHeight = Math.max(safe.bottom - safe.top, 40);
    let distance = 20;
    lookAt.set(0, 0, 0);
    for (let step = 0; step < FIT_STEPS; step += 1) {
      placeCamera(distance);
      const seen = trayExtent(halfWidth, halfDepth);
      const seenWidth = seen.right - seen.left;
      const seenHeight = seen.bottom - seen.top;
      const fill = Math.max(seenWidth / safeWidth, seenHeight / safeHeight, (seenWidth / (board.width + RIM_SPACE * 2)) / LARGEST_TILE_PX);
      distance *= fill;
      const unitsPerPixel = (2 * halfWidth) / seenWidth;
      lookAt.x += (((seen.left + seen.right) - (safe.left + safe.right)) / 2) * unitsPerPixel;
      lookAt.z += (((seen.top + seen.bottom) - (safe.top + safe.bottom)) / 2) * unitsPerPixel;
    }
    placeCamera(distance);
    for (const listener of fitListeners) listener();
  }

  function tileSpot(at: number): Spot {
    const width = board?.width ?? 1;
    const worldX = tray.worldX(at % width);
    const worldZ = tray.worldZ(Math.floor(at / width));
    const middle = toScreen(worldX, BEAM_HEIGHT, worldZ);
    const left = toScreen(worldX - 0.5, BEAM_HEIGHT, worldZ);
    const right = toScreen(worldX + 0.5, BEAM_HEIGHT, worldZ);
    const far = toScreen(worldX, BEAM_HEIGHT, worldZ - 0.5);
    const near = toScreen(worldX, BEAM_HEIGHT, worldZ + 0.5);
    return { x: middle.x, y: middle.y, width: right.x - left.x, height: near.y - far.y };
  }

  function discoFrame(seconds: number): void {
    discoLeft -= seconds;
    const clock = DISCO_SECONDS - discoLeft;
    const still = calm();
    const hue = still ? 0.6 : (clock * 0.7) % 1;
    sky.color.setHSL(hue, 0.9, 0.7);
    ball.rotation.y += still ? 0 : seconds * 2.4;
    for (let index = 0; index < SPOTS; index += 1) {
      const angle = index * 2.4 + (still ? 0 : clock * (index % 2 ? 1.1 : -0.8));
      const reach = 1 + (index % 4) * 1.15;
      dummy.position.set(Math.cos(angle) * reach, 0.06, Math.sin(angle) * reach);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1.9);
      dummy.updateMatrix();
      spots.setMatrixAt(index, dummy.matrix);
      spots.setColorAt(index, spotTint.set(DISCO_COLORS[index % DISCO_COLORS.length]));
    }
    spots.instanceMatrix.needsUpdate = true;
    if (spots.instanceColor) spots.instanceColor.needsUpdate = true;
    if (discoLeft > 0) return;
    spots.visible = false;
    ball.visible = false;
    sky.color.set(0xa8b4ff);
  }

  function fizzleFrame(seconds: number): void {
    fizzleLeft = Math.max(0, fizzleLeft - seconds);
    const gone = 1 - fizzleLeft / FIZZLE_SECONDS;
    const flicker = calm() ? 1 : Math.abs(Math.sin(gone * 34));
    beams.setPower(Math.max(0, (1 - gone) * flicker));
  }

  stage.onFrame((seconds) => {
    if (camera.aspect !== lastWidth / lastHeight || canvas.clientWidth !== lastWidth || canvas.clientHeight !== lastHeight) {
      lastWidth = canvas.clientWidth;
      lastHeight = canvas.clientHeight;
      fitCamera();
    }
    const still = calm();
    tray.tick(seconds, play, still);
    beams.tick(seconds, still);
    if (discoLeft > 0) discoFrame(seconds);
    if (fizzleLeft > 0) fizzleFrame(seconds);
  });

  function showTrace(next: Play, instant: boolean): void {
    beams.show(next.trace, tray.worldX, tray.worldZ, instant);
  }

  return {
    showLevel(nextBoard, nextPlay) {
      board = nextBoard;
      play = nextPlay;
      discoLeft = 0;
      fizzleLeft = 0;
      spots.visible = false;
      ball.visible = false;
      sky.color.set(0xa8b4ff);
      tray.build(nextBoard, nextPlay);
      tray.snap(nextPlay);
      beams.setPower(1);
      fitCamera();
      showTrace(nextPlay, true);
    },
    update(nextPlay) {
      play = nextPlay;
      tray.show(nextPlay);
      showTrace(nextPlay, false);
    },
    restart(nextPlay) {
      play = nextPlay;
      fizzleLeft = 0;
      tray.snap(nextPlay);
      beams.setPower(1);
      showTrace(nextPlay, true);
    },
    fizzle() {
      fizzleLeft = FIZZLE_SECONDS;
      tray.startFizzle();
    },
    disco() {
      discoLeft = DISCO_SECONDS;
      spots.visible = true;
      ball.visible = true;
      ball.position.set(0, 2.2, -(board?.height ?? 4) / 2 - 0.2);
    },
    tileSpot,
    frameBoard(next) {
      safe = next;
      fitCamera();
    },
    onFit: (listener) => void fitListeners.add(listener),
  };
}
