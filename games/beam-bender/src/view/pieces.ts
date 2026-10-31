import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  Shape,
  TetrahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Camera,
  type Material,
} from 'three';
import type { Board, Color as BeamColor, Piece } from '../rules/board.ts';
import type { Play } from '../rules/play.ts';
import { additive, BEAM_COLORS, flat, haloTexture, LINK_COLORS, PALETTE, PORTAL_COLORS } from './look.ts';

const HALF = 0.43;
const WEDGE_HEIGHT = 0.46;
const STRIP = HALF * 2 * Math.SQRT2;
const TILE_DEPTH = 0.3;
const RIM = 0.1;
const SPIN_RATE = 20;
const SLIDE_RATE = 14;
const LIT_SCALE = 1.14;
const POP_SECONDS = 0.16;
const GLINT_EVERY = 3.6;
const GLINT_SECONDS = 0.5;
const PUFFS = 6;
const PUFF_SECONDS = 1.1;

function wedgeGeometry(): ExtrudeGeometry {
  // The solid half sits south-west, so turn 0 leaves the north and east sides as the working sides.
  const shape = new Shape();
  shape.moveTo(-HALF, HALF);
  shape.lineTo(HALF, -HALF);
  shape.lineTo(-HALF, -HALF);
  shape.closePath();
  const wedge = new ExtrudeGeometry(shape, { depth: WEDGE_HEIGHT, bevelEnabled: false });
  wedge.rotateX(-Math.PI / 2);
  return wedge;
}

function stripGeometry(thickness: number, height: number): BoxGeometry {
  const strip = new BoxGeometry(STRIP, height, thickness);
  strip.rotateY(-Math.PI / 4);
  strip.translate(0, height / 2, 0);
  return strip;
}

/** Shapes and paints are shared by every board. */
class Kit {
  readonly wedge = wedgeGeometry();
  readonly mirrorFace = stripGeometry(0.09, WEDGE_HEIGHT + 0.02);
  readonly doubleFace = stripGeometry(0.15, WEDGE_HEIGHT + 0.02);
  readonly glassFace = stripGeometry(0.1, WEDGE_HEIGHT);
  readonly puck = new CylinderGeometry(0.47, 0.5, 0.08, 16);
  readonly ring = new TorusGeometry(0.4, 0.07, 6, 18);
  readonly disc = new CylinderGeometry(0.34, 0.34, 0.03, 18);
  readonly crate = new BoxGeometry(0.86, 0.56, 0.86);
  readonly lid = new BoxGeometry(0.62, 0.06, 0.62);
  readonly pad = new CylinderGeometry(0.3, 0.34, 0.16, 12);
  readonly padBase = new CylinderGeometry(0.42, 0.46, 0.08, 12);
  readonly pipe = new CylinderGeometry(0.22, 0.27, 0.6, 8);
  readonly nozzle = new ConeGeometry(0.2, 0.26, 8);
  readonly mount = new BoxGeometry(0.62, 0.14, 0.62);
  readonly pedestal = new CylinderGeometry(0.2, 0.3, 0.14, 8);
  readonly socket = new TorusGeometry(0.38, 0.045, 6, 20);
  readonly glassBlock = new BoxGeometry(0.72, 0.56, 0.72);
  readonly halo = new PlaneGeometry(1.8, 1.8);
  readonly track = new BoxGeometry(1, 0.02, 0.2);
  readonly gems: Record<BeamColor, BufferGeometry> = {
    white: new OctahedronGeometry(0.36),
    red: new TetrahedronGeometry(0.46),
    green: new IcosahedronGeometry(0.36),
    blue: new ConeGeometry(0.33, 0.6, 6),
  };

  readonly face = new MeshBasicMaterial({ color: PALETTE.chrome, toneMapped: false });
  readonly faceDim = flat(0xc4d8f0);
  readonly body = flat(PALETTE.copper);
  readonly bodyDark = flat(0x7a3820);
  readonly puckPaint = flat(PALETTE.steelDark);
  readonly glass = new MeshLambertMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.62, flatShading: true });
  readonly crateSteel = flat(PALETTE.steel);
  readonly lidSteel = flat(0x74829f);
  readonly laserBody = flat(PALETTE.brass);
  readonly mountPaint = flat(PALETTE.steelDark);
  readonly haloMap = haloTexture();
  private readonly paints = new Map<string, Material>();

  paint(key: string, make: () => Material): Material {
    let known = this.paints.get(key);
    if (!known) {
      known = make();
      this.paints.set(key, known);
    }
    return known;
  }

  gemPaint(color: BeamColor, lit: boolean): Material {
    const hex = BEAM_COLORS[color];
    return this.paint(`gem-${color}-${lit}`, () => (lit ? new MeshBasicMaterial({ color: hex, toneMapped: false }) : flat(darken(hex, 0.7), darken(hex, 0.3))));
  }
}

