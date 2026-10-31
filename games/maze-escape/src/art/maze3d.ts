import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshBasicMaterial, type Group } from 'three';
import { FLOOR, HOLO, rayLength, tileIndex, WALL, type Grid } from '../grid.ts';
import type { Level, Theme } from '../level.ts';
import { WALL_HEIGHT } from '../rig.ts';
import { LONGEST_REACH } from '../tuning.ts';

export interface Palette {
  /** The bright line along every wall. */
  rim: number;
  top: number;
  side: number;
  floorA: number;
  floorB: number;
}

export const PALETTES: Record<Theme, Palette> = {
  cyan: { rim: 0x27e8ff, top: 0x202c8a, side: 0x18236e, floorA: 0x090b26, floorB: 0x0d0f2e },
  lime: { rim: 0x7dff6a, top: 0x0f5166, side: 0x0b3c4e, floorA: 0x07121f, floorB: 0x0a1726 },
  pink: { rim: 0xff4fd8, top: 0x50218c, side: 0x3a176a, floorA: 0x100920, floorB: 0x140c28 },
  amber: { rim: 0xffb338, top: 0x4c2378, side: 0x391a5c, floorA: 0x130b20, floorB: 0x180e28 },
};

export const BACKDROP = 0x05060f;
const RIM_WIDTH = 0.1;
const GLOW = 0.02;

class Quads {
  positions: number[] = [];
  colors: number[] = [];

  add(corners: readonly (readonly [number, number, number])[], tints: readonly Color[]): void {
    for (const index of [0, 1, 2, 0, 2, 3]) {
      const corner = corners[index];
      const tint = tints[index] ?? tints[0];
      if (!corner || !tint) continue;
      this.positions.push(...corner);
      this.colors.push(tint.r, tint.g, tint.b);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(this.colors), 3));
    return geometry;
  }
}

const isWall = (grid: Grid, column: number, row: number): boolean => {
  if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) return true;
  return grid.cells[tileIndex(grid, column, row)] !== FLOOR;
};

function hex(value: number): Color {
  return new Color(value);
}

function addFloor(quads: Quads, grid: Grid, palette: Palette): void {
  const rim = hex(palette.rim);
  const paint = (base: Color, near: boolean): Color => (near ? base.clone().lerp(rim, GLOW) : base);
  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      if (isWall(grid, column, row) && grid.cells[tileIndex(grid, column, row)] !== HOLO) continue;
      const base = hex((column + row) % 2 === 0 ? palette.floorA : palette.floorB);
      const left = isWall(grid, column - 1, row);
      const right = isWall(grid, column + 1, row);
      const up = isWall(grid, column, row - 1);
      const down = isWall(grid, column, row + 1);
      const [x, z] = [column, row];
      quads.add(
        [[x, 0, z], [x, 0, z + 1], [x + 1, 0, z + 1], [x + 1, 0, z]],
        [paint(base, left || up), paint(base, left || down), paint(base, right || down), paint(base, right || up)],
      );
    }
  }
}

interface Face {
  dx: number;
  dz: number;
  /** The wall top's edge, as two corners. */
  a: readonly [number, number];
  b: readonly [number, number];
}

function facesOf(column: number, row: number): Face[] {
  const [x, z] = [column, row];
  return [
    { dx: 0, dz: 1, a: [x, z + 1], b: [x + 1, z + 1] },
    { dx: 0, dz: -1, a: [x + 1, z], b: [x, z] },
    { dx: 1, dz: 0, a: [x + 1, z + 1], b: [x + 1, z] },
    { dx: -1, dz: 0, a: [x, z], b: [x, z + 1] },
  ];
}

function addWallFace(quads: Quads, face: Face, palette: Palette): void {
  const { a, b, dx, dz } = face;
  const h = WALL_HEIGHT;
  const rim = hex(palette.rim);
  const side = hex(palette.side);
  const lit = side.clone().lerp(rim, 0.55);
  quads.add([[a[0], h, a[1]], [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]]], [side, lit, lit, side]);
  const inX = -dx * RIM_WIDTH;
  const inZ = -dz * RIM_WIDTH;
  quads.add([[a[0] + inX, h, a[1] + inZ], [a[0], h, a[1]], [b[0], h, b[1]], [b[0] + inX, h, b[1] + inZ]], [rim]);
}

function addWalls(quads: Quads, grid: Grid, palette: Palette): void {
  const top = hex(palette.top);
  for (let row = 0; row < grid.height; row += 1) {
    for (let column = 0; column < grid.width; column += 1) {
      if (grid.cells[tileIndex(grid, column, row)] !== WALL) continue;
      const [x, z] = [column, row];
      quads.add([[x, WALL_HEIGHT, z], [x, WALL_HEIGHT, z + 1], [x + 1, WALL_HEIGHT, z + 1], [x + 1, WALL_HEIGHT, z]], [top]);
      for (const face of facesOf(column, row)) {
        const out = [column + face.dx, row + face.dz] as const;
        const inside = out[0] >= 0 && out[1] >= 0 && out[0] < grid.width && out[1] < grid.height;
        if (inside && isOpenFloor(grid, out[0], out[1])) addWallFace(quads, face, palette);
      }
    }
  }
}

