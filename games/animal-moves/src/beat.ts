const STEP_S = 0.46;
const LOOK_AHEAD_S = 0.15;
const TICK_MS = 60;
const VOLUME = 0.8;

interface Pulse {
  startHz: number;
  endHz: number;
  gain: number;
  seconds: number;
  wave: OscillatorType;
}

const BOOM: Pulse = { startHz: 170, endHz: 55, gain: 1, seconds: 0.22, wave: 'sine' };
const TAP: Pulse = { startHz: 340, endHz: 200, gain: 0.35, seconds: 0.09, wave: 'triangle' };

/** A plain four-count drum: boom, tap, boom, tap. */
export const pulseFor = (beat: number): Pulse => (beat % 2 === 0 ? BOOM : TAP);

export interface Beat {
  /** Call during a tap: browsers only allow sound to start from one. */
  unlock(): void;
  start(): void;
  stop(): void;
  setEnabled(enabled: boolean): void;
}

/** Quiet no-ops when Web Audio isn't there, so the game plays on without a beat. */
export function createBeat(enabled: boolean): Beat {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let running = false;
  let next = 0;
  let count = 0;

  function ready(): boolean {
    if (context) return true;
    if (typeof AudioContext === 'undefined') return false;
    try {
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context !== null;
  }

  function wake(): void {
    if (context?.state === 'suspended') context.resume().catch(() => undefined);
  }

  function play(pulse: Pulse, at: number): void {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = pulse.wave;
    oscillator.frequency.setValueAtTime(pulse.startHz, at);
    oscillator.frequency.exponentialRampToValueAtTime(pulse.endHz, at + pulse.seconds);
    gain.gain.setValueAtTime(pulse.gain, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + pulse.seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(at);
    oscillator.stop(at + pulse.seconds);
  }

  function schedule(): void {
    if (!context) return;
    while (next < context.currentTime + LOOK_AHEAD_S) {
      play(pulseFor(count), next);
      count += 1;
      next += STEP_S;
    }
  }

  function sound(): void {
    if (!enabled || !running || ticker !== undefined || !ready() || !context || !master) return;
    wake();
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(VOLUME, context.currentTime);
    count = 0;
    next = context.currentTime + 0.05;
    schedule();
    ticker = setInterval(schedule, TICK_MS);
  }

  function silence(): void {
    clearInterval(ticker);
    ticker = undefined;
    if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, 0.008);
    }
  }

  return {
    unlock() {
      if (enabled && ready()) wake();
    },
    start() {
      running = true;
      sound();
    },
    stop() {
      running = false;
      silence();
    },
    setEnabled(value) {
      enabled = value;
      if (enabled) {
        if (ready()) wake();
        sound();
      } else {
        silence();
      }
    },
  };
}
