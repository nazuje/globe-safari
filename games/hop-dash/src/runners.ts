export const RUNNER_IDS = ['bunny', 'fox', 'robot', 'kitten', 'dino', 'penguin'] as const;
export type RunnerId = (typeof RUNNER_IDS)[number];

/** Each runner's own note, so a jump sounds like them. */
export const RUNNER_PITCH: Record<RunnerId, number> = {
  bunny: 520,
  fox: 440,
  robot: 330,
  kitten: 620,
  dino: 260,
  penguin: 390,
};
