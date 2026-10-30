import { burst, say } from '@playroom/kit';
import type { Result } from './game.ts';
import type { KindId } from './kinds.ts';
import { text } from './lang/index.ts';
import * as sounds from './sounds.ts';
import { alienArt, artIcon } from './sprites.ts';
import { element, starRow } from './ui.ts';

/** A finger still pressing from the game shouldn't land on Again by accident. */
const BUTTON_GUARD_MS = 600;

export interface ResultsOptions {
  result: Result;
  newBest: boolean;
  best: number;
  friends: readonly KindId[];
  hasNext: boolean;
  onAgain: () => void;
  onNext: () => void;
  onLevels: () => void;
}

export interface ResultsPanel {
  redraw: () => void;
  line: () => string;
}

function bigButton(className: string, label: string, name: string, onPress: () => void): HTMLButtonElement {
  const press = element('button', className);
  press.type = 'button';
  press.textContent = label;
  press.setAttribute('aria-label', name);
  press.addEventListener('click', () => {
    sounds.tapSound();
    onPress();
  });
  return press;
}

export function showResults(stage: HTMLElement, options: ResultsOptions): ResultsPanel {
  const { result, friends } = options;
  const panel = element('div', 'results');
  panel.dataset.stars = String(result.stars);
  panel.dataset.score = String(result.score);
  stage.append(panel);
  const shownAt = performance.now();
  const cheer = text().done[result.stars - 1] ?? text().done[0];

  function guarded(run: () => void): () => void {
    return () => {
      if (performance.now() - shownAt >= BUTTON_GUARD_MS) run();
    };
  }

  function draw(): void {
    const line = text().done[result.stars - 1] ?? text().done[0];
    const title = element('h2', 'results-title');
    title.textContent = line;
    const score = element('p', 'results-score');
    score.textContent = String(result.score);
    const best = element('p', 'results-best');
    best.textContent = options.newBest ? `🏆 ${text().newBest}` : `${text().best}: ${options.best}`;
    const met = element('div', 'results-friends');
    for (const friend of friends) met.append(artIcon(friend === 'cat' ? 'cat' : alienArt(friend, 'laugh'), 64, 'new-friend'));
    if (friends.length > 0) met.setAttribute('aria-label', text().newFriend);
    const buttons = element('div', 'results-buttons');
    buttons.append(bigButton('btn btn-sun again-btn', '🔁', text().again, guarded(options.onAgain)));
    if (options.hasNext) buttons.append(bigButton('btn btn-leaf next-btn', '▶', text().next, guarded(options.onNext)));
    buttons.append(bigButton('btn levels-btn', '🪐', text().levelsButton, guarded(options.onLevels)));
    panel.replaceChildren(title, starRow(result.stars), score, best, met, buttons);
  }

  draw();
  const box = stage.getBoundingClientRect();
  burst(box.left + box.width / 2, box.top + box.height * 0.3, 28);
  if (options.newBest) sounds.bestSound();
  if (friends.length > 0) sounds.friendSound();
  void say(cheer);
  if (options.newBest) void say(text().newBest, { queue: true });
  else if (friends.length > 0) void say(text().newFriend, { queue: true });
  return { redraw: draw, line: () => text().done[result.stars - 1] ?? text().done[0] };
}
