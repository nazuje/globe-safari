import { speak } from '@playroom/kit';

let lastLine = '';
let caption: HTMLElement | null = null;

/** Where each spoken line is also written, for screen readers. */
export function setCaption(element: HTMLElement): void {
  caption = element;
}

/** Sets what the 🔊 button repeats, without speaking. Browsers refuse speech before the first tap. */
export function setLine(line: string): void {
  lastLine = line;
  if (caption) caption.textContent = line;
}

export function say(line: string): void {
  setLine(line);
  speak(line);
}

export function sayAgain(): void {
  if (lastLine) speak(lastLine);
}