const darken = (hex: number, by = 0.42): number => {
  const part = (shift: number): number => Math.round(((hex >> shift) & 255) * by);
  return (part(16) << 16) | (part(8) << 8) | part(0);
};

interface PieceView {
  group: Group;
  face: Mesh;
  angle: number;
  goal: number;
  period: number;
  pop: number;
}

interface TargetView {
  gem: Mesh;
  halo: Mesh;
  color: BeamColor;
  lit: boolean;
  wrong: number;
  phase: number;
}

interface BlockView {
  group: Group;
  x: number;
  z: number;
}

interface PadView {
  cap: Mesh;
  y: number;
}

interface LaserView {
  group: Group;
  turn: number;
}

/** Everything on the tray for one level. Rebuilt per level, with shapes and paints shared. */
export class BoardPieces {
  readonly group = new Group();
  private readonly kit = new Kit();
  private readonly dummy = new Object3D();
  private readonly camera: Camera;
  private board: Board | null = null;
  private pieces: PieceView[] = [];
  private targets: TargetView[] = [];
  private blocks: BlockView[] = [];
  private pads: PadView[] = [];
  private lasers: LaserView[] = [];
  private portals: Mesh[] = [];
  private readonly puffs: Mesh[] = [];
  private secretGem: Mesh | null = null;
  private secretGlint: Mesh | null = null;
  private clock = 0;
  private fizzle = 0;

  constructor(camera: Camera) {
    this.camera = camera;
  }

  worldX = (x: number): number => x - ((this.board?.width ?? 1) - 1) / 2;
  worldZ = (y: number): number => y - ((this.board?.height ?? 1) - 1) / 2;
  private tileX = (at: number): number => this.worldX(at % (this.board?.width ?? 1));
  private tileZ = (at: number): number => this.worldZ(Math.floor(at / (this.board?.width ?? 1)));

  private clear(): void {
    this.group.traverse((item) => {
      if (item instanceof InstancedMesh) item.dispose();
    });
    this.group.clear();
    this.pieces = [];
    this.targets = [];
    this.blocks = [];
    this.pads = [];
    this.lasers = [];
    this.portals = [];
    this.puffs.length = 0;
    this.secretGem = null;
    this.secretGlint = null;
  }

  private tray(board: Board): void {
    const { width, height } = board;
    const tiles = new InstancedMesh(new BoxGeometry(0.97, TILE_DEPTH, 0.97), flat(0xffffff), width * height);
    const dummy = this.dummy;
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    const light = flat(PALETTE.tileA).color;
    const lighter = flat(PALETTE.tileB).color;
    for (let at = 0; at < width * height; at += 1) {
      dummy.position.set(this.tileX(at), -TILE_DEPTH / 2, this.tileZ(at));
      dummy.updateMatrix();
      tiles.setMatrixAt(at, dummy.matrix);
      tiles.setColorAt(at, (at % width) % 2 === Math.floor(at / width) % 2 ? light : lighter);
    }
    const rim = new Mesh(new BoxGeometry(width + RIM * 2, 0.22, height + RIM * 2), flat(PALETTE.rim));
    rim.position.y = -0.2;
    this.group.add(tiles, rim);
  }

  private add(geometry: BufferGeometry, material: Material, x: number, y: number, z: number, parent: Object3D = this.group): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  private walls(board: Board): void {
    if (board.walls.length === 0) return;
    const count = board.walls.length;
    const crates = new InstancedMesh(this.kit.crate, this.kit.crateSteel, count);
    const lids = new InstancedMesh(this.kit.lid, this.kit.lidSteel, count);
    board.walls.forEach((at, index) => {
      this.dummy.position.set(this.tileX(at), 0.28, this.tileZ(at));
      this.dummy.updateMatrix();
      crates.setMatrixAt(index, this.dummy.matrix);
      this.dummy.position.y = 0.58;
      this.dummy.updateMatrix();
      lids.setMatrixAt(index, this.dummy.matrix);
    });
    this.group.add(crates, lids);
  }

