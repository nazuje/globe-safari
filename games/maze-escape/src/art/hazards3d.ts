import { AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, type Material } from 'three';
import { rayLength, tileCentre, type Grid, type Point } from '../grid.ts';
import { boltDistance, boltSpot, cameraFacing, laserCharge, sensorState, sweepBeam } from '../hazards.ts';
import type { Level } from '../level.ts';
import { robotCone } from '../robots.ts';
import { WALL_HEIGHT } from '../rig.ts';
import type { Run } from '../run.ts';
import { paintedMaterial, Pile, SHAPES } from './build.ts';

const FAN_STEPS = 20;
const CONE_Y = 0.02;
const ROBOT_CONE = new Color(0xffd23c);
const CAMERA_CONE = new Color(0xff3560);
const SEEN_CONE = new Color(0xffffff);
const PLATE_OFF = new Color(0x12505c);
const PLATE_WARN = new Color(0xff9d2e);
const PLATE_ON = new Color(0xff2e4d);
const dummy = new Object3D();
const tint = new Color();

/** One growing triangle list, rewritten every frame: all the vision cones in one draw call. */
class Fans {
  readonly mesh: Mesh;
  private positions: Float32Array;
  private colors: Float32Array;
  private used = 0;

  constructor(fans: number) {
    // Each step of a fan is an inner wedge and an outer band of two triangles.
    const vertices = fans * FAN_STEPS * 9;
    this.positions = new Float32Array(vertices * 3);
    this.colors = new Float32Array(vertices * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('color', new BufferAttribute(this.colors, 3).setUsage(DynamicDrawUsage));
    this.mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
    this.mesh.frustumCulled = false;
  }

  private vertex(x: number, z: number, color: Color, strength: number): void {
    const at = this.used * 3;
    this.positions[at] = x;
    this.positions[at + 1] = CONE_Y;
    this.positions[at + 2] = z;
    this.colors[at] = color.r * strength;
    this.colors[at + 1] = color.g * strength;
    this.colors[at + 2] = color.b * strength;
    this.used += 1;
  }

  begin(): void {
    this.used = 0;
  }

  /** A wedge clipped by walls, soft inside and bright along its far edge. */
  fan(grid: Grid, from: Point, facing: number, half: number, range: number, color: Color): void {
    let lastX = 0;
    let lastZ = 0;
    let lastReach = 0;
    for (let step = 0; step <= FAN_STEPS; step += 1) {
      const angle = facing - half + (2 * half * step) / FAN_STEPS;
      const reach = rayLength(grid, from, angle, range);
      const x = Math.cos(angle);
      const z = Math.sin(angle);
      if (step > 0) {
        const inner = 0.9;
        this.vertex(from.x, from.y, color, 0.46);
        this.vertex(from.x + lastX * lastReach * inner, from.y + lastZ * lastReach * inner, color, 0.2);
        this.vertex(from.x + x * reach * inner, from.y + z * reach * inner, color, 0.2);
        this.vertex(from.x + lastX * lastReach * inner, from.y + lastZ * lastReach * inner, color, 0.2);
        this.vertex(from.x + lastX * lastReach, from.y + lastZ * lastReach, color, 0.75);
        this.vertex(from.x + x * reach, from.y + z * reach, color, 0.75);
        this.vertex(from.x + lastX * lastReach * inner, from.y + lastZ * lastReach * inner, color, 0.2);
        this.vertex(from.x + x * reach, from.y + z * reach, color, 0.75);
        this.vertex(from.x + x * reach * inner, from.y + z * reach * inner, color, 0.2);
      }
      lastX = x;
      lastZ = z;
      lastReach = reach;
    }
  }

  finish(): void {
    const geometry = this.mesh.geometry;
    geometry.setDrawRange(0, this.used);
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('color').needsUpdate = true;
  }
}

function instanced(geometry: BufferGeometry, material: Material, count: number, group: Group): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, Math.max(count, 1));
  mesh.frustumCulled = false;
  mesh.count = count;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  group.add(mesh);
  return mesh;
}

const glow = (color: number): MeshBasicMaterial =>
  new MeshBasicMaterial({ color, transparent: true, blending: AdditiveBlending, depthWrite: false });

function cameraPile(): BufferGeometry {
  const pile = new Pile();
  pile.add(SHAPES.box, { y: 0, sx: 0.5, sy: 0.3, sz: 0.3 }, 0x7c85b8);
  pile.add(SHAPES.box, { x: 0.35, sx: 0.4, sy: 0.36, sz: 0.4 }, 0xe5e9ff);
  pile.add(SHAPES.drum, { x: 0.58, sx: 0.15, sy: 0.14, sz: 0.15, rz: Math.PI / 2 }, 0x2a2c55);
  pile.add(SHAPES.ball, { x: 0.65, s: 0.1 }, 0xff3560);
  return pile.build();
}

function turretPile(): BufferGeometry {
  const pile = new Pile();
  pile.add(SHAPES.box, { sx: 0.6, sy: 0.4, sz: 0.6 }, 0x6a3f9e);
  pile.add(SHAPES.drum, { x: 0.3, sx: 0.14, sy: 0.5, sz: 0.14, rz: Math.PI / 2 }, 0xe5e9ff);
  pile.add(SHAPES.drum, { x: 0.52, sx: 0.18, sy: 0.08, sz: 0.18, rz: Math.PI / 2 }, 0xff4fd8);
  return pile.build();
}

export interface Hazards {
  update(run: Run, clock: number): void;
  dispose(): void;
}

