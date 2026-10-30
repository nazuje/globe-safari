export const BALL_IDS = ['bowling', 'beach', 'tiny', 'slime', 'basket'] as const;
export type BallId = (typeof BALL_IDS)[number];

export interface Ball {
  id: BallId;
  radius: number;
  mass: number;
  /** Units a second on the way out. Slower means a higher, loopier throw. */
  speed: number;
  bounce: number;
  /** Share of gravity it ignores, so a beach ball drifts. */
  float: number;
  /** Grabs the blocks it touches and drags them along. */
  sticky: boolean;
}

export const BALLS: Record<BallId, Ball> = {
  bowling: { id: 'bowling', radius: 0.62, mass: 18, speed: 26, bounce: 0.08, float: 0, sticky: false },
  beach: { id: 'beach', radius: 1.05, mass: 6, speed: 15, bounce: 0.92, float: 0.45, sticky: false },
  tiny: { id: 'tiny', radius: 0.3, mass: 14, speed: 30, bounce: 0.15, float: 0, sticky: false },
  slime: { id: 'slime', radius: 0.74, mass: 10, speed: 20, bounce: 0, float: 0, sticky: true },
  basket: { id: 'basket', radius: 0.72, mass: 6, speed: 16, bounce: 0.82, float: 0, sticky: false },
};

export function cleanBall(saved: unknown): BallId {
  return BALL_IDS.find((id) => id === saved) ?? 'bowling';
}
