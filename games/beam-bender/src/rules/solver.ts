import type { Board } from './board.ts';
import type { Frame } from './play.ts';
import { allLit, traceBeams } from './trace.ts';

/** Above this a board is too big to search, and the test for it fails loudly. */
const MOST_STATES = 1 << 25;

/** Reads the board's statess, so a search can use flat arrays instead of objects. */
class Space {
  readonly board: Board;
  readonly size: number;
  readonly configs: number;
  private readonly radix: number[];
  private readonly padBits: number;
  private readonly blockBits: number;
  private readonly memo: Int32Array;

  constructor(board: Board) {
    this.board = board;
    this.padBits = board.pads.length;
    this.blockBits = board.blocks.length;
    let turnStates = 1;
    this.radix = board.pieces.map(({ turns }) => {
      const place = turnStates;
      turnStates *= turns;
      return place;
    });
    this.configs = turnStates << this.blockBits;
    this.size = this.configs * 2 ** this.padBits;
    if (this.size > MOST_STATES) throw new Error(`Board has ${this.size} states`);
    this.memo = new Int32Array(this.configs).fill(-1);
  }

  encode({ turns, blocks, pressed }: Frame): number {
    let value = 0;
    turns.forEach((turn, index) => {
      value += turn * this.radix[index];
    });
    return ((value << this.blockBits) + blocks) * 2 ** this.padBits + pressed;
  }

  private turnsOf(config: number): number[] {
    const turnKey = Math.floor(config / 2 ** this.blockBits);
    return this.board.pieces.map(({ turns }, index) => Math.floor(turnKey / this.radix[index]) % turns);
  }

  /** What light does for one arrangement: won in bit 0, secret in bit 1, pressed pads above. */
  private sense(config: number): number {
    const known = this.memo[config];
    if (known >= 0) return known;
    const blocks = config & ((1 << this.blockBits) - 1);
    const trace = traceBeams(this.board, this.turnsOf(config), blocks);
    const value = (allLit(this.board, trace) ? 1 : 0) | (trace.secret ? 2 : 0) | (trace.pressed << 2);
    this.memo[config] = value;
    return value;
  }

  private pressedIn(config: number): number {
    return this.sense(config) >> 2;
  }

  won(state: number): boolean {
    return (this.sense(Math.floor(state / 2 ** this.padBits)) & 1) === 1;
  }

  secret(state: number): boolean {
    return (this.sense(Math.floor(state / 2 ** this.padBits)) & 2) === 2;
  }

  /** The state after tapping a piece. Must agree with `settle`, which a test checks. */
  next(state: number, piece: number): number {
    const padSpan = 2 ** this.padBits;
    const config = Math.floor(state / padSpan);
    let pressed = state % padSpan;
    const { turns } = this.board.pieces[piece];
    const place = this.radix[piece] * 2 ** this.blockBits;
    const turn = Math.floor(config / place) % turns;
    let moved = config + ((turn + 1) % turns - turn) * place;
    if (this.padBits === 0) return moved;
    for (let step = 0; step < 8; step += 1) {
      const nowPressed = this.pressedIn(moved);
      const arrived = nowPressed & ~pressed;
      pressed = nowPressed;
      if (arrived === 0) break;
      let flip = 0;
      this.board.pads.forEach((pad, index) => {
        if ((arrived >> index) & 1) flip ^= 1 << pad.block;
      });
      moved ^= flip;
    }
    return moved * padSpan + pressed;
  }

  startState(frame?: Frame): number {
    if (frame) return this.encode(frame);
    const turns = this.board.pieces.map(({ start }) => start);
    const { pressed } = traceBeams(this.board, turns, 0);
    return this.encode({ turns, blocks: 0, pressed });
  }
}

export interface Solution {
  moves: number;
  taps: number[];
}

/** The shortest way to win from a frame (or from the start), trying only up to `limit` taps. */
export function solve(board: Board, frame?: Frame, limit = Infinity): Solution | null {
  const space = new Space(board);
  const start = space.startState(frame);
  if (space.won(start)) return { moves: 0, taps: [] };
  // Each state remembers the state before it and the piece tapped to leave it.
  const cameFrom = new Int32Array(space.size).fill(-1);
  const tapped = new Int8Array(space.size);
  cameFrom[start] = start;
  let layer = [start];
  for (let depth = 0; depth < limit && layer.length > 0; depth += 1) {
    const nextLayer: number[] = [];
    for (const state of layer) {
      for (let piece = 0; piece < board.pieces.length; piece += 1) {
        const after = space.next(state, piece);
        if (cameFrom[after] >= 0) continue;
        cameFrom[after] = state;
        tapped[after] = piece;
        if (space.won(after)) return walkBack(cameFrom, tapped, after);
        nextLayer.push(after);
      }
    }
    layer = nextLayer;
  }
  return null;
}

function walkBack(cameFrom: Int32Array, tapped: Int8Array, end: number): Solution {
  const taps: number[] = [];
  for (let state = end; cameFrom[state] !== state; state = cameFrom[state]) taps.push(tapped[state]);
  taps.reverse();
  return { moves: taps.length, taps };
}

export interface Analysis {
  /** Fewest taps that win. */
  minMoves: number;
  /** Pieces that lie on no shortest win when tapped first. */
  wrongFirst: number;
  /** Pieces that, tapped first, can no longer win within the limit. */
  deadFirst: number;
  /** Different boards reachable within the limit. */
  reachable: number;
  /** Different winning boards reachable within the limit. */
  wins: number;
  /** Exact chance that tapping pieces at random wins before the limit. */
  blindChance: number;
  /** A win can also show the light on the hidden target within the limit. */
  secretWithin: boolean;
  /** One tap can light every target from none, within the limit. */
  discoPossible: boolean;
}

