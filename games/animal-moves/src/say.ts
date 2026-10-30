import { say as sayLine } from '@playroom/kit';

// The game's scripts stop a line through a signal, so this adapts the kit's say() to that shape.

export { estimateMs, retryVoice } from '@playroom/kit';

/** Speaks a line and resolves when it has ended, was aborted, or plainly isn't going to happen. */
export function say(text: string, signal: AbortSignal): Promise<void> {
  return sayLine(text, { signal });
}
