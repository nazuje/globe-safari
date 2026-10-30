// The music rules, with no sound in them: scales, the rhythm grid, and quantizing.
// Everything here is plain numbers, so it can be tested without any audio.

export const STEPS_PER_BEAT = 4;
export const STEPS_PER_BAR = 16;
export const LOOP_BARS = 8;
export const LOOP_STEPS = LOOP_BARS * STEPS_PER_BAR;

export type ScaleKind = 'major' | 'minor';

/** Pentatonic scales have no notes a semitone apart, which is why any mash of them sounds fine. */
const SCALES: Record<ScaleKind, readonly number[]> = {
  major: [0, 2, 4, 7, 9],
  minor: [0, 3, 5, 7, 10],
};

const SCALE_SIZE = 5;

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** The MIDI note for a step up the pentatonic scale. Degree 5 is the root an octave up. */
export function scaleMidi(root: number, kind: ScaleKind, degree: number): number {
  const octave = Math.floor(degree / SCALE_SIZE);
  return root + 12 * octave + SCALES[kind][degree - octave * SCALE_SIZE];
}

export function stepSeconds(bpm: number): number {
  return 60 / bpm / STEPS_PER_BEAT;
}

/**
 * The rhythm grid, tied to the audio clock. A step's time is always worked out
 * from one fixed anchor, never by adding step lengths up, so rounding errors
 * can't pile up and the beat can't drift, however long it runs.
 */
export interface Grid {
  anchor: number;
  anchorStep: number;
  stepSeconds: number;
}

export function timeOf(grid: Grid, step: number): number {
  return grid.anchor + (step - grid.anchorStep) * grid.stepSeconds;
}

/** Where on the grid a moment falls, as a fraction of a step. */
export function stepAt(grid: Grid, time: number): number {
  return grid.anchorStep + (time - grid.anchor) / grid.stepSeconds;
}

/** A new tempo from a given step on, joining the old one exactly at that step. */
export function retempo(grid: Grid, fromStep: number, seconds: number): Grid {
  return { anchor: timeOf(grid, fromStep), anchorStep: fromStep, stepSeconds: seconds };
}

export interface DueSteps {
  steps: number[];
  next: number;
}

/**
 * The steps to schedule now, up to `horizon` seconds ahead. Steps whose moment
 * has already gone are skipped rather than played late. After a sleeping tab
 * wakes, the beat just carries on where it should be, with no burst of old notes.
 */
export function dueSteps(grid: Grid, nextStep: number, now: number, horizon: number): DueSteps {
  const first = Math.max(nextStep, Math.ceil(stepAt(grid, now)));
  const last = Math.floor(stepAt(grid, now + horizon));
  const steps: number[] = [];
  for (let step = first; step <= last; step++) steps.push(step);
  return { steps, next: Math.max(first, last + 1) };
}

export interface Quantized {
  step: number;
  at: number;
}

/**
 * Gently pulls a tap onto the nearest step. A step coming up soon waits for it.
 * A step just gone can't be reached, so the note plays right away and counts as
 * that step. Nothing ever waits longer than `maxWait`.
 */
export function quantize(grid: Grid, now: number, maxWait: number): Quantized {
  const step = Math.round(stepAt(grid, now));
  const at = timeOf(grid, step);
  return { step, at: at > now && at - now <= maxWait ? at : now };
}

/** A wandering tune: small hops up and down the scale, bouncing off the edges of its range. */
export function wander(previous: number, low: number, high: number, random: () => number): number {
  const hops = [-2, -1, -1, 1, 1, 2];
  const hop = hops[Math.floor(random() * hops.length)] ?? 1;
  const target = previous + hop;
  if (target < low || target > high) return previous - hop;
  return target;
}
