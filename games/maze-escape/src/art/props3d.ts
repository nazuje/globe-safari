import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, RingGeometry, Shape, ShapeGeometry, Sprite, SpriteMaterial, type Material } from 'three';
import { trailTiles, signState } from '../guide.ts';
import { openNeighbours, tileCentre, type Point } from '../grid.ts';
import type { Level } from '../level.ts';
import type { Run } from '../run.ts';
import { paintedMaterial, Pile, SHAPES } from './build.ts';
import { buildDisguise } from './heroes.ts';

/** Kept short, so a trail that doubles back never shows beyond the wall beside the player. */
const TRAIL_MARKS = 8;
const STRONG_TRAIL_MARKS = 10;
const DOOR_OPEN_S = 0.5;
const dummy = new Object3D();
const DISCO_COLORS = [0xff4fd8, 0x27e8ff, 0xffe45c, 0x7dff6a, 0xff8a2b, 0xb07bff];
const SPOTS = 8;

function signTexture(color: string, draw: (paint: CanvasRenderingContext2D) => void): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const paint = canvas.getContext('2d');
  if (!paint) return null;
  paint.fillStyle = color;
  paint.strokeStyle = '#ffffff';
  paint.lineWidth = 9;
  paint.beginPath();
  paint.arc(64, 64, 56, 0, Math.PI * 2);
  paint.fill();
  paint.stroke();
  draw(paint);
  return new CanvasTexture(canvas);
}

/** The two faces of a wait sign, as a child reads them: a raised hand, then a running arrow. */
function signFaces(): { wait: SpriteMaterial; go: SpriteMaterial } {
  const wait = signTexture('#ff2e4d', (paint) => {
    paint.font = '72px system-ui, sans-serif';
    paint.textAlign = 'center';
    paint.textBaseline = 'middle';
    paint.fillText('✋', 64, 70);
  });
  const go = signTexture('#19c97a', (paint) => {
    paint.fillStyle = '#ffffff';
    paint.beginPath();
    for (const [x, y] of [[30, 54], [66, 54], [66, 32], [102, 64], [66, 96], [66, 74], [30, 74]] as const) paint.lineTo(x, y);
    paint.fill();
  });
  const face = (map: CanvasTexture | null): SpriteMaterial => new SpriteMaterial({ map, depthTest: false, transparent: true });
  return { wait: face(wait), go: face(go) };
}

function chevron(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-0.26, -0.18);
  shape.lineTo(0, 0.04);
  shape.lineTo(0.26, -0.18);
  shape.lineTo(0.26, 0.02);
  shape.lineTo(0, 0.26);
  shape.lineTo(-0.26, 0.02);
  shape.closePath();
  return new ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

function doorPanel(): BufferGeometry {
  const pile = new Pile();
  pile.add(SHAPES.box, { x: 0.25, y: 0.42, sx: 0.5, sy: 0.84, sz: 0.1 }, 0x2be38f);
  pile.add(SHAPES.box, { x: 0.25, y: 0.42, sx: 0.3, sy: 0.6, sz: 0.12 }, 0xc8ffe6);
  return pile.build();
}

function frame(): BufferGeometry {
  const pile = new Pile();
  for (const side of [-1, 1]) pile.add(SHAPES.box, { x: 0.53 * side, y: 0.55, sx: 0.12, sy: 1.1, sz: 0.2 }, 0xffffff);
  pile.add(SHAPES.box, { y: 1.1, sx: 1.2, sy: 0.14, sz: 0.2 }, 0xffffff);
  return pile.build();
}

function treasureModel(): BufferGeometry {
  return new Pile()
    .add(SHAPES.gem, { y: 0.48, sx: 0.28, sy: 0.38, sz: 0.28 }, 0xffe45c)
    .add(SHAPES.gem, { y: 0.48, sx: 0.16, sy: 0.46, sz: 0.16, ry: 0.7 }, 0xff4fd8)
    .build();
}

function discoBall(): BufferGeometry {
  return new Pile()
    .add(SHAPES.drum, { y: 0.03, sx: 0.42, sy: 0.06, sz: 0.42 }, 0xff4fd8)
    .add(SHAPES.drum, { y: 0.09, sx: 0.3, sy: 0.06, sz: 0.3 }, 0xffe45c)
    .add(SHAPES.drum, { y: 0.55, sx: 0.015, sy: 0.9, sz: 0.015 }, 0x9aa3c8)
    .add(SHAPES.lump, { y: 1.05, s: 0.26 }, 0xe5e9ff)
    .build();
}