  private piece(piece: Piece): void {
    const { kit } = this;
    const holder = new Group();
    holder.position.set(this.tileX(piece.at), 0, this.tileZ(piece.at));
    this.add(kit.puck, kit.puckPaint, 0, 0.04, 0, holder);
    const group = new Group();
    group.position.y = 0.08;
    holder.add(group);
    let face: Mesh;
    if (piece.kind === 'mirror') {
      this.add(kit.wedge, kit.body, 0, 0, 0, group);
      face = this.add(kit.mirrorFace, kit.face, 0, 0, 0, group);
    } else if (piece.kind === 'double') {
      face = this.add(kit.doubleFace, kit.face, 0, 0, 0, group);
    } else {
      face = this.add(kit.glassFace, kit.glass, 0, 0, 0, group);
    }
    this.group.add(holder);
    const angle = (-piece.start * Math.PI) / 2;
    group.rotation.y = angle;
    this.pieces.push({ group, face, angle, goal: angle, period: piece.turns === 4 ? Math.PI * 2 : Math.PI, pop: 0 });
  }

  private target(at: number, color: BeamColor): void {
    const { kit } = this;
    const x = this.tileX(at);
    const z = this.tileZ(at);
    this.add(kit.pedestal, kit.mountPaint, x, 0.07, z);
    this.add(kit.socket, kit.paint(`socket-${color}`, () => new MeshBasicMaterial({ color: BEAM_COLORS[color], toneMapped: false })), x, 0.04, z).rotation.x = Math.PI / 2;
    const gem = this.add(kit.gems[color], kit.gemPaint(color, false), x, 0.42, z);
    const halo = this.add(kit.halo, kit.paint(`halo-${color}`, () => additive(kit.haloMap, BEAM_COLORS[color], 0.9)), x, 0.42, z);
    halo.visible = false;
    halo.renderOrder = 4;
    halo.quaternion.copy(this.camera.quaternion);
    this.targets.push({ gem, halo, color, lit: false, wrong: 0, phase: at });
  }

  private laser(at: number, dir: number, color: BeamColor): void {
    const { kit } = this;
    const group = new Group();
    group.position.set(this.tileX(at), 0, this.tileZ(at));
    group.rotation.y = -dir * (Math.PI / 2);
    this.add(kit.mount, kit.mountPaint, 0, 0.07, 0, group);
    const pipe = this.add(kit.pipe, kit.laserBody, 0, 0.3, 0.02, group);
    pipe.rotation.x = -Math.PI / 2;
    const nozzle = this.add(kit.nozzle, kit.paint(`laser-${color}`, () => new MeshBasicMaterial({ color: BEAM_COLORS[color], toneMapped: false })), 0, 0.3, -0.36, group);
    nozzle.rotation.x = -Math.PI / 2;
    this.group.add(group);
    this.lasers.push({ group, turn: group.rotation.y });
  }

  private filter(at: number, color: BeamColor): void {
    const { kit } = this;
    const paint = kit.paint(`filter-${color}`, () => new MeshLambertMaterial({ color: BEAM_COLORS[color], emissive: BEAM_COLORS[color], emissiveIntensity: 0.35, transparent: true, opacity: 0.55, depthWrite: false }));
    this.add(kit.glassBlock, paint, this.tileX(at), 0.28, this.tileZ(at));
    this.add(kit.mount, kit.mountPaint, this.tileX(at), 0.02, this.tileZ(at));
  }

  private portal(at: number, pair: number): void {
    const { kit } = this;
    const color = PORTAL_COLORS[pair % PORTAL_COLORS.length];
    const x = this.tileX(at);
    const z = this.tileZ(at);
    const ring = this.add(kit.ring, kit.paint(`ring-${pair}`, () => flat(color, color)), x, 0.1, z);
    ring.rotation.x = Math.PI / 2;
    const disc = this.add(kit.disc, kit.paint(`disc-${pair}`, () => new MeshBasicMaterial({ color: darken(color, 0.7), toneMapped: false })), x, 0.07, z);
    this.portals.push(disc);
  }

