/** Friends to pop before a party. The first comes quickly, then they space out a little. */
export function partyGoal(partiesHeld: number): number {
  return Math.min(18, 10 + partiesHeld * 2);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880];

/** Pop notes climb a cheerful scale as the party gets closer, which sounds good at any speed. */
export function popNote(step: number): number {
  const octave = Math.min(2, Math.floor(step / SCALE.length));
  return SCALE[step % SCALE.length]! * 2 ** octave;
}

const QUIET_FOR_CHEER_MS = 1800;

/** Keeps a cheer from talking over a new friend's name, which matters more. */
export function createVoicePace(): { nameSpoken: (now: number) => void; mayCheer: (now: number) => boolean } {
  let lastName = Number.NEGATIVE_INFINITY;
  return {
    nameSpoken: (now) => {
      lastName = now;
    },
    mayCheer: (now) => now - lastName >= QUIET_FOR_CHEER_MS,
  };
}

const SLOW_FRAME_MS = 32;
const SLOW_FRAMES_TO_GIVE_UP = 90;

/**
 * Notices a device that can't keep up. A lost frame here and there is forgiven;
 * only a long stretch of slow frames returns true, once.
 */
export function createFrameWatch(): (frameMs: number) => boolean {
  let slowFrames = 0;
  let done = false;
  return (frameMs) => {
    if (done) return false;
    slowFrames = frameMs > SLOW_FRAME_MS ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    done = slowFrames >= SLOW_FRAMES_TO_GIVE_UP;
    return done;
  };
}
