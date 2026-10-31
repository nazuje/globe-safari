import { boardFor, levelById } from './rules/levels.ts';
import type { Frame } from './rules/play.ts';
import { solve } from './rules/solver.ts';

export interface HintAsk {
  id: number;
  level: number;
  frame: Frame;
  left: number;
}

export interface HintReply {
  id: number;
  tap: number | null;
}

// The last levels have millions of states, so the search runs here to keep the board smooth.
self.addEventListener('message', ({ data }: MessageEvent<HintAsk>) => {
  const level = levelById(data.level);
  const solution = level ? solve(boardFor(level), data.frame, data.left) : null;
  const reply: HintReply = { id: data.id, tap: solution?.taps[0] ?? null };
  self.postMessage(reply);
});