  private block(index: number): void {
    const { kit } = this;
    const spot = this.board?.blocks[index];
    if (!spot) return;
    const color = LINK_COLORS[index % LINK_COLORS.length];
    const group = new Group();
    const x = this.tileX(spot.home);
    const z = this.tileZ(spot.home);
    const awayX = this.tileX(spot.away);
    const awayZ = this.tileZ(spot.away);
    group.position.set(x, 0, z);
    this.add(kit.crate, kit.paint('crate', () => flat(PALETTE.crate)), 0, 0.28, 0, group);
    this.add(kit.lid, kit.paint(`link-${index}`, () => flat(color, darken(color, 0.5))), 0, 0.58, 0, group);
    this.group.add(group);
    const track = this.add(kit.track, kit.paint(`track-${index}`, () => flat(darken(color, 0.7), darken(color, 0.3))), (x + awayX) / 2, 0.015, (z + awayZ) / 2);
    track.scale.x = Math.hypot(awayX - x, awayZ - z) + 0.5;
    track.rotation.y = -Math.atan2(awayZ - z, awayX - x);
    const mark = this.add(kit.lid, kit.paint(`track-${index}`, () => flat(darken(color, 0.7), darken(color, 0.3))), awayX, 0.01, awayZ);
    mark.scale.y = 0.2;
    this.add(kit.lid, kit.paint(`track-${index}`, () => flat(darken(color, 0.7), darken(color, 0.3))), x, 0.01, z).scale.y = 0.2;
    this.blocks.push({ group, x, z });
  }

  private pad(at: number, link: number): void {
    const { kit } = this;
    const color = LINK_COLORS[link % LINK_COLORS.length];
    const x = this.tileX(at);
    const z = this.tileZ(at);
    this.add(kit.padBase, kit.mountPaint, x, 0.04, z);
    const cap = this.add(kit.pad, kit.paint(`link-${link}`, () => flat(color, darken(color, 0.5))), x, 0.17, z);
    this.pads.push({ cap, y: 0.17 });
  }

  /** Nothing to see on a hidden target's tile but a rare glint, until light finds it. */
  private secret(at: number): void {
    const { kit } = this;
    const x = this.tileX(at);
    const z = this.tileZ(at);
    this.secretGlint = this.add(kit.halo, kit.paint('glint', () => additive(kit.haloMap, 0xcfeeff, 0.8)), x, 0.2, z);
    this.secretGlint.scale.setScalar(0.001);
    this.secretGlint.renderOrder = 4;
    this.secretGem = this.add(kit.gems.white, kit.paint('secret-gem', () => new MeshBasicMaterial({ color: 0x9fe8ff, toneMapped: false })), x, 0.3, z);
    this.secretGem.scale.setScalar(0.62);
    this.secretGem.visible = false;
  }

  private smoke(): void {
    const { kit } = this;
    const laser = this.lasers[0]?.group;
    if (!laser) return;
    const paint = kit.paint('puff', () => additive(kit.haloMap, 0x8d88a8, 0.75));
    for (let puff = 0; puff < PUFFS; puff += 1) {
      const mesh = this.add(kit.halo, paint, laser.position.x, 0.5, laser.position.z);
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.puffs.push(mesh);
    }
  }

  /** Lays out a level's tray. */
  build(board: Board, play: Play): void {
    this.clear();
    this.board = board;
    this.fizzle = 0;
    this.tray(board);
    this.walls(board);
    board.pieces.forEach((piece) => this.piece(piece));
    board.targets.forEach(({ at, color }) => this.target(at, color));
    board.lasers.forEach(({ at, dir, color }) => this.laser(at, dir, color));
    board.filters.forEach(({ at, color }) => this.filter(at, color));
    board.portals.forEach(({ at, pair }) => this.portal(at, pair));
    board.blocks.forEach((_, index) => this.block(index));
    board.pads.forEach(({ at, block }) => this.pad(at, block));
    if (board.secret >= 0) this.secret(board.secret);
    this.smoke();
    this.show(play);
  }

  /** Makes the tray match a play. Spins and slides happen in `tick`. */
  show(play: Play): void {
    const { board, frame, trace } = play;
    this.pieces.forEach((view, index) => {
      const goal = (-frame.turns[index] * Math.PI) / 2;
      let delta = (goal - view.angle) % view.period;
      if (delta > view.period / 2 - 0.001) delta -= view.period;
      if (delta <= -view.period / 2 - 0.001) delta += view.period;
      if (Math.abs(delta) > 0.001) view.pop = POP_SECONDS;
      view.goal = view.angle + delta;
      view.face.material = (trace.touched >> index) & 1 ? this.kit.face : board.pieces[index].kind === 'splitter' ? this.kit.glass : this.kit.faceDim;
    });
    this.targets.forEach((view, index) => {
      const lit = ((trace.lit >> index) & 1) === 1;
      view.lit = lit;
      view.wrong = (trace.wrong >> index) & 1;
      view.gem.material = this.kit.gemPaint(view.color, lit);
      view.halo.visible = lit;
    });
    if (this.secretGem) this.secretGem.visible = play.secret;
    this.pads.forEach((view, index) => {
      view.cap.position.y = (frame.pressed >> index) & 1 ? view.y - 0.09 : view.y;
    });
  }

