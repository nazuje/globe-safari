import { MAX_TINY, MEMBERS, TINY, type MemberId, type Player } from './band.ts';
import { Director, type Fans, type Surprise } from './director.ts';
import { dueSteps, type Grid, LOOP_STEPS, quantize, retempo, scaleMidi, stepAt, STEPS_PER_BAR, STEPS_PER_BEAT, stepSeconds, timeOf, wander } from './music.ts';
import type { Note } from './patches.ts';
import { Loop, takeProgress } from './pattern.ts';
import { bassMidi, type Backing, STYLE_IDS, STYLES, stabMidis, type Style } from './styles.ts';

/** How far ahead of the audio clock notes are booked. */
const HORIZON = 0.16;
/** The longest a tap waits for the beat. Short enough that it still feels instant. */
const MAX_WAIT = 0.07;
const START_DELAY = 0.06;

const BASS_WALK = [0, 3, 5, 3];
const SOLO_BARS = 2;
const CROWD_BARS = 2;
const EGG_BARS = 2;
const BACKING_LEVEL = 0.95;

/** A moment for the screen, tied to the audio clock so sight and sound land together. */
export type Cue =
  | { kind: 'member'; member: MemberId }
  | { kind: 'tiny' }
  | { kind: 'beat'; beat: number }
  | { kind: 'solo'; member: MemberId | null }
  | { kind: 'crowd'; wild: boolean }
  | { kind: 'egg'; stage: 'laid' | 'crack' }
  | { kind: 'hatch'; friend: string | null }
  | { kind: 'recorded'; notes: number };

export interface Timed<T> {
  at: number;
  item: T;
}

export interface Tick {
  notes: Timed<Note>[];
  cues: Timed<Cue>[];
}

interface Booking {
  note?: Note;
  cue?: Cue;
}

/** Which note a player's stored degree means, in this style and on this step. */
export function noteFor(player: Player, degree: number, style: Style, step: number): Note {
  if (player === TINY) return { voice: 'tiny', midi: scaleMidi(style.root, style.scale, degree) };
  const { job } = MEMBERS[player];
  if (job === 'bass') return { voice: 'bass', midi: bassMidi(style, step, degree) };
  if (job === 'drum') return { voice: degree === 0 ? 'drum' : 'tom', midi: 0 };
  if (job === 'clap') return { voice: 'clap', midi: 0 };
  return { voice: job, midi: scaleMidi(style.root, style.scale, degree) };
}

function backingAt(style: Style, step: number): Note[] {
  const pos = step % STEPS_PER_BAR;
  const notes: Note[] = [];
  const level = (track: Backing): number => {
    const mark = style.tracks[track][pos];
    if (mark === 'x') return BACKING_LEVEL * style.loudness;
    return mark === 'o' ? BACKING_LEVEL * style.loudness * 0.55 : 0;
  };
  for (const voice of ['kick', 'snare', 'hat'] as const) {
    if (level(voice) > 0) notes.push({ voice, midi: 0, level: level(voice) });
  }
  if (level('stab') > 0) {
    for (const midi of stabMidis(style, step)) notes.push({ voice: 'stab', midi, level: level('stab') });
  }
  const bass = Number.parseInt(style.tracks.bass[pos] ?? '', 10);
  if (Number.isInteger(bass)) notes.push({ voice: 'bass', midi: bassMidi(style, step, bass), level: BACKING_LEVEL * style.loudness });
  return notes;
}

/** The tiny friends, once hatched, each add a little note to the band's groove. */
function tinyAt(count: number, style: Style, step: number): Note | null {
  const pos = step % (STEPS_PER_BAR * 2);
  const slot = pos / 3;
  if (!Number.isInteger(slot) || slot >= count * 2) return null;
  return { voice: 'tiny', midi: scaleMidi(style.root, style.scale, 10 + (slot % 5)), level: 0.7 };
}

/**
 * The band leader. It owns the beat, the recording and the surprises, and has
 * no idea what a speaker or a screen is: it is given the time on the audio
 * clock and hands back notes and cues with exact times.
 */
export class Conductor {
  readonly director: Director;
  readonly loop: Loop;
  styleIndex = 0;
  playing = false;
  private grid: Grid | null = null;
  private nextStep = 0;
  private takeFrom: number | null = null;
  private readonly bookings = new Map<number, Booking[]>();
  private readonly random: () => number;
  private readonly memory: Partial<Record<MemberId, number>> = {};
  private readonly lastStep: Partial<Record<Player, number>> = {};
  private tinyDegree = 10;

