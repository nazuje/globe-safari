import type { Move } from './moves.ts';
import type { Mode, Scene, Step } from './script.ts';

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export interface ModeInfo {
  id: Mode;
  label: string;
  hint: string;
}

export const MODES: readonly ModeInfo[] = [
  { id: 'follow', label: '🐸 Follow me', hint: 'Copy each animal. Hands free once it starts.' },
  { id: 'freeze', label: '🧊 Freeze dance', hint: 'Dance to the beat. Freeze when it stops.' },
  { id: 'pick', label: '👆 You pick', hint: 'Your child taps the next animal.' },
  { id: 'turn', label: '🔄 Your turn', hint: 'Your child invents the move. You copy.' },
];

export const COUNTS = [3, 6, 10] as const;

type Screen = 'menu' | 'stage' | 'party';

export function showScreen(screen: Screen): void {
  for (const name of ['menu', 'stage', 'party'] as const) byId(name).hidden = name !== screen;
}

function pills<T>(host: HTMLElement, items: readonly T[], label: (item: T) => string, onTap: (item: T) => void): (current: T) => void {
  const buttons = items.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pill';
    button.textContent = label(item);
    button.addEventListener('click', () => onTap(item));
    host.append(button);
    return { item, button };
  });
  return (current) => {
    for (const { item, button } of buttons) button.setAttribute('aria-pressed', String(item === current));
  };
}

/** Draws the grown-up buttons. The returned function marks what's currently chosen. */
export function buildMenu(onMode: (mode: Mode) => void, onCount: (count: number) => void): (mode: Mode, count: number) => void {
  const markMode = pills(byId('modes'), MODES, (mode) => mode.label, (mode) => onMode(mode.id));
  const markCount = pills<number>(byId('counts'), COUNTS, String, onCount);
  return (mode, count) => {
    markMode(MODES.find((info) => info.id === mode) ?? MODES[0]);
    markCount(count);
    byId('mode-hint').textContent = MODES.find((info) => info.id === mode)?.hint ?? '';
  };
}

export function setBeatToggle(on: boolean): void {
  byId('beat-icon').textContent = on ? '🔊' : '🔇';
  const toggle = byId('beat-toggle');
  toggle.setAttribute('aria-pressed', String(on));
  toggle.setAttribute('aria-label', on ? 'Beat on' : 'Beat off');
}

function renderTrail(scene: Scene): void {
  const slots = Array.from({ length: scene.total }, (_, i) => {
    const slot = document.createElement('li');
    const move = scene.trail[i];
    slot.className = move ? 'slot slot-done' : 'slot';
    slot.textContent = move ? move.emoji : '';
    return slot;
  });
  byId('trail').replaceChildren(...slots);
}

function renderActor(scene: Scene): void {
  const { move, view } = scene;
  const anim = view === 'dance' ? 'dance' : view === 'guess' ? 'idle' : view === 'freeze' ? 'none' : (move?.anim ?? 'none');
  byId('animal').textContent = move?.emoji ?? '';
  byId('animal').className = `animal anim-${anim}`;
  byId('puff').textContent = view === 'show' || view === 'move' || view === 'count' ? (move?.puff ?? '') : view === 'freeze' ? '❄️' : '';
  byId('question').hidden = view !== 'guess';
  byId('notes').hidden = view !== 'dance';
  byId('number').hidden = scene.count === undefined;
  byId('number').textContent = String(scene.count ?? '');
  byId('actor').hidden = view === 'pick';
  byId('stage').classList.toggle('is-frozen', view === 'freeze');
  if (move) byId('stage').style.setProperty('--tint', move.tint);
}

function renderChoices(step: Step, onChoose: (move: Move) => void): void {
  const host = byId('choices');
  host.hidden = step.kind !== 'pick';
  if (step.kind !== 'pick') {
    host.replaceChildren();
    return;
  }
  byId('stage').style.setProperty('--tint', '#fff1d6');
  host.replaceChildren(
    ...step.options.map((move, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.style.setProperty('--tint', move.tint);
      button.style.setProperty('--delay', `${i * 0.4}s`);
      button.textContent = move.emoji;
      button.setAttribute('aria-label', move.like);
      button.addEventListener('click', () => onChoose(move));
      return button;
    }),
  );
}

export function renderStep(step: Step, onChoose: (move: Move) => void): void {
  const { scene } = step;
  renderTrail(scene);
  renderActor(scene);
  renderChoices(step, onChoose);
  byId('bar').classList.toggle('bar-on', Boolean(scene.bar));
  byId('line').textContent = scene.view === 'count' ? '' : scene.line;
  byId('tip').textContent = scene.tip;
}

/** Fills the countdown bar. Driven from script, so it works with reduced motion and pauses exactly. */
export function setProgress(progress: number): void {
  byId('bar-fill').style.transform = `scaleX(${1 - progress})`;
}

export function setPaused(paused: boolean): void {
  byId('paused').hidden = !paused;
  byId('stage').classList.toggle('is-paused', paused);
}

export function renderParty(moves: readonly Move[]): void {
  byId('party-actions').hidden = true;
  byId('party-parade').replaceChildren(
    ...moves.map((move, i) => {
      const item = document.createElement('li');
      item.textContent = move.emoji;
      item.style.setProperty('--delay', `${(i % 5) * 0.12}s`);
      return item;
    }),
  );
}
