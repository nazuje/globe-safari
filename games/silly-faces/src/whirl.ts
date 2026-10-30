import { PARTS, randomLook, type Look, type Part } from './parts.ts';

/** How many spins pass before the wheels start stopping, then how many between each stop. */
const FREE_SPINS = 5;
const SPINS_PER_STOP = 2;

/**
 * The pictures of one shuffle, like the wheels of a slot machine: everything
 * spins, then each part stops on its final choice, one after another.
 */
export function whirlFrames(final: Look, random: () => number = Math.random): Look[] {
  const frames: Look[] = [];
  const stopped = new Set<Part>();
  const order = [...PARTS];
  const total = FREE_SPINS + order.length * SPINS_PER_STOP;
  for (let frame = 0; frame < total; frame++) {
    if (frame >= FREE_SPINS && (frame - FREE_SPINS) % SPINS_PER_STOP === 0) stopped.add(order.shift()!);
    const spinning = randomLook(random);
    frames.push(Object.fromEntries(PARTS.map((part) => [part, stopped.has(part) ? final[part] : spinning[part]])) as unknown as Look);
  }
  frames.push({ ...final });
  return frames;
}
