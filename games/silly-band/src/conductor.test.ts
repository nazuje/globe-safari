import { describe, expect, it } from 'vitest';
import { MEMBER_IDS, type MemberId } from './band.ts';
import { Conductor, type Cue, type Tick } from './conductor.ts';
import { cleanFans } from './director.ts';
import { LOOP_STEPS, stepSeconds, STEPS_PER_BAR } from './music.ts';
import type { Voice } from './patches.ts';
import { Loop } from './pattern.ts';
import { STYLE_IDS, STYLES } from './styles.ts';

function band(random: () => number = () => 0.4): Conductor {
  return new Conductor(random, cleanFans(null), new Loop());
}

/** Runs the clock forward like the real pump does, gathering everything. */
function run(conductor: Conductor, from: number, seconds: number): Tick {
  const all: Tick = { notes: [], cues: [] };
  for (let now = from; now < from + seconds; now += 0.04) {
    const { notes, cues } = conductor.tick(now);
    all.notes.push(...notes);
    all.cues.push(...cues);
  }
  return all;
}

const voices = (tick: Tick): Voice[] => tick.notes.map((note) => note.item.voice);
const memberCues = (tick: Tick): MemberId[] =>
  tick.cues.flatMap(({ item }: { item: Cue }) => (item.kind === 'member' ? [item.member] : []));

describe('the backing band', () => {
  it('is silent until ▶', () => {
    const conductor = band();
    conductor.tap('cat', 0);
    expect(run(conductor, 0, 3).notes).toEqual([]);
  });

  it('plays a steady beat in the style tempo', () => {
    const conductor = band();
    conductor.start(1);
    const kicks = run(conductor, 1, 8).notes.filter((note) => note.item.voice === 'kick').map((note) => note.at);
    const gap = stepSeconds(STYLES.march.bpm) * 8;
    expect(kicks.length).toBeGreaterThan(3);
    kicks.slice(1).forEach((at, index) => expect(at - (kicks[index] ?? 0)).toBeCloseTo(gap, 8));
  });

  it('never books a note twice', () => {
    const conductor = band();
    conductor.start(0);
    const hits = run(conductor, 0, 10).notes.map((note) => `${note.at}:${note.item.voice}:${note.item.midi}`);
    expect(new Set(hits).size).toBe(hits.length);
  });

  it('stops at once and books nothing more', () => {
    const conductor = band();
    conductor.start(0);
    run(conductor, 0, 2);
    conductor.stop();
    expect(run(conductor, 2, 3).notes).toEqual([]);
  });

  it('carries on the right beat after a long sleep, with no burst of old notes', () => {
    const conductor = band();
    conductor.start(0);
    run(conductor, 0, 2);
    const seconds = stepSeconds(STYLES.march.bpm);
    const { notes } = conductor.tick(500);
    expect(notes.every((note) => note.at >= 500 && note.at < 500.2)).toBe(true);
    for (const { at } of notes) expect(((at - 0.06) / seconds) % 1).toBeCloseTo(Math.round(((at - 0.06) / seconds) % 1), 6);
  });
});

describe('tapping', () => {
  it('plays a note close to the tap, even with the band off', () => {
    const conductor = band();
    const note = conductor.tap('cat', 1.003);
    expect(note?.at).toBeGreaterThanOrEqual(1.003);
    expect((note?.at ?? 9) - 1.003).toBeLessThanOrEqual(0.07);
  });

  it('lets six fingers land at the same moment', () => {
    const conductor = band();
    conductor.tap('cat', 0);
    const notes = MEMBER_IDS.map((member) => conductor.tap(member, 1));
    expect(notes.filter((note) => note && note.item.voice !== undefined).length).toBeGreaterThanOrEqual(5);
    expect(new Set(notes.map((note) => note?.at)).size).toBeLessThanOrEqual(2);
  });

  it('plays one note per step per musician however fast the mash', () => {
    const conductor = band();
    conductor.tap('frog', 0);
    const played = Array.from({ length: 10 }, (_, i) => conductor.tap('dino', 1.068 + i * 0.001)).filter(Boolean);
    expect(played).toHaveLength(1);
  });
});

