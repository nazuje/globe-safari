import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, TorusGeometry, type Scene } from 'three';
import { additive, flat, haloTexture, PALETTE, PORTAL_COLORS } from './look.ts';

const PLANKS = 18;
const PLANK_DEPTH = 2.4;
const PLANK_WIDTH = 60;
const BENCH_Y = -0.42;
const TEETH = 10;

function bench(group: Group): void {
  const planks = new InstancedMesh(new BoxGeometry(PLANK_WIDTH, 0.3, PLANK_DEPTH - 0.06), flat(0xffffff), PLANKS);
  const dummy = new Object3D();
  const tint = new Color();
  for (let plank = 0; plank < PLANKS; plank += 1) {
    dummy.position.set((plank * 7) % 5, BENCH_Y - 0.15, (plank - PLANKS / 2) * PLANK_DEPTH);
    dummy.updateMatrix();
    planks.setMatrixAt(plank, dummy.matrix);
    planks.setColorAt(plank, tint.set(plank % 3 === 0 ? PALETTE.benchDark : PALETTE.bench));
  }
  group.add(planks);
}

/** A big brass cog lying on the bench. */
function gear(x: number, z: number, radius: number, spin: number): Group {
  const cog = new Group();
  const brass = flat(0x9c6a24);
  const disc = new Mesh(new CylinderGeometry(radius, radius, 0.16, 16), brass);
  const hole = new Mesh(new CylinderGeometry(radius * 0.3, radius * 0.3, 0.18, 12), flat(PALETTE.night));
  const teeth = new InstancedMesh(new BoxGeometry(radius * 0.3, 0.16, radius * 0.3), brass, TEETH);
  const dummy = new Object3D();
  for (let tooth = 0; tooth < TEETH; tooth += 1) {
    const angle = (tooth / TEETH) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    dummy.rotation.set(0, -angle, 0);
    dummy.updateMatrix();
    teeth.setMatrixAt(tooth, dummy.matrix);
  }
  cog.add(disc, hole, teeth);
  cog.position.set(x, BENCH_Y + 0.08, z);
  cog.rotation.y = spin;
  return cog;
}

/** A spanner, made of a handle and a head. */
function spanner(x: number, z: number, turn: number): Group {
  const tool = new Group();
  const steel = flat(PALETTE.steel);
  const handle = new Mesh(new BoxGeometry(3, 0.12, 0.38), steel);
  const head = new Mesh(new CylinderGeometry(0.46, 0.46, 0.14, 8), steel);
  const bite = new Mesh(new BoxGeometry(0.5, 0.16, 0.3), flat(PALETTE.bench));
  head.position.x = 1.6;
  bite.position.x = 1.86;
  tool.add(handle, head, bite);
  tool.position.set(x, BENCH_Y + 0.07, z);
  tool.rotation.y = turn;
  return tool;
}

/** An open pot of leftover light, glowing to itself. */
function pot(x: number, z: number, color: number, halo: ReturnType<typeof additive>): Group {
  const holder = new Group();
  const wall = new Mesh(new CylinderGeometry(0.42, 0.42, 0.5, 10), flat(PALETTE.steelDark));
  const light = new Mesh(new CylinderGeometry(0.34, 0.34, 0.04, 10), new MeshBasicMaterial({ color, toneMapped: false }));
  const lip = new Mesh(new TorusGeometry(0.42, 0.05, 6, 14), flat(PALETTE.brass));
  const glow = new Mesh(new PlaneGeometry(3.4, 3.4), halo);
  light.position.y = 0.26;
  lip.position.y = 0.26;
  lip.rotation.x = Math.PI / 2;
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.3;
  holder.add(wall, light, lip, glow);
  holder.position.set(x, BENCH_Y + 0.25, z);
  return holder;
}

/** A coil of wire. */
function spool(x: number, z: number, color: number): Group {
  const holder = new Group();
  const wire = new Mesh(new TorusGeometry(0.62, 0.3, 6, 14), flat(color));
  wire.rotation.x = Math.PI / 2;
  holder.add(wire);
  holder.position.set(x, BENCH_Y + 0.28, z);
  return holder;
}

/** The dark bench the board sits on, with a few toys left lying around it. */
export function buildRoom(scene: Scene): void {
  const room = new Group();
  bench(room);
  const halo = haloTexture();
  room.add(
    gear(-4.1, -4.4, 1.5, 0.3),
    gear(-1.6, -4.9, 0.9, 1.1),
    gear(5.6, 3.9, 1.3, 0.8),
    spanner(1.7, -4.1, 0.25),
    spanner(-5.9, 3.2, -1.1),
    pot(6.1, -2.4, PORTAL_COLORS[0], additive(halo, PORTAL_COLORS[0], 0.34)),
    pot(-1.7, 4.2, 0x37f7a0, additive(halo, 0x37f7a0, 0.34)),
    pot(1.9, 4.4, 0xff3b6b, additive(halo, 0xff3b6b, 0.34)),
    spool(-6.4, -1.4, PALETTE.copper),
    spool(6.2, 0.6, 0x356bb5),
  );
  scene.add(room);
}
