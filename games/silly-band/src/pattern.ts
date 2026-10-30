import { LOOP_STEPS } from './music.ts';

/** What the child played: who, on which of the loop's steps, and which note. */
export interface LoopNote {
  pos: number;
  player: string;
  degree: number;
}

/** A position in the loop, for any step of the endless count. */
export function loopPosition(step: number): number {
  return ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
}

/**
 * The recorded song. Steps are stored rather than seconds, and scale degrees
 * rather than pitches, so a song keeps working in every style at every tempo.
 * One player has one note per step, so playing over a song can't pile up.
 */
export class Loop {
  private readonly slots = new Map<number, Map<string, number>>();

  add(step: number, player: string, degree: number): void {
    const pos = loopPosition(step);
    const slot = this.slots.get(pos) ?? new Map<string, number>();
    slot.set(player, degree);
    this.slots.set(pos, slot);
  }

  at(step: number): LoopNote[] {
    const pos = loopPosition(step);
    const slot = this.slots.get(pos);
    if (!slot) return [];
    return [...slot].map(([player, degree]) => ({ pos, player, degree }));
  }

  get size(): number {
    let total = 0;
    for (const slot of this.slots.values()) total += slot.size;
    return total;
  }

  clear(): void {
    this.slots.clear();
  }

  notes(): LoopNote[] {
    return [...this.slots.keys()].sort((a, b) => a - b).flatMap((pos) => this.at(pos));
  }

  /** Compact rows of [pos, player, degree], for saving on the device. */
  save(): [number, string, number][] {
    return this.notes().map(({ pos, player, degree }) => [pos, player, degree]);
  }

  /** Reads saved rows and quietly drops anything that isn't a sensible note. */
  static load(saved: unknown, players: readonly string[]): Loop {
    const loop = new Loop();
    if (!Array.isArray(saved)) return loop;
    for (const row of saved) {
      if (!Array.isArray(row)) continue;
      const [pos, player, degree] = row as unknown[];
      if (!Number.isInteger(pos) || !Number.isInteger(degree)) continue;
      if (typeof player !== 'string' || !players.includes(player)) continue;
      loop.add(pos as number, player, degree as number);
    }
    return loop;
  }
}

/** How far through a take the given step is, from 0 to 1. */
export function takeProgress(startStep: number, step: number): number {
  return Math.min(1, Math.max(0, (step - startStep) / LOOP_STEPS));
}