  /** Puts every moving thing straight where it belongs, for a new try. */
  snap(play: Play): void {
    this.show(play);
    this.fizzle = 0;
    for (const puff of this.puffs) puff.visible = false;
    for (const view of this.pieces) {
      view.angle = view.goal;
      view.group.rotation.y = view.angle;
      view.pop = 0;
    }
    this.blocks.forEach((view, index) => {
      const spot = play.board.blocks[index];
      const at = (play.frame.blocks >> index) & 1 ? spot.away : spot.home;
      view.group.position.set(this.tileX(at), 0, this.tileZ(at));
    });
    for (const { group, turn } of this.lasers) {
      group.rotation.set(0, turn, 0);
      group.position.y = 0;
    }
  }

  startFizzle(): void {
    this.fizzle = 0.001;
  }

  private tickBlocks(play: Play, ease: number): void {
    this.blocks.forEach((view, index) => {
      const spot = play.board.blocks[index];
      const at = (play.frame.blocks >> index) & 1 ? spot.away : spot.home;
      view.group.position.x += (this.tileX(at) - view.group.position.x) * ease;
      view.group.position.z += (this.tileZ(at) - view.group.position.z) * ease;
    });
  }

  tick(seconds: number, play: Play | null, still: boolean): void {
    this.clock += still ? 0 : seconds;
    const spin = still ? 1 : Math.min(1, seconds * SPIN_RATE);
    for (const view of this.pieces) {
      view.angle += (view.goal - view.angle) * spin;
      view.group.rotation.y = view.angle;
      view.pop = Math.max(0, view.pop - seconds);
      const scale = still ? 1 : 1 + (view.pop / POP_SECONDS) * 0.12;
      view.group.scale.set(scale, scale, scale);
    }
    if (play) this.tickBlocks(play, still ? 1 : Math.min(1, seconds * SLIDE_RATE));
    for (const view of this.targets) {
      view.gem.rotation.y += still ? 0 : seconds * (view.lit ? 2.6 : 0.5);
      // The wrong color makes a crystal shiver, so it's plain that light arrived but didn't count.
      view.gem.rotation.z = view.wrong && !still ? Math.sin(this.clock * 40) * 0.16 : 0;
      if (!still) view.gem.position.y = 0.44 + Math.sin(this.clock * 2 + view.phase) * 0.04;
      view.gem.scale.setScalar(view.lit ? LIT_SCALE : 1);
      view.halo.quaternion.copy(this.camera.quaternion);
      if (view.lit && !still) view.halo.scale.setScalar(1 + Math.sin(this.clock * 5 + view.phase) * 0.1);
    }
    for (const disc of this.portals) if (!still) disc.scale.setScalar(0.9 + Math.sin(this.clock * 4) * 0.12);
    if (this.fizzle > 0) this.tickFizzle(seconds, still);
    this.tickGlint(still);
  }

  private tickGlint(still: boolean): void {
    const glint = this.secretGlint;
    if (!glint) return;
    const beat = this.clock % GLINT_EVERY;
    const size = !still && beat < GLINT_SECONDS ? Math.sin((beat / GLINT_SECONDS) * Math.PI) * 0.42 : 0.001;
    glint.scale.setScalar(size);
    glint.quaternion.copy(this.camera.quaternion);
  }

  private tickFizzle(seconds: number, still: boolean): void {
    this.fizzle += seconds;
    const droop = Math.min(this.fizzle / 0.5, 1);
    for (const { group, turn } of this.lasers) {
      group.rotation.y = turn + (still ? 0 : Math.sin(this.fizzle * 34) * 0.16 * (1 - droop));
      group.rotation.x = 0;
      group.rotation.z = still ? 0 : droop * 0.18;
    }
    if (still) return;
    this.puffs.forEach((puff, index) => {
      const age = (this.fizzle - index * 0.09) / PUFF_SECONDS;
      puff.visible = age > 0 && age < 1;
      puff.position.y = 0.5 + age * 1.3;
      puff.position.x += Math.sin(index * 2.2) * seconds * 0.5;
      puff.scale.setScalar(0.3 + age * 0.7);
      puff.quaternion.copy(this.camera.quaternion);
    });
  }
}
