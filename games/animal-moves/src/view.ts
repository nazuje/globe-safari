import { getLanguage } from '@playroom/kit';
import { text } from './lang/index.ts';
import type { Move } from './moves.ts';
import type { Mode, Scene, Step } from './script.ts';

export function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

export const MODES: readonly Mode[] = ['follow', 'freeze', 'pick', 'turn'];

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
    button.addEventListener('click', () => onTap(item));
    host.append(button);
    return { item, button };
  });
  return (current) => {
    for (const { item, button } of buttons) {
      button.textContent = label(item);
      button.setAttribute('aria-pressed', String(item === current));
    }
  };
}

/** Draws the grown-up buttons. The returned function marks what's currently chosen. */
export function buildMenu(onMode: (mode: Mode) => void, onCount: (count: number) => void): (mode: Mode, count: number) => void {
  const markMode = pills(byId('modes'), MODES, (mode) => text().modes[mode].label, onMode);
  const markCount = pills<number>(byId('counts'), COUNTS, String, onCount);
  return (mode, count) => {
    markMode(mode);
    markCount(count);
    byId('mode-hint').textContent = text().modes[mode].hint;
  };
}

export function setBeatToggle(on: boolean): void {
  byId('beat-icon').textContent = on ? '🔊' : '🔇';
  const toggle = byId('beat-toggle');
  toggle.setAttribute('aria-pressed', String(on));
  toggle.setAttribute('aria-label', on ? text().beatOn : text().beatOff);
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
      button.addEventListener('click', () => onChoose(move));
      return button;
    }),
  );
}

/** The words of a step. A language switch calls this alone, so the animations carry on. */
export function renderStepWords(step: Step): void {
  const { scene } = step;
  byId('line').textContent = scene.view === 'count' ? '' : scene.line;
  byId('tip').textContent = scene.tip;
  if (step.kind !== 'pick') return;
  for (const [i, choice] of [...byId('choices').children].entries()) choice.setAttribute('aria-label', step.options[i].like);
}

export function renderStep(step: Step, onChoose: (move: Move) => void): void {
  const { scene } = step;
  renderTrail(scene);
  renderActor(scene);
  renderChoices(step, onChoose);
  byId('bar').classList.toggle('bar-on', Boolean(scene.bar));
  renderStepWords(step);
}

/** Fills the countdown bar. Driven from script, so it works with reduced motion and pauses exactly. */
export function setProgress(progress: number): void {
  byId('bar-fill').style.transform = `scaleX(${1 - progress})`;
}

export function setPaused(paused: boolean): void {
  byId('paused').hidden = !paused;
  byId('stage').classList.toggle('is-paused', paused);
}

/** Every word in index.html, in the language in use. */
export function renderPageWords(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  byId('game-title').textContent = words.title;
  byId('party-title').textContent = words.highFive;
  byId('go').textContent = words.go;
  byId('again').textContent = words.go;
  byId('to-menu').textContent = words.changeGame;
  byId('stop').textContent = words.stopGame;
  byId('animals-label').textContent = words.animals;
  byId('modes').setAttribute('aria-label', words.game);
  byId('counts').setAttribute('aria-label', words.howManyAnimals);
  byId('pause').setAttribute('aria-label', words.pause);
  byId('resume').setAttribute('aria-label', words.keepGoing);
  byId('menu-say').setAttribute('aria-label', words.sayAgain);
  byId('repeat').setAttribute('aria-label', words.sayAgain);
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