describe('recording', () => {
  it('starts the band, and plays the take back by itself in the same places', () => {
    const conductor = band();
    conductor.record(0);
    expect(conductor.playing).toBe(true);
    expect(conductor.recording).toBe(true);
    run(conductor, 0, 2);
    conductor.tap('cat', 2);
    conductor.tap('dino', 3);
    const seconds = stepSeconds(STYLES.march.bpm) * LOOP_STEPS;
    const take = run(conductor, 3, seconds);
    expect(conductor.recording).toBe(false);
    expect(take.cues.some(({ item }) => item.kind === 'recorded')).toBe(true);

    const replay = run(conductor, 3 + seconds, seconds);
    expect(memberCues(replay).sort()).toEqual(['cat', 'dino']);
    expect(voices(replay)).toContain('melody');
    expect(voices(replay)).toContain('drum');
  });

  it('keeps time through a style change, because a song is steps and not seconds', () => {
    const conductor = band();
    conductor.record(0);
    run(conductor, 0, 1);
    conductor.tap('alien', 1);
    run(conductor, 1, stepSeconds(STYLES.march.bpm) * LOOP_STEPS);
    expect(conductor.recording).toBe(false);
    conductor.wild(30);
    const pass = stepSeconds(STYLES[STYLE_IDS[1] ?? 'disco'].bpm) * LOOP_STEPS;
    expect(memberCues(run(conductor, 30, pass))).toEqual(['alien']);
  });

  it('adds new takes to the song', () => {
    const conductor = band();
    conductor.loop.add(0, 'frog', 0);
    conductor.record(0);
    run(conductor, 0, 1);
    conductor.tap('chicken', 1);
    expect(conductor.loop.size).toBe(2);
  });

  it('ignores a second press, and a stop keeps what was played', () => {
    const conductor = band();
    conductor.record(0);
    run(conductor, 0, 1);
    conductor.tap('cat', 1);
    conductor.record(1.1);
    conductor.stop();
    expect(conductor.recording).toBe(false);
    expect(conductor.loop.size).toBe(1);
  });

  it('fills the progress bar across the eight bars', () => {
    const conductor = band();
    conductor.record(0);
    const seconds = stepSeconds(STYLES.march.bpm) * LOOP_STEPS;
    expect(conductor.progress(0.06)).toBeCloseTo(0);
    expect(conductor.progress(0.06 + seconds / 2)).toBeCloseTo(0.5);
  });
});

describe('going wild', () => {
  it('cycles every style and starts the band', () => {
    const conductor = band();
    const seen = STYLE_IDS.map((_, index) => {
      conductor.wild(index);
      return conductor.style.id;
    });
    expect(new Set(seen).size).toBe(STYLE_IDS.length);
    expect(conductor.playing).toBe(true);
  });

  it('never leaves a gap or an overlap at the change of tempo', () => {
    const conductor = band();
    conductor.start(0);
    const before = run(conductor, 0, 2).cues.filter(({ item }) => item.kind === 'beat').at(-1);
    conductor.wild(2);
    const after = run(conductor, 2, 2).cues.filter(({ item }) => item.kind === 'beat')[0];
    const gap = (after?.at ?? 0) - (before?.at ?? 0);
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.8);
  });
});

describe('surprises in the music', () => {
  function playUntil(conductor: Conductor, want: Cue['kind']): { now: number; tick: Tick } {
    let now = 0;
    for (let i = 0; i < 40000; i++) {
      now += 0.04;
      if (i % 12 === 0) conductor.tap('cat', now);
      const tick = conductor.tick(now);
      if (tick.cues.some(({ item }) => item.kind === want)) return { now, tick };
    }
    throw new Error(`No ${want} cue`);
  }

  it('lays an egg on a bar line that hatches into a tiny friend two bars later', () => {
    const conductor = band();
    conductor.start(0);
    const { now, tick } = playUntil(conductor, 'egg');
    const laid = tick.cues.find(({ item }) => item.kind === 'egg');
    const seconds = stepSeconds(STYLES.march.bpm);
    expect(((laid?.at ?? 0) - 0.06) / seconds / STEPS_PER_BAR).toBeCloseTo(Math.round(((laid?.at ?? 0) - 0.06) / seconds / STEPS_PER_BAR), 6);
    const after = run(conductor, now + 0.04, seconds * STEPS_PER_BAR * 2.2);
    const hatched = after.cues.find(({ item }) => item.kind === 'hatch');
    expect(hatched?.item).toMatchObject({ friend: expect.any(String) });
    expect(conductor.director.fans.tiny).toHaveLength(1);
  });

  it('adds the tiny friends to the groove', () => {
    const conductor = band();
    conductor.director.fans.tiny.push('🐞');
    conductor.start(0);
    expect(voices(run(conductor, 0, 6))).toContain('tiny');
  });

  it('turns the spotlight off even if the end of the solo was missed', () => {
    const random = (): number => 0.1;
    const conductor = new Conductor(random, cleanFans({ tiny: ['🐞'] }), new Loop());
    conductor.start(0);
    const { now } = playUntil(conductor, 'solo');
    const tick = conductor.tick(now + 60);
    expect(tick.cues.some(({ item }) => item.kind === 'solo' && item.member === null)).toBe(true);
  });

  it('clears anything booked when the band stops', () => {
    const conductor = band();
    conductor.start(0);
    const { now } = playUntil(conductor, 'egg');
    conductor.stop();
    expect(run(conductor, now, 8).cues.some(({ item }) => item.kind === 'hatch')).toBe(false);
  });
});
