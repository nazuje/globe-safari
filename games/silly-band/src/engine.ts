import type { Note } from './patches.ts';
import { buildRig, renderNote, type Rig } from './render.ts';
import type { StyleId } from './styles.ts';

/**
 * The live sound. All notes go through a bus, so stopping is a matter of fading
 * the bus out and starting a new one: anything queued up on the old bus plays
 * into silence, even notes booked ahead on the audio clock.
 */
export class Engine {
  private context: AudioContext | null = null;
  private rig: Rig | null = null;
  private bus: GainNode | null = null;

  /** Call from every tap. iOS only counts some events as a tap, so it may be called a few times. */
  wake(): void {
    if (!this.context) this.create();
    if (this.context && this.context.state !== 'running') this.context.resume().catch(() => undefined);
  }

  private create(): void {
    if (typeof AudioContext === 'undefined') return;
    try {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.rig = buildRig(this.context);
      this.bus = this.newBus(this.rig);
    } catch {
      this.context = null;
    }
  }

  private newBus(rig: Rig): GainNode {
    const bus = rig.context.createGain();
    bus.connect(rig.input);
    return bus;
  }

  get ready(): boolean {
    return this.context !== null;
  }

  /** The audio clock. It stops while the context sleeps, and everything is timed against it. */
  get now(): number {
    return this.context?.currentTime ?? 0;
  }

  play(note: Note, styleId: StyleId, at: number): void {
    if (this.rig && this.bus) renderNote(this.rig, this.bus, note, styleId, at);
  }

  /** Silences everything now, including notes already booked. Sound can start again straight after. */
  silence(): void {
    if (!this.rig || !this.bus) return;
    const { gain } = this.bus;
    const now = this.rig.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + 0.012);
    this.bus = this.newBus(this.rig);
  }

  /** Stops the whole audio clock, for when the page goes away. */
  sleep(): void {
    this.silence();
    if (this.context?.state === 'running') this.context.suspend().catch(() => undefined);
  }
}
