import { Mesh } from 'three';
import type { CharacterId } from '../characters.ts';
import { paintedMaterial, Pile, SHAPES } from './build.ts';

const { ball, cone, drum, box } = SHAPES;
const HEAD_Y = 0.72;
const BODY_Y = 0.32;

/** Everyone is a chibi toy: a big head on a small round body with two stubby feet. Faces look along +z. */
function toyBody(pile: Pile, body: number, feet: number): void {
  pile.add(ball, { y: BODY_Y, sx: 0.27, sy: 0.3, sz: 0.25 }, body);
  pile.add(ball, { x: -0.13, y: 0.07, z: 0.04, sx: 0.11, sy: 0.08, sz: 0.15 }, feet);
  pile.add(ball, { x: 0.13, y: 0.07, z: 0.04, sx: 0.11, sy: 0.08, sz: 0.15 }, feet);
}

function eyes(pile: Pile, y: number, z: number, gap: number, white = 0xffffff, pupil = 0x1b1430): void {
  for (const side of [-1, 1]) {
    pile.add(ball, { x: gap * side, y, z, s: 0.085 }, white);
    pile.add(ball, { x: gap * side, y, z: z + 0.06, s: 0.05 }, pupil);
  }
}

const BUILDERS: Record<CharacterId, (pile: Pile) => void> = {
  fox(pile) {
    toyBody(pile, 0xff8a2b, 0x4a2a1a);
    pile.add(ball, { y: BODY_Y, z: 0.12, sx: 0.17, sy: 0.2, sz: 0.15 }, 0xfff1dc);
    pile.add(ball, { y: HEAD_Y, sx: 0.36, sy: 0.32, sz: 0.34 }, 0xff8a2b);
    pile.add(ball, { y: HEAD_Y - 0.08, z: 0.22, sx: 0.2, sy: 0.14, sz: 0.2 }, 0xfff1dc);
    pile.add(ball, { y: HEAD_Y - 0.05, z: 0.41, s: 0.06 }, 0x1b1430);
    for (const side of [-1, 1]) {
      pile.add(cone, { x: 0.22 * side, y: HEAD_Y + 0.33, sx: 0.13, sy: 0.3, sz: 0.1, rz: -0.22 * side }, 0xff8a2b);
      pile.add(cone, { x: 0.23 * side, y: HEAD_Y + 0.42, sx: 0.06, sy: 0.12, sz: 0.05, rz: -0.22 * side }, 0x4a2a1a);
    }
    pile.add(ball, { y: 0.34, z: -0.34, sx: 0.14, sy: 0.14, sz: 0.3, rx: 0.5 }, 0xff8a2b);
    pile.add(ball, { y: 0.48, z: -0.6, s: 0.12 }, 0xfff1dc);
    eyes(pile, HEAD_Y + 0.07, 0.27, 0.14);
  },
  robotKid(pile) {
    toyBody(pile, 0x3fd0c9, 0x37507f);
    pile.add(box, { y: HEAD_Y, sx: 0.62, sy: 0.5, sz: 0.56 }, 0xdfe7f5);
    pile.add(box, { y: HEAD_Y + 0.04, z: 0.26, sx: 0.5, sy: 0.22, sz: 0.1 }, 0x18224a);
    pile.add(ball, { x: -0.13, y: HEAD_Y + 0.04, z: 0.32, s: 0.075 }, 0x62f5ff);
    pile.add(ball, { x: 0.13, y: HEAD_Y + 0.04, z: 0.32, s: 0.075 }, 0x62f5ff);
    pile.add(drum, { y: HEAD_Y + 0.36, sx: 0.025, sy: 0.24, sz: 0.025 }, 0x8a97b8);
    pile.add(ball, { y: HEAD_Y + 0.5, s: 0.08 }, 0xff5f7e);
    for (const side of [-1, 1]) pile.add(drum, { x: 0.34 * side, y: HEAD_Y, sx: 0.1, sy: 0.06, sz: 0.1, rz: Math.PI / 2 }, 0xff5f7e);
    pile.add(box, { y: BODY_Y, z: 0.24, sx: 0.2, sy: 0.14, sz: 0.04 }, 0xffc93c);
  },
  ninjaCat(pile) {
    toyBody(pile, 0x7a6cf0, 0x4a3fb8);
    pile.add(ball, { y: HEAD_Y, sx: 0.36, sy: 0.31, sz: 0.33 }, 0x8f82ff);
    pile.add(box, { y: HEAD_Y + 0.05, z: 0.04, sx: 0.72, sy: 0.15, sz: 0.68 }, 0xff4f73);
    pile.add(box, { x: 0.2, y: HEAD_Y + 0.08, z: -0.38, sx: 0.08, sy: 0.08, sz: 0.3, ry: 0.5 }, 0xff4f73);
    for (const side of [-1, 1]) pile.add(cone, { x: 0.22 * side, y: HEAD_Y + 0.33, sx: 0.13, sy: 0.26, sz: 0.1, rz: -0.25 * side }, 0x8f82ff);
    pile.add(ball, { y: HEAD_Y - 0.13, z: 0.26, sx: 0.13, sy: 0.08, sz: 0.1 }, 0xffd9e6);
    pile.add(ball, { y: 0.32, z: -0.34, sx: 0.08, sy: 0.08, sz: 0.28, rx: 0.9 }, 0x8f82ff);
    eyes(pile, HEAD_Y + 0.05, 0.29, 0.14, 0xffe45c);
  },
  astronaut(pile) {
    toyBody(pile, 0xf4f6ff, 0xff7a3d);
    pile.add(box, { y: 0.36, z: -0.25, sx: 0.36, sy: 0.38, sz: 0.16 }, 0xc8d0e8);
    pile.add(ball, { y: HEAD_Y, s: 0.38 }, 0xf4f6ff);
    pile.add(ball, { y: HEAD_Y + 0.01, z: 0.12, sx: 0.29, sy: 0.25, sz: 0.28 }, 0xffb238);
    pile.add(ball, { x: -0.1, y: HEAD_Y + 0.1, z: 0.35, s: 0.05 }, 0xfff5d0);
    pile.add(drum, { x: 0.38, y: HEAD_Y, sx: 0.08, sy: 0.06, sz: 0.08, rz: Math.PI / 2 }, 0x4cb8ff);
    pile.add(drum, { x: -0.38, y: HEAD_Y, sx: 0.08, sy: 0.06, sz: 0.08, rz: Math.PI / 2 }, 0x4cb8ff);
    pile.add(box, { y: BODY_Y + 0.02, z: 0.23, sx: 0.2, sy: 0.12, sz: 0.04 }, 0xff5f7e);
  },
  unicorn(pile) {
    toyBody(pile, 0xfff4fb, 0xd8a9ff);
    pile.add(ball, { y: HEAD_Y, sx: 0.34, sy: 0.31, sz: 0.33 }, 0xfff4fb);
    pile.add(ball, { y: HEAD_Y - 0.08, z: 0.24, sx: 0.2, sy: 0.15, sz: 0.2 }, 0xffd7ec);
    pile.add(cone, { y: HEAD_Y + 0.43, z: 0.1, sx: 0.08, sy: 0.42, sz: 0.08, rx: 0.2 }, 0xffcf3c);
    const mane = [0xff6fb5, 0xb07bff, 0x4cc9ff, 0x6fe39f];
    mane.forEach((color, index) => {
      pile.add(ball, { y: HEAD_Y + 0.28 - index * 0.1, z: -0.1 - index * 0.11, s: 0.13 }, color);
      pile.add(ball, { y: 0.42 - index * 0.06, z: -0.3 - index * 0.08, s: 0.11 }, color);
    });
    for (const side of [-1, 1]) pile.add(cone, { x: 0.22 * side, y: HEAD_Y + 0.3, sx: 0.08, sy: 0.18, sz: 0.06, rz: -0.25 * side }, 0xfff4fb);
    eyes(pile, HEAD_Y + 0.07, 0.26, 0.15);
  },
  dino(pile) {
    toyBody(pile, 0x58d66b, 0x2f9d4f);
    pile.add(ball, { y: BODY_Y, z: 0.12, sx: 0.17, sy: 0.2, sz: 0.15 }, 0xd4f58c);
    pile.add(ball, { y: HEAD_Y, sx: 0.34, sy: 0.3, sz: 0.34 }, 0x58d66b);
    pile.add(ball, { y: HEAD_Y - 0.08, z: 0.24, sx: 0.28, sy: 0.17, sz: 0.24 }, 0x71e482);
    for (const side of [-1, 1]) pile.add(ball, { x: 0.1 * side, y: HEAD_Y - 0.02, z: 0.45, s: 0.03 }, 0x1b6b36);
    for (const [y, z, s] of [[HEAD_Y + 0.32, -0.02, 0.15], [HEAD_Y + 0.2, -0.26, 0.15], [0.56, -0.26, 0.13], [0.34, -0.32, 0.13]] as const) {
      pile.add(cone, { y, z, sx: s * 0.7, sy: s * 1.5, sz: s * 0.4, rx: -0.5 }, 0xffb238);
    }
    pile.add(cone, { y: 0.26, z: -0.5, sx: 0.15, sy: 0.5, sz: 0.15, rx: -1.3 }, 0x58d66b);
    eyes(pile, HEAD_Y + 0.11, 0.26, 0.15);
  },
};

