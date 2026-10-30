/** One word's forms for each count, in the grammatical case the line needs. */
export interface SlForms {
  one: string;
  two: string;
  /** Used for 3 and 4. */
  few: string;
  /** Used for 0 and 5 and up. */
  many: string;
}

export type SlGender = 'm' | 'f' | 'n';

/** A noun as game data: its forms, plus the gender its number has to agree with. */
export interface SlNoun extends SlForms {
  gender: SlGender;
}

/** Nominative for "dve jabolki sta tukaj", accusative for "daj mi dve jabolki". */
export type SlCase = 'nom' | 'acc';

// Slovenian looks at the last two digits only: 101 takes "one", but 21 ("enaindvajset") takes "many".
const FORM_FOR_ENDING: Partial<Record<number, keyof SlForms>> = { 1: 'one', 2: 'two', 3: 'few', 4: 'few' };

/** Picks the form for a count: eno jabolko, dve jabolki, tri jabolka, štiri jabolka, pet jabolk. */
export function slCount(n: number, forms: SlForms): string {
  return forms[FORM_FOR_ENDING[Math.abs(n) % 100] ?? 'many'];
}

const LOW_NUMBERS: Record<SlCase, Record<SlGender, readonly [string, string, string, string]>> = {
  nom: {
    m: ['en', 'dva', 'trije', 'štirje'],
    f: ['ena', 'dve', 'tri', 'štiri'],
    n: ['eno', 'dve', 'tri', 'štiri'],
  },
  acc: {
    m: ['en', 'dva', 'tri', 'štiri'],
    f: ['eno', 'dve', 'tri', 'štiri'],
    n: ['eno', 'dve', 'tri', 'štiri'],
  },
};

const HIGH_NUMBERS = ['pet', 'šest', 'sedem', 'osem', 'devet', 'deset'];

/**
 * The number as a word, agreeing with the noun's gender, up to deset. Bigger
 * numbers come back as digits. A masculine animate noun in the accusative takes
 * "enega", which this doesn't cover: write that one line by hand.
 */
export function slNumber(n: number, gender: SlGender, grammaticalCase: SlCase = 'nom'): string {
  return LOW_NUMBERS[grammaticalCase][gender][n - 1] ?? HIGH_NUMBERS[n - 5] ?? String(n);
}

/** Number and noun together: "dve jabolki", "pet jabolk". */
export function slCounted(n: number, noun: SlNoun, grammaticalCase: SlCase = 'nom'): string {
  return `${slNumber(n, noun.gender, grammaticalCase)} ${slCount(n, noun)}`;
}
