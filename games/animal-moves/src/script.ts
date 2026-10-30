import { text, type Text } from './lang/index.ts';
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
  readonly line: string;
  /** Small print for the grown-up. */
  readonly tip: string;
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
  | { kind: 'say'; readonly text: string; scene: Scene }
  | { kind: 'wait'; ms: number; scene: Scene }
  | { kind: 'beat'; ms: number; scene: Scene }
  | { kind: 'pick'; readonly text: string; options: Move[]; scene: Scene };

/** Yields steps, receives the chosen move's id after a pick step, returns the moves played. */
export type Script = Generator<Step, Move[], string | undefined>;

type Base = Pick<Scene, 'trail' | 'total'>;
type Words = (words: Text) => string;

// A step's words are looked up each time they're read, so a line that a language
// switch cuts off can start again in the new language, and the screen can follow.
function sceneOf(fields: Omit<Scene, 'line' | 'tip'>, line: Words, tip: Words): Scene {
  return {
    ...fields,
    get line() {
      return line(text());
    },
    get tip() {
      return tip(text());
    },
  };
}

function sayStep(words: Words, scene: Scene): Step {
  return {
    kind: 'say',
    get text() {
      return words(text());
    },
    scene,
  };
}

function moveScene(move: Move, base: Base, view: View, extra: Pick<Scene, 'count' | 'bar'> = {}): Scene {
  return sceneOf({ ...base, ...extra, move, view }, () => move.line, () => move.tip);
}

function* followTurn(move: Move, base: Base): Generator<Step, void, string | undefined> {
  const show = moveScene(move, base, 'show');
  yield sayStep(() => move.line, show);
  yield sayStep((words) => words.ready, show);
  for (const count of [1, 2, 3]) {
    yield sayStep((words) => words.count[count - 1], moveScene(move, base, 'count', { count }));
  }
  yield sayStep(() => move.chant, moveScene(move, base, 'move'));
  yield { kind: 'beat', ms: MOVE_MS, scene: moveScene(move, base, 'move', { bar: true }) };
  yield* freezeEnd(move, base, HOLD_MS, (words) => words.holdStillTip);
}

function* freezeEnd(move: Move, base: Base, ms: number, tip: Words): Generator<Step, void, string | undefined> {
  const line: Words = (words) => words.freeze;
  const scene = sceneOf({ ...base, move, view: 'freeze' }, line, tip);
  yield sayStep(line, scene);
  yield { kind: 'wait', ms, scene };
}

function* followMe(parade: Move[]): Generator<Step, void, string | undefined> {
  for (const [i, move] of parade.entries()) {
    yield* followTurn(move, { trail: parade.slice(0, i + 1), total: parade.length });
  }
}

function* freezeDance(parade: Move[], rng: Rng): Generator<Step, void, string | undefined> {
  const intro: Words = (words) => words.freezeIntro;
  const first = sceneOf({ move: parade[0], trail: [], total: parade.length, view: 'show' }, intro, (words) => words.freezeIntroTip);
  yield sayStep(intro, first);
  for (const [i, move] of parade.entries()) {
    const base = { trail: parade.slice(0, i + 1), total: parade.length };
    const line: Words = (words) => words.dance(move.like);
    const scene = sceneOf({ ...base, move, view: 'dance' }, line, (words) => words.danceTip);
    yield sayStep(line, scene);
    yield { kind: 'beat', ms: danceMs(rng), scene };
    yield* freezeEnd(move, base, frozenMs(rng), (words) => words.frozenTip);
  }
}

function* youPick(moves: readonly Move[], count: number, rng: Rng, recent: readonly string[]): Generator<Step, Move[], string | undefined> {
  const line: Words = (words) => words.pickAnimal;
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
    const scene = sceneOf({ view: 'pick', move: null, trail: played.slice(), total }, line, (words) => words.pickTip);
    const chosen = yield {
      kind: 'pick',
      get text() {
        return line(text());
      },
      options,
      scene,
    };
    const move = options.find((option) => option.id === chosen) ?? options[0];
    played.push(move);
    const trail = played.slice();
    yield sayStep((words) => words.picked, moveScene(move, { trail, total }, 'show'));
    yield* followTurn(move, { trail, total });
  }
  return played;
}

function* yourTurn(parade: Move[]): Generator<Step, void, string | undefined> {
  const line: Words = (words) => words.whatDoesItDo;
  for (const [i, move] of parade.entries()) {
    const base = { trail: parade.slice(0, i + 1), total: parade.length };
    const scene = (bar: boolean) => sceneOf({ ...base, move, view: 'guess', bar }, line, (words) => words.turnTip);
    yield sayStep(line, scene(false));
    yield { kind: 'beat', ms: MOVE_MS, scene: scene(true) };
    yield* freezeEnd(move, base, HOLD_MS, (words) => words.holdStillTip);
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