export function buildHero(id: CharacterId): Mesh {
  const pile = new Pile();
  BUILDERS[id](pile);
  return new Mesh(pile.build(), paintedMaterial());
}

export function buildDisguise(): Mesh {
  const pile = new Pile();
  pile.add(box, { y: 0.42, sx: 0.86, sy: 0.84, sz: 0.86 }, 0xc9975b);
  pile.add(box, { y: 0.86, sx: 0.88, sy: 0.04, sz: 0.1 }, 0xeed3a3);
  pile.add(box, { y: 0.87, x: -0.3, z: 0.46, sx: 0.32, sy: 0.04, sz: 0.34, rx: 0.7 }, 0xb8854c);
  pile.add(box, { y: 0.87, x: 0.3, z: -0.46, sx: 0.32, sy: 0.04, sz: 0.34, rx: -0.7 }, 0xb8854c);
  for (const side of [-1, 1]) {
    pile.add(ball, { x: 0.15 * side, y: 0.52, z: 0.44, s: 0.075 }, 0xffffff);
    pile.add(ball, { x: 0.15 * side, y: 0.52, z: 0.5, s: 0.04 }, 0x1b1430);
  }
  return new Mesh(pile.build(), paintedMaterial());
}

export const ROBOT_HEIGHT = 1.3;
/** Where the googly eyes sit on the model, so the pupils can look about. */
export const EYE = { x: 0.19, y: 1.1, z: 0.26 };

