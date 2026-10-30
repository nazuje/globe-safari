import type { Point } from './path.ts';
import { calmMotion } from './dom.ts';

const HOP_MS = 330;
const HOP_HEIGHT = 56;
const CALM_GLIDE_MS = 500;

export interface Pose extends Point {
  scale: number;
}

export function poseTransform({ x, y, scale }: Pose): string {
  return `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`;
}

function airborne(height: number): Keyframe[] {
  return [
    { transform: 'translateY(0) scale(1.14, 0.84)', offset: 0 },
    { transform: `translateY(${-height * 0.7}px) scale(0.9, 1.12)`, offset: 0.28 },
    { transform: `translateY(${-height}px) scale(1, 1)`, offset: 0.5 },
    { transform: `translateY(${-height * 0.6}px) scale(0.94, 1.08)`, offset: 0.74 },
    { transform: 'translateY(0) scale(1.2, 0.78)', offset: 0.93 },
    { transform: 'translateY(0) scale(1, 1)', offset: 1 },
  ];
}

const SHADOW_DIP: Keyframe[] = [
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(0.6)', opacity: 0.5, offset: 0.5 },
  { transform: 'scale(1)', opacity: 1 },
];

export interface HopParts {
  friend: HTMLElement;
  body: HTMLElement;
  shadow: HTMLElement;
}

/** One hop: the ground move is steady, while the body leaps, stretches and squashes on top of it. */
export async function hop(parts: HopParts, from: Pose, to: Pose, height = HOP_HEIGHT): Promise<void> {
  if (calmMotion()) {
    parts.friend.style.transform = poseTransform(to);
    return;
  }
  const travel = parts.friend.animate([{ transform: poseTransform(from) }, { transform: poseTransform(to) }], {
    duration: HOP_MS,
    easing: 'linear',
  });
  parts.body.animate(airborne(height), { duration: HOP_MS, easing: 'ease-in-out' });
  parts.shadow.animate(SHADOW_DIP, { duration: HOP_MS });
  parts.friend.style.transform = poseTransform(to);
  await travel.finished.catch(() => undefined);
}

/** Hops through every stop in turn. With calm motion it is one quiet glide instead. */
export async function hopAlong(parts: HopParts, from: Pose, stops: readonly Pose[]): Promise<void> {
  const last = stops.at(-1);
  if (!last) return;
  if (calmMotion()) {
    const glide = parts.friend.animate([{ transform: poseTransform(from) }, { transform: poseTransform(last) }], {
      duration: CALM_GLIDE_MS,
      easing: 'ease-in-out',
    });
    parts.friend.style.transform = poseTransform(last);
    await glide.finished.catch(() => undefined);
    return;
  }
  let at = from;
  for (const stop of stops) {
    await hop(parts, at, stop);
    at = stop;
  }
}

function shakeFrames(): Keyframe[] {
  return [0, -14, 14, -11, 11, -6, 6, 0].map((x, i) => ({
    transform: `translateX(${x}px) rotate(${x * 0.8}deg) scale(${i % 2 === 0 ? 1 : 1.05}, ${i % 2 === 0 ? 1 : 0.95})`,
  }));
}

const TOPPLE: Keyframe[] = [
  { transform: 'rotate(0)' },
  { transform: 'rotate(-20deg) translateY(-14px)', offset: 0.25 },
  { transform: 'rotate(22deg) translateY(-14px)', offset: 0.6 },
  { transform: 'rotate(-7deg)', offset: 0.82 },
  { transform: 'rotate(0)' },
];

/** The silly "not my door" reaction. Two flavors keep it funny the third time. */
export function sillyShake(body: HTMLElement, turn: number): Promise<unknown> {
  if (calmMotion()) return Promise.resolve();
  const frames = turn % 2 === 0 ? shakeFrames() : TOPPLE;
  return body.animate(frames, { duration: 620, easing: 'ease-in-out' }).finished.catch(() => undefined);
}

/** A small happy jump on the spot, for a friend who gets tapped. */
export function giggle(body: HTMLElement): void {
  if (!calmMotion()) body.animate(airborne(26), { duration: 420, easing: 'ease-in-out' });
}

/** The tapped house joins in the joke with a tiny side-to-side wobble. */
export function doorNudge(house: HTMLElement): void {
  if (calmMotion()) return;
  const frames = [0, -5, 5, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  house.animate(frames, { duration: 380, easing: 'ease-in-out' });
}
