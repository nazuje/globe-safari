import type { Frame } from './rules/play.ts';
import type { HintAsk, HintReply } from './hint.worker.ts';

let worker: Worker | null = null;
let asked = 0;
const waiting = new Map<number, (tap: number | null) => void>();

function startWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./hint.worker.ts', import.meta.url), { type: 'module' });
  worker.addEventListener('message', ({ data }: MessageEvent<HintReply>) => {
    waiting.get(data.id)?.(data.tap);
    waiting.delete(data.id);
  });
  return worker;
}

/** The piece to tap next on a shortest win, or null if no win fits in the moves left. */
export function askHint(level: number, frame: Frame, left: number): Promise<number | null> {
  asked += 1;
  const id = asked;
  const ask: HintAsk = { id, level, frame, left };
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    startWorker().postMessage(ask);
  });
}