interface Graph {
  space: Space;
  states: number[];
  index: Map<number, number>;
  edges: Int32Array;
  depth: number[];
}

/** Every board reachable within `limit` taps, stopping at wins. */
function explore(board: Board, limit: number): Graph {
  const space = new Space(board);
  const count = board.pieces.length;
  const states = [space.startState()];
  const index = new Map([[states[0], 0]]);
  const depth = [0];
  const edges: number[] = [];
  for (let at = 0; at < states.length; at += 1) {
    const state = states[at];
    const open = !space.won(state) && depth[at] < limit;
    for (let piece = 0; piece < count; piece += 1) {
      if (!open) {
        edges.push(-1);
        continue;
      }
      const after = space.next(state, piece);
      let id = index.get(after);
      if (id === undefined) {
        id = states.length;
        index.set(after, id);
        states.push(after);
        depth.push(depth[at] + 1);
      }
      edges.push(id);
    }
  }
  return { space, states, index, edges: Int32Array.from(edges), depth };
}

/** Taps left to a win, by walking the graph backwards from every win. */
function distances(graph: Graph, pieces: number): Int32Array {
  const { space, states, edges } = graph;
  const back: number[][] = states.map(() => []);
  for (let from = 0; from < states.length; from += 1) {
    for (let piece = 0; piece < pieces; piece += 1) {
      const to = edges[from * pieces + piece];
      if (to >= 0) back[to].push(from);
    }
  }
  const left = new Int32Array(states.length).fill(-1);
  let layer: number[] = [];
  states.forEach((state, id) => {
    if (space.won(state)) {
      left[id] = 0;
      layer.push(id);
    }
  });
  for (let step = 1; layer.length > 0; step += 1) {
    const nextLayer: number[] = [];
    for (const id of layer) {
      for (const from of back[id]) {
        if (left[from] >= 0) continue;
        left[from] = step;
        nextLayer.push(from);
      }
    }
    layer = nextLayer;
  }
  return left;
}

/** Chance of winning by tapping at random, tap by tap. */
function blindOdds(graph: Graph, pieces: number, limit: number): number {
  const { space, states, edges } = graph;
  const winning = states.map((state) => space.won(state));
  let odds = new Float64Array(states.length);
  winning.forEach((won, id) => {
    if (won) odds[id] = 1;
  });
  for (let left = 1; left <= limit; left += 1) {
    const next = new Float64Array(states.length);
    for (let id = 0; id < states.length; id += 1) {
      if (winning[id]) {
        next[id] = 1;
        continue;
      }
      let sum = 0;
      for (let piece = 0; piece < pieces; piece += 1) {
        const to = edges[id * pieces + piece];
        if (to >= 0) sum += odds[to];
      }
      next[id] = sum / pieces;
    }
    odds = next;
  }
  return odds[0];
}

/** Is there a path that shows the hidden target and still wins in time? */
function secretPath({ space, states, depth }: Graph, limit: number, left: Int32Array): boolean {
  return states.some((state, id) => space.secret(state) && left[id] >= 0 && depth[id] + left[id] <= limit);
}

/** Can one tap ever light every target from none? */
function discoReachable(graph: Graph, board: Board): boolean {
  const pieces = board.pieces.length;
  if (board.targets.length < 2) return false;
  const dark = graph.states.map((state) => {
    const frame = decodeFrame(board, state);
    return traceBeams(board, frame.turns, frame.blocks).lit === 0;
  });
  return graph.states.some((state, id) => {
    if (!graph.space.won(state)) return false;
    return dark.some((isDark, from) => {
      if (!isDark) return false;
      for (let piece = 0; piece < pieces; piece += 1) if (graph.edges[from * pieces + piece] === id) return true;
      return false;
    });
  });
}

function decodeFrame(board: Board, state: number): Frame {
  const padSpan = 2 ** board.pads.length;
  const config = Math.floor(state / padSpan);
  const blocks = config & ((1 << board.blocks.length) - 1);
  let turnKey = Math.floor(config / 2 ** board.blocks.length);
  const turns = board.pieces.map(({ turns: count }) => {
    const turn = turnKey % count;
    turnKey = Math.floor(turnKey / count);
    return turn;
  });
  return { turns, blocks, pressed: state % padSpan };
}

/** Everything the tests want to know about a level. */
export function analyse(board: Board, limit: number): Analysis {
  const pieces = board.pieces.length;
  const graph = explore(board, limit);
  const left = distances(graph, pieces);
  const minMoves = left[0];
  let wrongFirst = 0;
  let deadFirst = 0;
  for (let piece = 0; piece < pieces; piece += 1) {
    const to = graph.edges[piece];
    const remaining = to >= 0 ? left[to] : -1;
    if (remaining !== minMoves - 1) wrongFirst += 1;
    if (remaining < 0 || remaining + 1 > limit) deadFirst += 1;
  }
  return {
    minMoves,
    wrongFirst,
    deadFirst,
    reachable: graph.states.length,
    wins: graph.states.filter((state) => graph.space.won(state)).length,
    blindChance: blindOdds(graph, pieces, limit),
    secretWithin: board.secret >= 0 && secretPath(graph, limit, left),
    discoPossible: discoReachable(graph, board),
  };
}

export { Space };
