/** Each kind of request has this many wordings. A request keeps its pick, so it survives a language switch. */
export const LINE_VARIANTS: readonly number[] = [0, 1, 2];

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