/** The goofy patrol robot: a yellow tin box on tank treads, with a red lid, huge eyes on top and a tall antenna. */
export function robotPile(): Pile {
  const pile = new Pile();
  for (const side of [-1, 1]) pile.add(box, { x: 0.3 * side, y: 0.08, sx: 0.2, sy: 0.16, sz: 0.74 }, 0x23264f);
  pile.add(box, { y: 0.44, sx: 0.72, sy: 0.56, sz: 0.62 }, 0xffd21f);
  pile.add(box, { y: 0.44, z: 0.31, sx: 0.42, sy: 0.3, sz: 0.04 }, 0x20335e);
  pile.add(ball, { x: -0.1, y: 0.5, z: 0.34, s: 0.06 }, 0xff2e4d);
  pile.add(ball, { x: 0.1, y: 0.5, z: 0.34, s: 0.06 }, 0x35f07a);
  pile.add(box, { y: 0.38, z: 0.34, sx: 0.26, sy: 0.05, sz: 0.03 }, 0xffd21f);
  for (const side of [-1, 1]) {
    pile.add(drum, { x: 0.46 * side, y: 0.56, sx: 0.07, sy: 0.3, sz: 0.07, rz: (Math.PI / 2 - 0.5) * side }, 0xdfe6f5);
    pile.add(ball, { x: 0.6 * side, y: 0.66, s: 0.1 }, 0xff4fd8);
  }
  pile.add(box, { y: 0.84, sx: 0.66, sy: 0.3, sz: 0.56 }, 0xdfe6f5);
  pile.add(box, { y: 1.02, sx: 0.72, sy: 0.08, sz: 0.62 }, 0xff2e4d);
  for (const side of [-1, 1]) pile.add(ball, { x: EYE.x * side, y: EYE.y - 0.02, z: EYE.z - 0.1, s: 0.2 }, 0xffffff);
  pile.add(box, { y: 0.8, z: 0.29, sx: 0.34, sy: 0.05, sz: 0.03 }, 0x20335e);
  pile.add(drum, { z: -0.14, y: 1.32, sx: 0.025, sy: 0.5, sz: 0.025 }, 0xdfe6f5);
  pile.add(ball, { z: -0.14, y: 1.6, s: 0.1 }, 0xff2e4d);
  return pile;
}
