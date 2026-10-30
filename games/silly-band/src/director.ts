import { MAX_TINY, TINY_FRIENDS } from './band.ts';

export type Surprise = 'solo' | 'crowd' | 'egg';

const FIRST_SURPRISE_BARS = 14;
const MIN_GAP_BARS = 14;
const EXTRA_GAP_BARS = 16;
const TAPS_PER_FAN = 14;
const START_AUDIENCE = 3;
export const MAX_AUDIENCE = 40;

export interface Fans {
  audience: number;
  tiny: string[];
}

/** Keeps saved numbers sensible, whatever was found on the device. */
export function cleanFans(saved: Partial<Fans> | null | undefined): Fans {
  const audience = Number(saved?.audience);
  const tiny = Array.isArray(saved?.tiny) ? saved.tiny.filter((friend) => TINY_FRIENDS.includes(friend)) : [];
  return {
    audience: Number.isFinite(audience) ? Math.min(MAX_AUDIENCE, Math.max(START_AUDIENCE, Math.floor(audience))) : START_AUDIENCE,
    tiny: [...new Set(tiny)].slice(0, MAX_TINY),
  };
}

/**
 * Decides when something rare happens, and keeps the audience growing. Only
 * bars with a child's taps in them count, so a band left alone doesn't keep
 * throwing surprises to an empty room, and no surprise ever needs earning twice.
 */
export class Director {
  readonly fans: Fans;
  private tapsToFan = TAPS_PER_FAN;
  private tappedThisBar = false;
  private barsToSurprise = FIRST_SURPRISE_BARS;
  private last: Surprise | null = null;
  private readonly random: () => number;

  constructor(random: () => number, fans: Fans) {
    this.random = random;
    this.fans = fans;
  }

  /** Counts a tap. True when a new fan just came to watch. */
  tap(): boolean {
    this.tappedThisBar = true;
    this.tapsToFan -= 1;
    if (this.tapsToFan > 0) return false;
    this.tapsToFan = TAPS_PER_FAN;
    return this.grow(1);
  }

  grow(by: number): boolean {
    const before = this.fans.audience;
    this.fans.audience = Math.min(MAX_AUDIENCE, before + by);
    return this.fans.audience > before;
  }

  /** Called at each new bar. Holds back while busy, such as during a recording. */
  bar(busy: boolean): Surprise | null {
    const counted = this.tappedThisBar;
    this.tappedThisBar = false;
    if (!counted) return null;
    if (this.barsToSurprise > 0) this.barsToSurprise -= 1;
    if (this.barsToSurprise > 0 || busy) return null;
    const surprise = this.pick();
    this.last = surprise;
    this.barsToSurprise = MIN_GAP_BARS + Math.floor(this.random() * EXTRA_GAP_BARS);
    return surprise;
  }

  private pick(): Surprise {
    // The egg is the best one, so it's the first one a child finds.
    if (this.last === null && this.fans.tiny.length === 0) return 'egg';
    const options: Surprise[] = ['solo', 'crowd'];
    if (this.fans.tiny.length < MAX_TINY) options.push('egg');
    const fresh = options.filter((option) => option !== this.last);
    return fresh[Math.floor(this.random() * fresh.length)] ?? 'crowd';
  }

  /** A new tiny band member, never one already on stage. */
  hatch(): string | null {
    if (this.fans.tiny.length >= MAX_TINY) return null;
    const free = TINY_FRIENDS.filter((friend) => !this.fans.tiny.includes(friend));
    const friend = free[Math.floor(this.random() * free.length)];
    if (!friend) return null;
    this.fans.tiny.push(friend);
    return friend;
  }
}
