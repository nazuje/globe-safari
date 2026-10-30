import { getLanguage, type Language } from '@playroom/kit';
import { en, type Text } from './en.ts';
import { sl } from './sl.ts';

export const textIn = (language: Language): Text => (language === 'sl' ? sl : en);

/** The words in use right now. Read it each time you draw or speak, never once at the top of a file. */
export const text = (): Text => textIn(getLanguage());
