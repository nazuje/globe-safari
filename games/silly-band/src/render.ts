import { patch, type Note, type Part } from './patches.ts';
import type { StyleId } from './styles.ts';

const SILENT = 0.0001;
const NOISE_SECONDS = 1.5;
const OUTPUT_GAIN = 0.8;

/** The sound chain shared by the game and the offline level check. */
export interface Rig {
  context: BaseAudioContext;
  input: AudioNode;
  noise: AudioBuffer;
}

function makeNoise(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * NOISE_SECONDS), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return buffer;
}

/** A limiter then a fixed volume, so a mash of six fingers stays clean and safe for small ears. */
export function buildRig(context: BaseAudioContext): Rig {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 6;
  limiter.ratio.value = 16;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.14;
  const output = context.createGain();
  output.gain.value = OUTPUT_GAIN;
  limiter.connect(output).connect(context.destination);
  return { context, input: limiter, noise: makeNoise(context) };
}

function startSource(rig: Rig, part: Part, at: number, target: AudioNode): void {
  const { context } = rig;
  const end = at + part.seconds + 0.02;
  if (part.source === 'noise') {
    const source = context.createBufferSource();
    source.buffer = rig.noise;
    source.connect(target);
    // A different slice of noise each time, so repeated claps don't sound machine-stamped.
    source.start(at, Math.random() * (NOISE_SECONDS - part.seconds - 0.05));
    source.stop(end);
    return;
  }
  const source = context.createOscillator();
  source.type = part.source;
  source.frequency.setValueAtTime(part.from, at);
  if (part.to !== undefined) source.frequency.exponentialRampToValueAtTime(part.to, at + part.seconds);
  source.connect(target);
  source.start(at);
  source.stop(end);
}

function playPart(rig: Rig, part: Part, at: number, level: number, out: AudioNode): void {
  const { context } = rig;
  const envelope = context.createGain();
  const attack = part.attack ?? 0.002;
  envelope.gain.setValueAtTime(SILENT, at);
  envelope.gain.linearRampToValueAtTime(part.gain * level, at + attack);
  envelope.gain.exponentialRampToValueAtTime(SILENT, at + part.seconds);
  envelope.connect(out);
  if (!part.filter) {
    startSource(rig, part, at, envelope);
    return;
  }
  const filter = context.createBiquadFilter();
  filter.type = part.filter.type;
  filter.frequency.value = part.filter.hz;
  filter.Q.value = part.filter.q;
  filter.connect(envelope);
  startSource(rig, part, at, filter);
}

/** Builds one note at an exact moment on the audio clock. */
export function renderNote(rig: Rig, out: AudioNode, note: Note, styleId: StyleId, at: number): void {
  for (const part of patch(note, styleId)) playPart(rig, part, at + (part.after ?? 0), note.level ?? 1, out);
}