const isOpenFloor = (grid: Grid, column: number, row: number): boolean => grid.cells[tileIndex(grid, column, row)] !== WALL;

/** Faint marks on the floor: where a bolt flies and where a beam sweeps, so a lane reads before it ever fires. */
function addLaserLanes(quads: Quads, level: Level): void {
  const dim = hex(0x70223f);
  const bright = hex(0xb3264f);
  const y = 0.012;
  for (const laser of level.lasers) {
    if (laser.kind === 'bolt') {
      const across = 0.11;
      const [cx, cz] = [Math.cos(laser.aim), Math.sin(laser.aim)];
      const [nx, nz] = [-cz * across, cx * across];
      for (let along = 0.1; along < laser.range; along += 0.6) {
        const [x1, z1, x2, z2] = [laser.from.x + cx * along, laser.from.y + cz * along, laser.from.x + cx * (along + 0.34), laser.from.y + cz * (along + 0.34)];
        quads.add([[x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x2 - nx, y, z2 - nz], [x2 + nx, y, z2 + nz]], [bright]);
      }
    } else {
      const steps = 20;
      for (let step = 0; step < steps; step += 1) {
        const a = laser.aim - laser.sweep + (2 * laser.sweep * step) / steps;
        const b = laser.aim - laser.sweep + (2 * laser.sweep * (step + 1)) / steps;
        const reachA = rayLength(level.grid, laser.from, a, LONGEST_REACH);
        const reachB = rayLength(level.grid, laser.from, b, LONGEST_REACH);
        const fx = laser.from.x;
        const fz = laser.from.y;
        quads.add(
          [[fx, y, fz], [fx + Math.cos(a) * reachA, y, fz + Math.sin(a) * reachA], [fx + Math.cos(b) * reachB, y, fz + Math.sin(b) * reachB], [fx, y, fz]],
          [dim, dim.clone().multiplyScalar(0.4), dim.clone().multiplyScalar(0.4), dim],
        );
      }
    }
  }
}

/** The base carries on past the map, fading into the dark, so a small maze never floats in a void. */
function addSkirt(quads: Quads, grid: Grid, palette: Palette): void {
  const near = hex(palette.top).multiplyScalar(0.55);
  const dark = hex(BACKDROP);
  const [w, h] = [grid.width, grid.height];
  const y = WALL_HEIGHT;
  const fade = 9;
  quads.add([[0, y, -fade], [0, y, 0], [w, y, 0], [w, y, -fade]], [dark, near, near, dark]);
  quads.add([[0, y, h], [0, y, h + fade], [w, y, h + fade], [w, y, h]], [near, dark, dark, near]);
  quads.add([[-fade, y, 0], [-fade, y, h], [0, y, h], [0, y, 0]], [dark, dark, near, near]);
  quads.add([[w, y, 0], [w, y, h], [w + fade, y, h], [w + fade, y, 0]], [near, near, dark, dark]);
  for (const [cx, cz, sx, sz] of [[0, 0, -1, -1], [w, 0, 1, -1], [0, h, -1, 1], [w, h, 1, 1]] as const) {
    quads.add([[cx, y, cz], [cx + sx * fade, y, cz], [cx + sx * fade, y, cz + sz * fade], [cx, y, cz + sz * fade]], [near, dark, dark, dark]);
  }
}

/** The whole maze as a single draw. Lit by its own colours, not by lamps, so it glows in the dark. */
export function buildMaze(host: Group, level: Level, palette: Palette): () => void {
  const quads = new Quads();
  addFloor(quads, level.grid, palette);
  addWalls(quads, level.grid, palette);
  addLaserLanes(quads, level);
  addSkirt(quads, level.grid, palette);
  const material = new MeshBasicMaterial({ vertexColors: true, side: DoubleSide });
  const mesh = new Mesh(quads.build(), material);
  mesh.frustumCulled = false;
  host.add(mesh);
  const halo = buildHolo(level, palette);
  if (halo) host.add(halo);
  return () => {
    host.remove(mesh);
    mesh.geometry.dispose();
    material.dispose();
    if (halo) {
      host.remove(halo);
      halo.geometry.dispose();
      (halo.material as MeshBasicMaterial).dispose();
    }
  };
}

/** A hidden room's door: a flickering hologram of a wall, a little too bright if you look twice. */
function buildHolo(level: Level, palette: Palette): Mesh | null {
  const quads = new Quads();
  const { grid } = level;
  const tint = hex(palette.rim).multiplyScalar(0.34);
  grid.cells.forEach((cell, tile) => {
    if (cell !== HOLO) return;
    const x = tile % grid.width;
    const z = Math.floor(tile / grid.width);
    const h = WALL_HEIGHT;
    quads.add([[x, h, z], [x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z]], [tint]);
    quads.add([[x, h, z + 1], [x, 0, z + 1], [x + 1, 0, z + 1], [x + 1, h, z + 1]], [tint]);
  });
  if (quads.positions.length === 0) return null;
  const mesh = new Mesh(quads.build(), new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  mesh.name = 'holo';
  return mesh;
}