function flagModel(): BufferGeometry {
  return new Pile()
    .add(SHAPES.drum, { y: 0.45, sx: 0.03, sy: 0.9, sz: 0.03 }, 0xe5e9ff)
    .add(SHAPES.box, { x: 0.2, y: 0.74, sx: 0.36, sy: 0.24, sz: 0.03 }, 0x8a6cff)
    .build();
}

/** The way an open door faces, so it stands across the corridor it closes. */
function doorTurn(level: Level): number {
  const { grid, exitTile, exit } = level;
  const next = tileCentre(grid, openNeighbours(grid, exitTile)[0] ?? exitTile);
  return Math.atan2(next.x - exit.x, next.y - exit.y);
}

export interface Props {
  update(run: Run, clock: number, calm: boolean): void;
  /** Bursts the door open. */
  burst(): void;
  reset(): void;
  dispose(): void;
}

/** Everything else in the base: the exit, its trail, boxes, the disco, treasure and safe spots. */
export function createProps(host: Group, level: Level): Props {
  const group = new Group();
  host.add(group);
  const { exit, grid } = level;
  const painted = paintedMaterial();
  const turn = doorTurn(level);

  const door = new Group();
  door.position.set(exit.x, 0, exit.y);
  door.rotation.y = turn;
  const left = new Mesh(doorPanel(), painted);
  const right = new Mesh(doorPanel(), painted);
  left.position.x = -0.5;
  right.position.x = 0.5;
  right.rotation.y = Math.PI;
  door.add(left, right, new Mesh(frame(), new MeshBasicMaterial({ color: 0x2be38f })));
  group.add(door);

  const beacon = new Mesh(new CylinderGeometry(0.3, 0.44, 1.7, 12, 1, true).translate(0, 0.85, 0), new MeshBasicMaterial({ color: 0x1b8f65, transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  beacon.position.set(exit.x, 0, exit.y);
  group.add(beacon);
  const pool = new Mesh(new CylinderGeometry(0.46, 0.46, 0.02, 24), new MeshBasicMaterial({ color: 0x2be38f, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
  pool.position.set(exit.x, 0.02, exit.y);
  group.add(pool);
  const sign = new Mesh(new ConeGeometry(0.4, 0.6, 4).rotateX(Math.PI), new MeshBasicMaterial({ color: 0x8dffd2 }));
  sign.position.set(exit.x, 2.1, exit.y);
  group.add(sign);

  const strong = level.help >= 2;
  const trailLength = strong ? STRONG_TRAIL_MARKS : TRAIL_MARKS;
  const marks = new InstancedMesh(chevron(), new MeshBasicMaterial({ color: 0x8dffd2, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }), trailLength);
  marks.frustumCulled = false;
  marks.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(marks);

  const faces = signFaces();
  const signs = level.stops.flatMap((stop, index) => {
    if (!stop.sign) return [];
    const face = new Sprite(faces.wait);
    face.position.set(stop.spot.x, 1.15, stop.spot.y - 0.2);
    face.scale.setScalar(0.95);
    face.renderOrder = 4;
    const pad = new Mesh(new RingGeometry(0.2, 0.46, 24).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff2e4d, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    pad.position.set(stop.spot.x, 0.03, stop.spot.y);
    group.add(face, pad);
    return [{ index, face, pad }];
  });

  const boxes = level.boxes.map((spot) => {
    const model = buildDisguise();
    model.position.set(spot.x, 0, spot.y);
    model.scale.setScalar(0.85);
    group.add(model);
    return model;
  });

  const discoGroup = new Group();
  group.add(discoGroup);
  const ball = level.disco ? new Mesh(discoBall(), painted) : null;
  if (ball && level.disco) {
    ball.position.set(level.disco.x, 0, level.disco.y);
    discoGroup.add(ball);
  }
  const spots = level.disco
    ? new InstancedMesh(new CylinderGeometry(0.55, 0.55, 0.02, 14), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }), SPOTS)
    : null;
  if (spots) {
    spots.frustumCulled = false;
    spots.visible = false;
    const color = new Color();
    for (let index = 0; index < SPOTS; index += 1) spots.setColorAt(index, color.set(DISCO_COLORS[index % DISCO_COLORS.length] ?? 0xffffff));
    discoGroup.add(spots);
  }

  const treasure = level.treasure ? new Mesh(treasureModel(), new MeshBasicMaterial({ vertexColors: true })) : null;
  if (treasure && level.treasure) {
    treasure.position.set(level.treasure.x, 0, level.treasure.y);
    group.add(treasure);
  }

  const flags = level.checkpoints.map((spot) => {
    const flag = new Mesh(flagModel(), painted);
    flag.position.set(spot.x, 0, spot.y);
    group.add(flag);
    return flag;
  });

  let opened: number | null = null;
  let bursting = false;

  function drawTrail(run: Run, clock: number, calm: boolean): void {
    let from: Point = run;
    let shown = 0;
    const flow = calm ? 0 : clock * 2.4;
    trailTiles(run, trailLength).forEach((tile, index) => {
      const spot = tileCentre(grid, tile);
      const lift = 0.5 + 0.5 * Math.sin(flow - index * 0.9);
      dummy.position.set(spot.x, 0.03, spot.y);
      dummy.rotation.set(0, Math.atan2(spot.x - from.x, spot.y - from.y) + Math.PI, 0);
      dummy.scale.setScalar((strong ? 1.15 : 0.72) + lift * 0.42);
      dummy.updateMatrix();
      marks.setMatrixAt(index, dummy.matrix);
      from = spot;
      shown += 1;
    });
    marks.count = shown;
    marks.instanceMatrix.needsUpdate = true;
  }

  function drawSigns(run: Run, clock: number, calm: boolean): void {
    for (const { index, face, pad } of signs) {
      const going = signState(run, index) === 'go';
      // The top of the screen shows it big while the player stands here, so it never covers them.
      face.visible = run.atSign !== index;
      // A sign left behind has done its job, and only the way ahead stays on show.
      const behind = going && run.atSign !== index;
      if (behind) face.visible = false;
      pad.visible = !behind;
      face.material = going ? faces.go : faces.wait;
      (pad.material as MeshBasicMaterial).color.set(going ? 0x19c97a : 0xff2e4d);
      face.position.y = 1.15 + (calm ? 0 : Math.sin(clock * 4) * 0.05);
    }
  }

  function drawDoor(clock: number): void {
    if (bursting && opened === null) opened = clock;
    const open = opened === null ? 0 : Math.min((clock - opened) / DOOR_OPEN_S, 1);
    const swing = open * open * 2.2;
    left.rotation.y = -swing * 0.9;
    right.rotation.y = Math.PI + swing * 0.9;
    left.position.z = -open * 0.1;
    right.position.z = -open * 0.1;
  }

  function drawDisco(run: Run, clock: number): void {
    if (!spots || !level.disco || !ball) return;
    const on = run.discoLeft > 0;
    spots.visible = on;
    if (!on) return;
    ball.rotation.y = clock * 2;
    for (let index = 0; index < SPOTS; index += 1) {
      const angle = clock * 1.3 + (index * Math.PI * 2) / SPOTS;
      const reach = 1 + 1.6 * (0.5 + 0.5 * Math.sin(clock * 0.9 + index));
      dummy.position.set(level.disco.x + Math.cos(angle) * reach, 0.03, level.disco.y + Math.sin(angle) * reach);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      spots.setMatrixAt(index, dummy.matrix);
    }
    spots.instanceMatrix.needsUpdate = true;
  }

  return {
    update(run, clock, calm) {
      drawTrail(run, clock, calm);
      drawSigns(run, clock, calm);
      drawDoor(clock);
      drawDisco(run, clock);
      const beat = calm ? 0 : Math.sin(clock * 3);
      (beacon.material as MeshBasicMaterial).opacity = 0.28 + beat * 0.07;
      sign.position.y = 1.7 + beat * 0.14;
      sign.rotation.y = calm ? 0 : clock * 1.5;
      boxes.forEach((model, index) => {
        model.visible = (run.boxesTaken & (1 << index)) === 0;
        model.position.y = calm ? 0 : Math.abs(Math.sin(clock * 2.5 + index)) * 0.07;
      });
      if (treasure) {
        treasure.visible = !run.hasTreasure;
        treasure.rotation.y = calm ? 0 : clock * 1.8;
      }
      flags.forEach((flag) => (flag.rotation.y = calm ? 0 : Math.sin(clock * 3) * 0.3));
    },
    burst() {
      bursting = true;
    },
    reset() {
      opened = null;
      bursting = false;
    },
    dispose() {
      host.remove(group);
      group.traverse((node) => {
        if (!(node instanceof Mesh)) return;
        node.geometry.dispose();
        ([] as Material[]).concat(node.material).forEach((material) => material.dispose());
      });
      faces.wait.dispose();
      faces.go.dispose();
    },
  };
}

