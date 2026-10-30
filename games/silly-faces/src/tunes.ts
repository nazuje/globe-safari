/** One sound in a little piece of music. */
export interface Note {
  /** Milliseconds from the start. */
  at: number;
  hz: number;
  wave: OscillatorType;
  seconds: number;
  gain: number;
}

const BEAT_MS = 190;

/** A melody as MIDI notes, one per beat. Zero is a rest. */
const MELODIES: readonly (readonly number[])[] = [
  [72, 76, 79, 76, 72, 76, 79, 0, 81, 79, 76, 72, 74, 76, 72, 0, 72, 76, 79, 84, 81, 79, 76, 0, 74, 76, 74, 72, 79, 0, 84, 0],
  [67, 0, 67, 69, 72, 0, 72, 74, 76, 74, 72, 69, 67, 0, 72, 0, 69, 0, 69, 72, 74, 0, 76, 79, 81, 79, 76, 74, 72, 0, 79, 84],
  [76, 72, 76, 79, 84, 79, 76, 72, 74, 71, 74, 79, 83, 79, 74, 0, 76, 72, 76, 79, 84, 79, 76, 72, 74, 79, 76, 74, 72, 0, 72, 0],
];

const BASS = [48, 55, 53, 55];

export const TUNE_COUNT = MELODIES.length;

/** Friends join in as the wall fills up, so a full wall sounds like a band. */
const HARMONY_AT = 6;
const SPARKLE_AT = 12;

export function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** How long a tune lasts, in milliseconds. */
export function tuneLength(index: number): number {
  return MELODIES[index % TUNE_COUNT]!.length * BEAT_MS;
}

/** The notes of a dance tune. Every wall friend past a few adds a layer. */
export function tune(index: number, friends = 0): Note[] {
  const melody = MELODIES[index % TUNE_COUNT]!;
  const notes: Note[] = [];
  melody.forEach((midi, beat) => {
    const at = beat * BEAT_MS;
    if (midi > 0) {
      notes.push({ at, hz: hz(midi), wave: 'triangle', seconds: 0.2, gain: 0.7 });
      if (friends >= HARMONY_AT) notes.push({ at, hz: hz(midi - 5), wave: 'sine', seconds: 0.2, gain: 0.3 });
      if (friends >= SPARKLE_AT && beat % 2 === 0) {
        notes.push({ at, hz: hz(midi + 12), wave: 'sine', seconds: 0.12, gain: 0.25 });
      }
    }
    if (beat % 2 === 0) {
      notes.push({ at, hz: hz(BASS[(beat / 2) % BASS.length]!), wave: 'square', seconds: 0.14, gain: 0.3 });
    }
  });
  return notes;
}

function run(steps: readonly (readonly [at: number, hz: number])[], wave: OscillatorType, seconds: number, gain: number): Note[] {
  return steps.map(([at, pitch]) => ({ at, hz: pitch, wave, seconds, gain }));
}

/** Small sounds kit doesn't have, built from notes. */
export const SOUNDS = {
  giggle: run(
    [[0, 880], [90, 1047], [180, 932], [270, 1175], [360, 988], [450, 1319], [560, 1109], [660, 1397]],
    'sine',
    0.07,
    0.6,
  ),
  inhale: run([[0, 300], [240, 360], [480, 430], [680, 520]], 'sine', 0.2, 0.3),
  yawn: run(
    [[0, 330], [200, 392], [420, 440], [700, 392], [950, 349], [1200, 294], [1450, 247], [1700, 196]],
    'triangle',
    0.3,
    0.5,
  ),
  camera: run([[0, 1568], [70, 1047]], 'square', 0.05, 0.3),
  float: run([[0, 392], [150, 494], [300, 587], [450, 698], [600, 784], [750, 988]], 'sine', 0.16, 0.5),
  fall: run([[1500, 880], [1600, 740], [1700, 587], [1800, 440], [1900, 330]], 'sine', 0.12, 0.5),
  poof: run([[0, 220], [60, 330], [120, 494], [180, 740], [240, 1109]], 'triangle', 0.1, 0.5),
} satisfies Record<string, Note[]>;

/** The rising tick-tick-tick of the shuffle wheel. */
export function whirlTick(step: number): Note {
  return { at: 0, hz: 300 * 1.045 ** step, wave: 'square', seconds: 0.035, gain: 0.25 };
}
