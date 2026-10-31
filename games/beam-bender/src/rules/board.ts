/** A level as data: the rows are drawn by hand, and nothing about a board is ever random. */

export type Color = 'white' | 'red' | 'green' | 'blue';
export type PieceKind = 'mirror' | 'double' | 'splitter';

/** North, east, south, west. Row 0 is the far edge of the board. */
export const STEP_X = [0, 1, 0, -1] as const;
export const STEP_Y = [-1, 0, 1, 0] as const;

export const COLOR_CODE: Record<Color, number> = { white: 0, red: 1, green: 2, blue: 3 };

export interface Laser {
  at: number;
  dir: number;
  color: Color;
}

export interface Target {
  at: number;
  color: Color;
}

/** Anything a finger can turn. A plain mirror has four faces, the others look the same after two turns. */
export interface Piece {
  at: number;
  kind: PieceKind;
  turns: number;
  start: number;
}

/** A crate on a short track. Pressing its switch slides it to the other end. */
export interface Block {
  home: number;
  away: number;
}

export interface Pad {
  at: number;
  block: number;
}

export interface Portal {
  at: number;
  mate: number;
  pair: number;
}

export interface Filter {
  at: number;
  color: Color;
}

export const Tile = { Empty: 0, Wall: 1, Laser: 2, Target: 3, Piece: 4, Filter: 5, Portal: 6, Pad: 7 } as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

export interface Board {
  width: number;
  height: number;
  tiles: Uint8Array;
  /** What's in a tile: an index into lasers, targets, pieces, filters, portals or pads. */
  items: Int8Array;
  walls: number[];
  lasers: Laser[];
  targets: Target[];
  pieces: Piece[];
  filters: Filter[];
  portals: Portal[];
  pads: Pad[];
  blocks: Block[];
  secret: number;
}

const LASER_DIRS: Record<string, number> = { '^': 0, '>': 1, v: 2, '<': 3 };
const COLORS: Record<string, Color> = { r: 'red', g: 'green', b: 'blue' };
const KINDS: Record<string, PieceKind> = { m: 'mirror', d: 'double', s: 'splitter' };

interface Draft extends Board {
  portalEnds: Map<string, number[]>;
  blockEnds: Map<string, Partial<Block>>;
}

function blockIndex(blockEnds: Draft['blockEnds'], name: string): number {
  if (!blockEnds.has(name)) blockEnds.set(name, {});
  return [...blockEnds.keys()].indexOf(name);
}

function placeBlockEnd(draft: Draft, token: string, at: number): void {
  const name = token.toLowerCase();
  blockIndex(draft.blockEnds, name);
  const ends = draft.blockEnds.get(name) as Partial<Block>;
  if (token === name) ends.away = at;
  else ends.home = at;
}

function placeItem(draft: Draft, tile: Tile, at: number, index: number): void {
  draft.tiles[at] = tile;
  draft.items[at] = index;
}

/** One cell of a row. Returns false when the token means nothing, so a typo fails loudly. */
function place(draft: Draft, token: string, at: number): boolean {
  const first = token[0] ?? '';
  const last = token.at(-1) ?? '';
  const color = (token.length > 1 ? COLORS[first] : undefined) ?? 'white';
  const kind = KINDS[first];
  if (token === '.') return true;
  if (token === '#') {
    draft.walls.push(at);
    placeItem(draft, Tile.Wall, at, 0);
  } else if (token === '?') {
    draft.secret = at;
  } else if (last in LASER_DIRS && token.length <= 2) {
    placeItem(draft, Tile.Laser, at, draft.lasers.length);
    draft.lasers.push({ at, dir: LASER_DIRS[last], color });
  } else if (token === 't' || (first === 't' && token.length === 2)) {
    placeItem(draft, Tile.Target, at, draft.targets.length);
    draft.targets.push({ at, color: (token.length === 2 && COLORS[last]) || 'white' });
  } else if (kind && /^[msd][0-3]$/.test(token)) {
    const turns = kind === 'mirror' ? 4 : 2;
    placeItem(draft, Tile.Piece, at, draft.pieces.length);
    draft.pieces.push({ at, kind, turns, start: Number(last) % turns });
  } else if (first === 'f' && token.length === 2 && COLORS[last]) {
    placeItem(draft, Tile.Filter, at, draft.filters.length);
    draft.filters.push({ at, color: COLORS[last] });
  } else if (first === 'p' && token.length === 2) {
    const ends = draft.portalEnds.get(last) ?? [];
    draft.portalEnds.set(last, [...ends, at]);
  } else if (first === 'x' && token.length === 2) {
    placeItem(draft, Tile.Pad, at, draft.pads.length);
    draft.pads.push({ at, block: blockIndex(draft.blockEnds, last) });
  } else if (/^[a-c]$/i.test(token)) {
    placeBlockEnd(draft, token, at);
  } else {
    return false;
  }
  return true;
}

function finishPortals(draft: Draft): void {
  [...draft.portalEnds.values()].forEach((ends, pair) => {
    const [one, two] = ends;
    if (one === undefined || two === undefined || ends.length !== 2) throw new Error('A portal needs exactly one mate');
    for (const [at, mate] of [[one, two], [two, one]] as const) {
      placeItem(draft, Tile.Portal, at, draft.portals.length);
      draft.portals.push({ at, mate, pair });
    }
  });
}

function finishBlocks(draft: Draft): void {
  for (const ends of draft.blockEnds.values()) {
    if (ends.home === undefined || ends.away === undefined) throw new Error('A block needs a home and an away spot');
    draft.blocks.push({ home: ends.home, away: ends.away });
  }
}

/** Reads a drawing, such as `['> . m2', '. . t']`, into a board. */
export function parseBoard(rows: readonly string[]): Board {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  const width = grid[0]?.length ?? 0;
  const height = grid.length;
  const draft: Draft = {
    width,
    height,
    tiles: new Uint8Array(width * height),
    items: new Int8Array(width * height),
    walls: [],
    lasers: [],
    targets: [],
    pieces: [],
    filters: [],
    portals: [],
    pads: [],
    blocks: [],
    secret: -1,
    portalEnds: new Map(),
    blockEnds: new Map(),
  };
  grid.forEach((row, y) => {
    if (row.length !== width) throw new Error(`Row ${y} is not ${width} wide: ${rows[y]}`);
    row.forEach((token, x) => {
      if (!place(draft, token, y * width + x)) throw new Error(`Unknown tile "${token}" in row ${y}`);
    });
  });
  finishPortals(draft);
  finishBlocks(draft);
  const { portalEnds: _ends, blockEnds: _spots, ...board } = draft;
  return board;
}
