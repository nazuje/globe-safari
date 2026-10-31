import { describe, expect, it } from 'vitest';
import { parseBoard } from './board.ts';
import { afterFilter, allLit, bounceDir, settle, traceBeams } from './trace.ts';

const NORTH = 0;
const EAST = 1;
const SOUTH = 2;
const WEST = 3;
const start = (rows: string[]): { turns: number[]; board: ReturnType<typeof parseBoard> } => {
  const board = parseBoard(rows);
  return { board, turns: board.pieces.map((piece) => piece.start) };
};

describe('parseBoard', () => {
  it('fails loudly on a typo', () => {
    expect(() => parseBoard(['> zz'])).toThrow('Unknown tile');
    expect(() => parseBoard(['> .', '.'])).toThrow('not 2 wide');
    expect(() => parseBoard(['p1 .'])).toThrow('mate');
    expect(() => parseBoard(['A .'])).toThrow('home and an away');
  });

  it('reads every kind of tile', () => {
    const board = parseBoard(['r> m3 d1 s0 fg', 'tb p1 p1 xa ?', 'A a # . t']);
    expect(board.lasers).toEqual([{ at: 0, dir: EAST, color: 'red' }]);
    expect(board.pieces.map(({ kind, start: turn, turns }) => [kind, turn, turns])).toEqual([
      ['mirror', 3, 4],
      ['double', 1, 2],
      ['splitter', 0, 2],
    ]);
    expect(board.targets.map(({ color }) => color)).toEqual(['blue', 'white']);
    expect(board.portals.map(({ mate }) => mate)).toEqual([7, 6]);
    expect(board.blocks).toEqual([{ home: 10, away: 11 }]);
    expect(board.pads).toEqual([{ at: 8, block: 0 }]);
    expect(board.secret).toBe(9);
  });
});

describe('mirrors', () => {
  it('bounces off the two working sides of a plain mirror and stops at its back', () => {
    const mirror = { kind: 'mirror' } as const;
    expect(bounceDir(mirror, 0, SOUTH)).toBe(EAST);
    expect(bounceDir(mirror, 0, WEST)).toBe(NORTH);
    expect(bounceDir(mirror, 0, NORTH)).toBe(-1);
    expect(bounceDir(mirror, 0, EAST)).toBe(-1);
    expect(bounceDir(mirror, 1, NORTH)).toBe(EAST);
    expect(bounceDir(mirror, 2, EAST)).toBe(SOUTH);
    expect(bounceDir(mirror, 3, EAST)).toBe(NORTH);
  });

  it('bounces off both faces of a two-sided mirror', () => {
    const double = { kind: 'double' } as const;
    expect([NORTH, EAST, SOUTH, WEST].map((dir) => bounceDir(double, 0, dir))).toEqual([WEST, SOUTH, EAST, NORTH]);
    expect([NORTH, EAST, SOUTH, WEST].map((dir) => bounceDir(double, 1, dir))).toEqual([EAST, NORTH, WEST, SOUTH]);
  });

  it('lights a target through a mirror', () => {
    const { board, turns } = start(['> . m2', '. . .', '. . t']);
    const trace = traceBeams(board, turns, 0);
    expect(allLit(board, trace)).toBe(true);
    expect(trace.touched).toBe(1);
    expect(trace.bounces).toHaveLength(1);
  });

  it('leaves a target dark when the back of a mirror faces the beam', () => {
    const { board, turns } = start(['> . m1', '. . .', '. . t']);
    const trace = traceBeams(board, turns, 0);
    expect(trace.lit).toBe(0);
    expect(trace.touched).toBe(0);
  });

  it('survives a beam that loops forever', () => {
    const { board, turns } = start(['> d1 . m2', '. . . .', '. m1 . m3']);
    expect(() => traceBeams(board, turns, 0)).not.toThrow();
  });
});

describe('splitters', () => {
  it('makes two beams', () => {
    const { board, turns } = start(['. . t', '> . s1', '. . .']);
    const open = start(['. . t .', '> . s1 t']);
    expect(traceBeams(board, turns, 0).lit).toBe(1);
    expect(traceBeams(open.board, open.turns, 0).lit).toBe(3);
  });
});

describe('colors', () => {
  it('lets a filter paint white light and stop any other color', () => {
    expect(afterFilter(0, 1)).toBe(1);
    expect(afterFilter(1, 1)).toBe(1);
    expect(afterFilter(2, 1)).toBe(-1);
  });

  it('wants the right color on a colored target', () => {
    const right = start(['> fr tr']);
    const wrong = start(['> fb tr']);
    const plain = start(['> tr']);
    const any = start(['r> t']);
    expect(traceBeams(right.board, [], 0).lit).toBe(1);
    expect(traceBeams(wrong.board, [], 0)).toMatchObject({ lit: 0, wrong: 1 });
    expect(traceBeams(plain.board, [], 0).lit).toBe(0);
    expect(traceBeams(any.board, [], 0).lit).toBe(1);
  });

  it('stops a red beam at a blue filter', () => {
    const { board } = start(['r> fb t']);
    expect(traceBeams(board, [], 0).lit).toBe(0);
  });
});

describe('portals', () => {
  it('sends light out of the mate, still going the same way', () => {
    const { board } = start(['> p1 . .', '. . p1 t']);
    const trace = traceBeams(board, [], 0);
    expect(trace.lit).toBe(1);
    expect(trace.segments).toHaveLength(2);
    expect(trace.segments[1]).toMatchObject({ x1: 2, y1: 1 });
  });
});

describe('switches', () => {
  it('does not press a switch that light was already resting on', () => {
    const { board } = start(['> xa A a']);
    const { pressed } = traceBeams(board, [], 0);
    expect(settle(board, [], 0, pressed).blocks).toBe(0);
  });

  it('slides the block when light arrives, and only once while it stays', () => {
    const { board, turns } = start(['> m2 xa', '. . .', 'A a .']);
    const once = settle(board, [(turns[0] + 1) % 4], 0, 0);
    expect(once.blocks).toBe(0);
    const pressed = settle(board, [3], 0, 0);
    expect(pressed.pressed).toBe(0);
    const row = start(['> m3 .', '. xa .', 'A a .']);
    expect(settle(row.board, [2], 0, 0)).toMatchObject({ blocks: 1, pressed: 1 });
    expect(settle(row.board, [2], 1, 1)).toMatchObject({ blocks: 1, pressed: 1 });
  });

  it('slides the block back on a second arrival', () => {
    const { board } = start(['> m2 .', '. xa .', 'A a .']);
    expect(settle(board, [2], 1, 0).blocks).toBe(0);
  });

  it('lets a block stop light at either end of its track', () => {
    const { board } = start(['> A a t']);
    expect(traceBeams(board, [], 0).lit).toBe(0);
    expect(traceBeams(board, [], 1).lit).toBe(0);
  });

  it('opens a way when the block slides off it', () => {
    const { board } = start(['> A t', '. a .']);
    expect(traceBeams(board, [], 0).lit).toBe(0);
    expect(traceBeams(board, [], 1).lit).toBe(1);
  });

  it('stops a chain of switches that would otherwise spin forever', () => {
    const { board } = start(['> A xb', '. a .', 'B b .']);
    expect(() => settle(board, [], 1, 0)).not.toThrow();
  });
});

describe('hidden targets', () => {
  it('notices light crossing the hidden tile without stopping it', () => {
    const { board } = start(['> ? t']);
    expect(traceBeams(board, [], 0)).toMatchObject({ secret: true, lit: 1 });
  });
});
