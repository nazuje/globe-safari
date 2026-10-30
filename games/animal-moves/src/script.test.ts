import { describe, expect, it } from 'vitest';
import { MOVES, type Move } from './moves.ts';
import { gameScript, MOVE_MS, type Mode, type Script, type Step } from './script.ts';

const rng = () => 0.5;

function playThrough(script: Script): { steps: Step[]; moves: Move[] } {
  const steps: Step[] = [];
  let next = script.next();
  while (!next.done) {
    steps.push(next.value);
    next = script.next(next.value.kind === 'pick' ? next.value.options[0].id : undefined);
  }
  return { steps, moves: next.value };
}

const spoken = (steps: Step[]) => steps.flatMap((step) => (step.kind === 'say' ? [step.text] : []));

describe('Follow me', () => {
  it('says the line, counts to three, chants, then runs the beat, then freezes', () => {
    const { steps, moves } = playThrough(gameScript('follow', MOVES, 3, rng));
    const [move] = moves;
    expect(steps.slice(0, 8).map((step) => step.kind)).toEqual(['say', 'say', 'say', 'say', 'say', 'say', 'beat', 'say']);
    expect(spoken(steps).slice(0, 7)).toEqual([move.line, 'Ready?', 'One', 'Two', 'Three', move.chant, 'Freeze!']);
    expect(steps[6]).toMatchObject({ kind: 'beat', ms: MOVE_MS, scene: { bar: true } });
  });

  it('plays exactly the chosen number of animals', () => {
    for (const count of [3, 6, 10]) {
      const { steps, moves } = playThrough(gameScript('follow', MOVES, count, rng));
      expect(moves).toHaveLength(count);
      expect(steps.filter((step) => step.kind === 'beat')).toHaveLength(count);
      expect(steps.at(-1)?.scene.trail).toHaveLength(count);
    }
  });
});

describe('every mode', () => {
  it.each<Mode>(['follow', 'freeze', 'pick', 'turn'])('%s puts speech on both sides of every beat', (mode) => {
    const { steps } = playThrough(gameScript(mode, MOVES, 6, rng));
    steps.forEach((step, i) => {
      if (step.kind !== 'beat') return;
      expect(steps[i - 1].kind).toBe('say');
      expect(steps[i + 1].kind).toBe('say');
    });
  });

  it.each<Mode>(['follow', 'freeze', 'pick', 'turn'])('%s has no repeats and ends calm', (mode) => {
    const { moves } = playThrough(gameScript(mode, MOVES, 10, rng));
    expect(new Set(moves.map((move) => move.id)).size).toBe(10);
    expect(moves.at(-1)?.energy).toBe('calm');
  });
});

describe('Freeze dance', () => {
  it('stops the music with no countdown bar, then freezes, for each round', () => {
    const { steps } = playThrough(gameScript('freeze', MOVES, 6, rng));
    const beats = steps.filter((step) => step.kind === 'beat');
    expect(beats).toHaveLength(6);
    expect(beats.every((step) => !step.scene.bar)).toBe(true);
    expect(spoken(steps).filter((text) => text === 'Freeze!')).toHaveLength(6);
    expect(steps.filter((step) => step.kind === 'wait').every((step) => step.scene.view === 'freeze')).toBe(true);
  });
});

describe('You pick', () => {
  it('offers three animals each turn and plays the one chosen', () => {
    const script = gameScript('pick', MOVES, 3, rng);
    const first = script.next().value as Step;
    if (first.kind !== 'pick') throw new Error('expected a pick step');
    expect(first.options).toHaveLength(3);
    const chosen = first.options[2];
    const next = script.next(chosen.id).value as Step;
    expect(next.scene.move?.id).toBe(chosen.id);
    expect(next.scene.trail.map((move) => move.id)).toEqual([chosen.id]);
  });

  it('only offers calm animals for the last turn', () => {
    const { steps } = playThrough(gameScript('pick', MOVES, 6, rng));
    const picks = steps.filter((step) => step.kind === 'pick');
    expect(picks).toHaveLength(6);
    expect(picks.at(-1)?.options.every((move) => move.energy === 'calm')).toBe(true);
  });

  it('never offers an animal already played', () => {
    const { steps } = playThrough(gameScript('pick', MOVES, 10, rng));
    const played: string[] = [];
    for (const step of steps) {
      if (step.kind !== 'pick') continue;
      expect(step.options.some((move) => played.includes(move.id))).toBe(false);
      played.push(step.options[0].id);
    }
  });
});

describe('Your turn', () => {
  it('only asks the question and never gives the move away', () => {
    const { steps, moves } = playThrough(gameScript('turn', MOVES, 3, rng));
    const lines = spoken(steps);
    expect(new Set(lines)).toEqual(new Set(['What does it do?', 'Freeze!']));
    for (const move of moves) expect(lines).not.toContain(move.line);
    expect(steps.filter((step) => step.scene.view === 'move')).toEqual([]);
  });
});
