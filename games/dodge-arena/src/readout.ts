import { KINDS, type Danger, type Kind, type Phase } from './dangers.ts';

/**
 * The game state as plain text, published in data attributes on #readout in
 * every build. It is the same picture a player has from the screen, so outside
 * testers and bots can play the real game with real touches.
 */
const PHASES: readonly Phase[] = ['warn', 'live', 'fuse', 'burst', 'done'];

const short = (value: number): number => Math.round(value * 1000) / 1000;

/** One danger as a flat list. */
export function dangerRow(d: Danger): number[] {
  return [d.id, KINDS.indexOf(d.kind), PHASES.indexOf(d.phase), short(d.t), short(d.warn), short(d.live), short(d.x), short(d.z), short(d.dx), short(d.dz), short(d.angle), short(d.spin), short(d.size), short(d.speed)];
}

export function readDangerRow(row: readonly number[]): Danger {
  const [id = 0, kind = 0, phase = 0, t = 0, warn = 0, live = 0, x = 0, z = 0, dx = 0, dz = 0, angle = 0, spin = 0, size = 0, speed = 0] = row;
  return { id, kind: KINDS[kind] as Kind, phase: PHASES[phase] as Phase, t, warn, live, x, z, dx, dz, angle, spin, size, speed };
}

export const dangersText = (dangers: readonly Danger[]): string => JSON.stringify(dangers.map(dangerRow));

export const readDangers = (value: string): Danger[] => (JSON.parse(value) as number[][]).map(readDangerRow);