/** Cones, plates, cameras and turrets: everything that can end a run, always drawn from the rules themselves. */
export function createHazards(host: Group, level: Level): Hazards {
  const group = new Group();
  host.add(group);
  const { grid, sensors, cameras, lasers, robots } = level;
  const fans = new Fans(robots.length + cameras.length);
  group.add(fans.mesh);

  const plateTiles = sensors.flatMap((sensor, index) => sensor.tiles.map((tile) => ({ sensor: index, tile, spot: tileCentre(grid, tile) })));
  const paintedPlate = new MeshBasicMaterial({ color: 0xffffff });
  const plates = instanced(new BoxGeometry(0.9, 0.05, 0.9), paintedPlate, plateTiles.length, group);
  const shield = instanced(new BoxGeometry(0.86, 0.5, 0.86), glow(0xff2e4d), plateTiles.length, group);
  plates.instanceColor?.setUsage(DynamicDrawUsage);

  const painted = paintedMaterial();
  const cameraBodies = instanced(cameraPile(), painted, cameras.length, group);
  const turrets = instanced(turretPile(), painted, lasers.length, group);
  const orbs = instanced(new IcosahedronGeometry(0.26, 1), glow(0xff5f9e), lasers.length, group);
  const bolts = instanced(new CylinderGeometry(0.13, 0.13, 0.7, 8).rotateZ(Math.PI / 2), glow(0xff3fa0), lasers.length, group);
  const beams = instanced(new BoxGeometry(1, 0.09, 0.16).translate(0.5, 0, 0), glow(0xff3fa0), lasers.length, group);

  cameras.forEach((camera, index) => {
    dummy.position.set(camera.mount.x, WALL_HEIGHT + 0.26, camera.mount.y);
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, -camera.aim, 0);
    dummy.updateMatrix();
    cameraBodies.setMatrixAt(index, dummy.matrix);
  });
  lasers.forEach((laser, index) => {
    dummy.position.set(laser.mount.x + Math.cos(laser.aim) * 0.3, WALL_HEIGHT + 0.08, laser.mount.y + Math.sin(laser.aim) * 0.3);
    dummy.scale.setScalar(1);
    dummy.rotation.set(0, -laser.aim, 0);
    dummy.updateMatrix();
    turrets.setMatrixAt(index, dummy.matrix);
  });

  function drawCones(run: Run): void {
    fans.begin();
    cameras.forEach((camera) => {
      const seen = run.seenFor > 0;
      fans.fan(grid, camera.from, cameraFacing(camera, run.t), camera.half, camera.range, seen ? SEEN_CONE : CAMERA_CONE);
    });
    for (const robot of run.robots) {
      if (robot.mode === 'dance' || robot.mode === 'chase' || robot.mode === 'alert') continue;
      const cone = robotCone(robot, level, false);
      fans.fan(grid, robot, robot.facing, cone.half, cone.range, ROBOT_CONE);
    }
    fans.finish();
  }

  function drawPlates(run: Run, clock: number): void {
    plateTiles.forEach(({ sensor, spot }, index) => {
      const owner = sensors[sensor];
      if (!owner) return;
      const state = sensorState(owner, run.t);
      const blink = Math.sin(clock * 22) > 0;
      const on = state === 'on';
      tint.copy(on ? PLATE_ON : state === 'warn' && blink ? PLATE_WARN : PLATE_OFF);
      dummy.position.set(spot.x, 0.03, spot.y);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      plates.setMatrixAt(index, dummy.matrix);
      plates.setColorAt(index, tint);
      dummy.position.set(spot.x, 0.28, spot.y);
      if (on) dummy.scale.set(1, 1 + Math.sin(clock * 30) * 0.08, 1);
      else dummy.scale.setScalar(0.0001);
      dummy.updateMatrix();
      shield.setMatrixAt(index, dummy.matrix);
    });
    plates.instanceMatrix.needsUpdate = true;
    shield.instanceMatrix.needsUpdate = true;
    if (plates.instanceColor) plates.instanceColor.needsUpdate = true;
  }

  function drawLasers(run: Run, clock: number): void {
    lasers.forEach((laser, index) => {
      const charge = laserCharge(laser, run.t);
      const tip = { x: laser.from.x + Math.cos(laser.aim) * 0.1, y: laser.from.y + Math.sin(laser.aim) * 0.1 };
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(tip.x, WALL_HEIGHT + 0.1, tip.y);
      dummy.scale.setScalar(charge > 0 ? 0.3 + charge * 1.2 + Math.sin(clock * 40) * 0.12 * charge : 0.0001);
      dummy.updateMatrix();
      orbs.setMatrixAt(index, dummy.matrix);
      const flown = boltDistance(laser, run.t);
      const place = flown === null ? null : boltSpot(laser, flown);
      dummy.position.set(place?.x ?? 0, 0.34, place?.y ?? 0);
      dummy.rotation.set(0, -laser.aim, 0);
      dummy.scale.setScalar(place ? 1 : 0.0001);
      dummy.updateMatrix();
      bolts.setMatrixAt(index, dummy.matrix);
      const beam = sweepBeam(laser, grid, run.t);
      dummy.position.set(laser.from.x, 0.3, laser.from.y);
      dummy.rotation.set(0, -(beam?.angle ?? 0), 0);
      dummy.scale.set(beam?.length ?? 0.0001, 1, 1);
      dummy.updateMatrix();
      beams.setMatrixAt(index, dummy.matrix);
    });
    orbs.instanceMatrix.needsUpdate = true;
    bolts.instanceMatrix.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
  }

  return {
    update(run, clock) {
      drawCones(run);
      drawPlates(run, clock);
      drawLasers(run, clock);
    },
    dispose() {
      host.remove(group);
      group.traverse((node) => {
        if (node instanceof Mesh) node.geometry.dispose();
      });
      painted.dispose();
    },
  };
}

