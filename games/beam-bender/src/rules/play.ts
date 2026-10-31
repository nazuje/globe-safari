import type { Board } from './board.ts';
import { allLit, settle, traceBeams, type Trace } from './trace.ts';

export type Status = 'playing' | 'won' | 'lost';

export interface Frame {
  turns: readonly number[];
  blocks: number;
  pressed: number;
}

export interface Play {
  board: Board;
  limit: number;
  par: number;
  frame: Frame;
  trace: Trace;
  history: readonly Frame[];
  moves: number;
  hints: number;
  status: Status;
  secret: boolean;
}

export const HINTS_PER_LEVEL = 3;

export interface Rules {
  limit: number;
  par: number;
}

/** A level at its start. A beam already resting on a switch doesn't press it: nothing arrived. */
export function startPlay(board: Board, { limit, par }: Rules): Play {
  const turns = board.pieces.map((piece) => piece.start);
  const trace = traceBeams(board, turns, 0);
  const frame = { turns, blocks: 0, pressed: trace.pressed };
  return { board, limit, par, frame, trace, history: [], moves: 0, hints: 0, status: 'playing', secret: trace.secret };
}

function arrive(play: Play, frame: Frame, trace: Trace, history: readonly Frame[]): Play {
  const moves = play.moves + 1;
  const won = allLit(play.board, trace);
  const status: Status = won ? 'won' : moves >= play.limit ? 'lost' : 'playing';
  return { ...play, frame, trace, history, moves, status, secret: play.secret || trace.secret };
}

/** Turns one piece a quarter turn clockwise. */
export function tapPiece(play: Play, index: number): Play {
  const piece = play.board.pieces[index];
  if (play.status !== 'playing' || !piece) return play;
  const { frame } = play;
  const turns = frame.turns.map((turn, at) => (at === index ? (turn + 1) % piece.turns : turn));
  const after = settle(play.board, turns, frame.blocks, frame.pressed);
  return arrive(play, { turns, blocks: after.blocks, pressed: after.pressed }, after.trace, [...play.history, frame]);
}

/** Takes the last tap back. The board is restored, but the move count keeps going up. */
export function undoMove(play: Play): Play {
  const frame = play.history.at(-1);
  if (play.status !== 'playing' || !frame) return play;
  const { trace } = settle(play.board, frame.turns, frame.blocks, frame.pressed);
  return arrive(play, frame, trace, play.history.slice(0, -1));
}

export const useHint = (play: Play): Play => (play.hints >= HINTS_PER_LEVEL ? play : { ...play, hints: play.hints + 1 });

/** Par earns 3 stars, a tidy win 2, any other win 1. A hint means 1 at most. */
export function starsFor({ moves, par, limit, hints }: Pick<Play, 'moves' | 'par' | 'limit' | 'hints'>): number {
  if (hints > 0) return 1;
  if (moves <= par) return 3;
  return moves <= par + Math.ceil((limit - par) / 2) ? 2 : 1;
}

/**
 * The rare party: one tap takes a board with two or more dark targets to every target lit at once. Lighting
 * them one by one never earns it, so a player has to save the tap nearest the laser for last.
 */
export function isDisco(board: Board, before: Trace, after: Trace): boolean {
  return board.targets.length >= 2 && before.lit === 0 && allLit(board, after);
}