  constructor(random: () => number, fans: Fans, loop: Loop) {
    this.random = random;
    this.director = new Director(random, fans);
    this.loop = loop;
  }

  get style(): Style {
    return STYLES[STYLE_IDS[this.styleIndex] ?? 'march'];
  }

  get recording(): boolean {
    return this.takeFrom !== null;
  }

  private ensureGrid(now: number): Grid {
    this.grid ??= { anchor: now, anchorStep: 0, stepSeconds: stepSeconds(this.style.bpm) };
    return this.grid;
  }

  private nextDegree(member: MemberId): number {
    const { job } = MEMBERS[member];
    const last = this.memory[member];
    let degree = 0;
    if (job === 'bass') degree = ((last ?? -1) + 1) % BASS_WALK.length;
    if (job === 'drum') degree = last === 0 ? 1 : 0;
    if (job === 'melody') degree = wander(last ?? 4, 0, 9, this.random);
    if (job === 'voice') degree = wander(last ?? 3, 0, 7, this.random);
    if (job === 'sparkle') degree = wander(last ?? 12, 10, 16, this.random);
    this.memory[member] = degree;
    return job === 'bass' ? (BASS_WALK[degree] ?? 0) : degree;
  }

  private nextTiny(): number {
    this.tinyDegree = wander(this.tinyDegree, 8, 14, this.random);
    return this.tinyDegree;
  }

  /** A tap on a player. Null when that player already sounds on this step, which keeps a mash from stacking up. */
  tap(player: Player, now: number): Timed<Note> | null {
    const grid = this.ensureGrid(now);
    this.director.tap();
    const { step, at } = quantize(grid, now, MAX_WAIT);
    if (this.lastStep[player] === step) return null;
    this.lastStep[player] = step;
    const degree = player === TINY ? this.nextTiny() : this.nextDegree(player);
    if (this.takeFrom !== null && step >= this.takeFrom && step < this.takeFrom + LOOP_STEPS) this.loop.add(step, player, degree);
    return { at, item: noteFor(player, degree, this.style, step) };
  }

  /** ▶. Always starts at the top of the song, so a recording comes back the way it went. */
  start(now: number): void {
    const grid = this.ensureGrid(now);
    const top = Math.ceil(stepAt(grid, now) / LOOP_STEPS) * LOOP_STEPS;
    this.grid = { anchor: now + START_DELAY, anchorStep: top, stepSeconds: stepSeconds(this.style.bpm) };
    this.nextStep = top;
    this.playing = true;
  }

  /** Stops the band and whatever was booked. Notes already recorded stay. */
  stop(): void {
    this.playing = false;
    this.takeFrom = null;
    this.bookings.clear();
  }

  /** 🔴. A new take plays along with the old one, adding to the song. */
  record(now: number): void {
    if (this.recording) return;
    if (!this.playing) this.start(now);
    this.takeFrom = Math.ceil(stepAt(this.ensureGrid(now), now));
  }

  /** ✨. The next style, from the next unbooked step on. */
  wild(now: number): void {
    this.styleIndex = (this.styleIndex + 1) % STYLE_IDS.length;
    const grid = this.ensureGrid(now);
    const from = Math.max(this.nextStep, Math.ceil(stepAt(grid, now)));
    this.grid = retempo(grid, from, stepSeconds(this.style.bpm));
    this.nextStep = from;
    if (!this.playing) this.start(now);
  }

  /** The part of the 8 bars gone so far: of the take while recording, otherwise of the song. */
  progress(now: number): number {
    if (!this.grid) return 0;
    const step = stepAt(this.grid, now);
    if (this.takeFrom !== null) return takeProgress(this.takeFrom, step);
    return ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS / LOOP_STEPS;
  }

  private book(step: number, booking: Booking): void {
    const list = this.bookings.get(step) ?? [];
    list.push(booking);
    this.bookings.set(step, list);
  }

  private bookSolo(from: number, member: MemberId): void {
    this.book(from, { cue: { kind: 'solo', member } });
    const length = SOLO_BARS * STEPS_PER_BAR;
    // Steady at first, then faster and faster: the silly bit is the big finish.
    for (let offset = 0; offset < length; ) {
      const degree = this.nextDegree(member);
      this.book(from + offset, { note: noteFor(member, degree, this.style, from + offset), cue: { kind: 'member', member } });
      offset += offset < STEPS_PER_BAR ? 2 : 1;
    }
    this.book(from + length, { cue: { kind: 'solo', member: null } });
    this.book(from + length, { note: { voice: 'cheer', midi: 0, level: 0.6 } });
  }

