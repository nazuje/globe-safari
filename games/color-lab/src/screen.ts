import { burst, canSpeak, speak, stopSpeaking, store } from '@playroom/kit';
import { byId, centerOf } from './dom.ts';
import { PROGRESS_KEY, readProgress, withLevel, withStar } from './progress.ts';
import type { Progress, ScoredMode } from './progress.ts';
import type { Level } from './rounds.ts';

let lastLine = '';

/** Says a line and remembers it for the 🔊 button. */
export function say(line: string): void {
  lastLine = line;
  if (canSpeak()) speak(line);
}

export function sayAgain(): void {
  if (lastLine) say(lastLine);
}

export function hush(): void {
  lastLine = '';
  stopSpeaking();
}

export function loadProgress(): Progress {
  return readProgress(store.get<unknown>(PROGRESS_KEY, null));
}

export function saveLevel(mode: ScoredMode, level: Level): void {
  store.set(PROGRESS_KEY, withLevel(loadProgress(), mode, level));
}

export function showStars(count: number | null): void {
  const badge = byId('stars');
  badge.hidden = count === null;
  badge.textContent = `⭐ ${count ?? 0}`;
  badge.setAttribute('aria-label', `${count ?? 0} stars`);
}

/** Saves a star, bumps the top bar, and bursts from the element that earned it. */
export function awardStar(mode: ScoredMode, from: HTMLElement): void {
  const progress = withStar(loadProgress(), mode);
  store.set(PROGRESS_KEY, progress);
  showStars(progress.stars[mode]);
  const { x, y } = centerOf(from);
  burst(x, y);
}
