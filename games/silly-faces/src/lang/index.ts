import { getLanguage } from '@playroom/kit';
import type { Part } from '../parts.ts';
import { en, type Text } from './en.ts';
import { sl } from './sl.ts';

export const text = (): Text => (getLanguage() === 'sl' ? sl : en);

/** The grown-up's name for an option, for screen readers. */
export function optionLabel(part: Part, id: string): string {
  return (text().options[part] as Record<string, string>)[id] ?? id;
}
