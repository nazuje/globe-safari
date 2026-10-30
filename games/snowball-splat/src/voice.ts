import { speak } from '@playroom/kit';

/** A spoken line, built when it is used, so 🔊 repeats it in whichever language is on now. */
export type Line = () => string;

let lastLine: Line = () => '';
let caption: HTMLElement | null = null;

/** Where each spoken line is also written, for screen readers. */
export function setCaption(element: HTMLElement): void {
  caption = element;
}

/** Sets what the 🔊 button repeats, without speaking. Browsers refuse speech before the first tap. */
export function setLine(line: Line): void {
  lastLine = line;
  redrawCaption();
}

/** Rewrites the caption, for when the language changes. */
export function redrawCaption(): void {
  if (caption) caption.textContent = lastLine();
}

export function say(line: Line): void {
  setLine(line);
  speak(line());
}

export function sayAgain(): void {
  const line = lastLine();
  if (line) speak(line);
}
