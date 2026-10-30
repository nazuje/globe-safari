import type { Move } from './moves.ts';
import { danceMs, energyPlan, frozenMs, pickChoices, pickParade, type Rng } from './parade.ts';

export type Mode = 'follow' | 'freeze' | 'pick' | 'turn';
export type View = 'show' | 'count' | 'move' | 'guess' | 'dance' | 'freeze' | 'pick';

export const MOVE_MS = 10_000;
export const HOLD_MS = 1500;

/** What the screen shows during a step. */
export interface Scene {
  view: View;
  move: Move | null;
  /** The big number during "One, two, three". */
  count?: number;
  /** What the 🔊 button says again. */
  line: string;
  /** Small print for the grown-up. */
  tip: string;
  /** Show the countdown bar. */
  bar?: boolean;
  /** The animals of this parade so far, for the row at the top. */
  trail: readonly Move[];
  total: number;
}

/**
 * The game is one list of steps, played strictly one at a time. Speech and the
 * beat are different kinds of step, so they can never run over each other.
 */
export type Step =
  | { kind: 'say'; text: string; scene: Scene }
  | { kind: 'wait'; ms: number; scene: Scene }
  | { kind: 'beat'; ms: number; scene: Scene }
  | { kind: 'pick'; text: string; options: Move[]; scene: Scene };

/** Yields steps, receives the chosen move's id after a pick step, returns the moves played. */
export type Script = Generator<Step, Move[], string | undefined>;

const FREEZE = 'Freeze!';
const COUNT_WORDS = ['One', 'Two', 'Three'];

function* followTurn(move: Move, base: Pick<Scene, 'trail' | 'total'>): Generator<Step, void, string | undefined> {
  const scene = { ...base, move, line: move.line, tip: move.tip };
  yield { kind: 'say', text: move.line, scene: { ...scene, view: 'show' } };
  yield { kind: 'say', text: 'Ready?', scene: { ...scene, view: 'show' } };
  for (const [i, word] of COUNT_WORDS.entries()) {
    yield { kind: 'say', text: word, scene: { ...scene, view: 'count', count: i + 1 } };
  }
  yield { kind: 'say', text: move.chant, scene: { ...scene, view: 'move' } };
  yield { kind: 'beat', ms: MOVE_MS, scene: { ...scene, view: 'move', bar: true } };
  yield* freezeEnd(move, base, HOLD_MS, 'Hold still!');
}

function* freezeEnd(move: Move, base: Pick<Scene, 'trail' | 'total'>, ms: number, tip: string): Generator<Step, void, string | undefined> {
  const scene: Scene = { ...base, move, view: 'freeze', line: FREEZE, tip };
  yield { kind: 'say', text: FREEZE, scene };
  yield { kind: 'wait', ms, scene };
}

function* followMe(parade: Move[]): Generator<Step, void, string | undefined> {
  for (const [i, move] of parade.entries()) {
    yield* followTurn(move, { trail: parade.slice(0, i + 1), total: parade.length });
  }
}

function* freezeDance(parade: Move[], rng: Rng): Generator<Step, void, string | undefined> {
  const intro = 'Freeze when the music stops!';
  const first = { move: parade[0], trail: [], total: parade.length, line: intro, tip: 'Dance, then stop dead when the beat stops.' };
  yield { kind: 'say', text: intro, scene: { ...first, view: 'show' } };
  for (const [i, move] of parade.entries()) {
    const base = { trail: parade.slice(0, i + 1), total: parade.length };
    const line = `Dance like ${move.like}!`;
    const scene: Scene = { ...base, move, view: 'dance', line, tip: 'Any dance will do.' };
    yield { kind: 'say', text: line, scene };
    yield { kind: 'beat', ms: danceMs(rng), scene };
    yield* freezeEnd(move, base, frozenMs(rng), 'Hold still until the music comes back.');
  }
}

function* youPick(moves: readonly Move[], count: number, rng: Rng, recent: readonly string[]): Generator<Step, Move[], string | undefined> {
  const line = 'Pick an animal!';
  const total = Math.min(count, moves.length);
  const played: Move[] = [];
  for (const energy of energyPlan(total)) {
    const options = pickChoices(
      moves,
      energy,
      played.map((move) => move.id),
      rng,
      recent,
    );
    const scene: Scene = { view: 'pick', move: null, line, tip: 'Your child is the boss. Everyone copies.', trail: played.slice(), total };
    const chosen = yield { kind: 'pick', text: line, options, scene };
    const move = options.find((option) => option.id === chosen) ?? options[0];
    played.push(move);
    const trail = played.slice();
    yield { kind: 'say', text: "You're the boss!", scene: { view: 'show', move, line: move.line, tip: move.tip, trail, total } };
    yield* followTurn(move, { trail, total });
  }
  return played;
}

function* yourTurn(parade: Move[]): Generator<Step, void, string | undefined> {
  const line = 'What does it do?';
  for (const [i, move] of parade.entries()) {
    const base = { trail: parade.slice(0, i + 1), total: parade.length };
    const scene: Scene = { ...base, move, view: 'guess', line, tip: 'Your child makes up the move. You copy it!' };
    yield { kind: 'say', text: line, scene };
    yield { kind: 'beat', ms: MOVE_MS, scene: { ...scene, bar: true } };
    yield* freezeEnd(move, base, HOLD_MS, 'Hold still!');
  }
}

/** The whole game for a mode, as steps. Pure: all chance comes from rng. */
export function* gameScript(mode: Mode, moves: readonly Move[], count: number, rng: Rng, recent: readonly string[] = []): Script {
  if (mode === 'pick') return yield* youPick(moves, count, rng, recent);
  const parade = pickParade(moves, count, rng, recent);
  if (mode === 'follow') yield* followMe(parade);
  if (mode === 'freeze') yield* freezeDance(parade, rng);
  if (mode === 'turn') yield* yourTurn(parade);
  return parade;
}