  private bookCrowd(from: number): void {
    this.book(from, { cue: { kind: 'crowd', wild: true }, note: { voice: 'cheer', midi: 0 } });
    this.book(from + CROWD_BARS * STEPS_PER_BAR, { cue: { kind: 'crowd', wild: false } });
  }

  private bookEgg(from: number): void {
    const { style } = this;
    this.book(from, { cue: { kind: 'egg', stage: 'laid' }, note: { voice: 'clap', midi: 0 } });
    this.book(from + STEPS_PER_BAR, { cue: { kind: 'egg', stage: 'crack' }, note: { voice: 'tom', midi: 0, level: 0.5 } });
    const hatch = from + EGG_BARS * STEPS_PER_BAR;
    this.book(hatch, { cue: { kind: 'hatch', friend: null } });
    [0, 2, 3, 5].forEach((degree, index) => {
      this.book(hatch + index * 2, { note: { voice: 'sparkle', midi: scaleMidi(style.root, style.scale, 10 + degree) } });
    });
  }

  private surprise(kind: Surprise, step: number): void {
    if (kind === 'egg') this.bookEgg(step);
    if (kind === 'crowd') this.bookCrowd(step);
    if (kind === 'solo') {
      const ids = Object.keys(MEMBERS) as MemberId[];
      this.bookSolo(step, ids[Math.floor(this.random() * ids.length)] ?? 'frog');
    }
  }

  private stepNotes(step: number, tick: Tick, at: number): void {
    const { style } = this;
    if (!this.playing) return;
    for (const note of backingAt(style, step)) tick.notes.push({ at, item: note });
    const tiny = tinyAt(Math.min(this.director.fans.tiny.length, MAX_TINY), style, step);
    if (tiny) {
      tick.notes.push({ at, item: tiny });
      tick.cues.push({ at, item: { kind: 'tiny' } });
    }
    // On a take's first pass the song is still being written, and those notes were heard live.
    for (const { player, degree } of this.loop.at(step)) {
      tick.notes.push({ at, item: noteFor(player as Player, degree, style, step) });
      const cue: Cue = player === TINY ? { kind: 'tiny' } : { kind: 'member', member: player as MemberId };
      tick.cues.push({ at, item: cue });
    }
  }

  private stepBookings(step: number, tick: Tick, at: number): void {
    for (const { note, cue } of this.bookings.get(step) ?? []) {
      if (note) tick.notes.push({ at, item: note });
      if (cue?.kind === 'hatch') tick.cues.push({ at, item: { kind: 'hatch', friend: this.director.hatch() } });
      else if (cue) tick.cues.push({ at, item: cue });
    }
    this.bookings.delete(step);
  }

  /** Steps a stall skipped lose their notes, but a spotlight must still go off. */
  private flushSkipped(now: number, tick: Tick): void {
    for (const [step, bookings] of this.bookings) {
      if (step >= this.nextStep) continue;
      for (const { cue } of bookings) if (cue) tick.cues.push({ at: now, item: cue });
      this.bookings.delete(step);
    }
  }

  private finishTake(now: number, tick: Tick): void {
    if (this.takeFrom === null || !this.grid) return;
    if (stepAt(this.grid, now) < this.takeFrom + LOOP_STEPS) return;
    this.takeFrom = null;
    this.director.grow(2);
    tick.cues.push({ at: now, item: { kind: 'recorded', notes: this.loop.size } });
  }

  /** Called often. Hands back everything that should happen in the next moment. */
  tick(now: number): Tick {
    const tick: Tick = { notes: [], cues: [] };
    if (!this.grid) return tick;
    this.finishTake(now, tick);
    const { steps, next } = dueSteps(this.grid, this.nextStep, now, HORIZON);
    for (const step of steps) {
      const at = timeOf(this.grid, step);
      if (step % STEPS_PER_BAR === 0) {
        const surprise = this.director.bar(this.recording || this.bookings.size > 0);
        if (surprise) this.surprise(surprise, step);
      }
      if (step % STEPS_PER_BEAT === 0) tick.cues.push({ at, item: { kind: 'beat', beat: step / STEPS_PER_BEAT } });
      this.stepNotes(step, tick, at);
      this.stepBookings(step, tick, at);
    }
    this.nextStep = next;
    this.flushSkipped(now, tick);
    return tick;
  }
}
