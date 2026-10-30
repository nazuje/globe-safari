export type Mood =
  | 'hungry'
  | 'chomp'
  | 'yuck'
  | 'sneeze'
  | 'mmm'
  | 'wiggle'
  | 'burp'
  | 'giggle'
  | 'dance';

export type MonsterId = 'sky' | 'coral' | 'grape' | 'leaf';

/** The monsters have no names on purpose. Their descriptions for screen readers are in lang/. */
export interface MonsterStyle {
  id: MonsterId;
  body: string;
  belly: string;
  shade: string;
  look: 'horns' | 'ears' | 'antenna' | 'tuft';
  eyes: 1 | 2 | 3;
}

export const MONSTERS: readonly MonsterStyle[] = [
  { id: 'sky', body: '#4cb8ff', belly: '#d9f1ff', shade: '#2f97e0', look: 'horns', eyes: 2 },
  { id: 'coral', body: '#ff8fa3', belly: '#ffe6ea', shade: '#ee6c84', look: 'ears', eyes: 2 },
  { id: 'grape', body: '#a884f8', belly: '#efe7ff', shade: '#8a60ec', look: 'antenna', eyes: 1 },
  { id: 'leaf', body: '#4fd39a', belly: '#defaee', shade: '#2fb57c', look: 'tuft', eyes: 3 },
];

const EXTRAS: Record<MonsterStyle['look'], string[]> = {
  horns: ['m-horn m-left', 'm-horn m-right'],
  ears: ['m-ear m-left', 'm-ear m-right'],
  antenna: ['m-stalk', 'm-pompom'],
  tuft: ['m-leaf m-left', 'm-leaf m-mid', 'm-leaf m-right'],
};

function part(className: string, parent: HTMLElement): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  parent.append(element);
  return element;
}

export interface MonsterView {
  root: HTMLElement;
  mouth: HTMLElement;
  setMood(mood: Mood): void;
  /** 0 is hungry, 1 is stuffed. The body grows to match. */
  setFullness(amount: number): void;
  /** Shows `total` dots on the tummy with the first `filled` colored in. */
  setTally(total: number, filled: number): void;
  /** A quick little wiggle on top of whatever the monster is doing. */
  tickle(): void;
}

/** Draws a whole monster out of plain elements. All the art is in style.css. */
export function buildMonster(style: MonsterStyle): MonsterView {
  const root = document.createElement('div');
  root.className = 'monster';
  root.dataset.look = style.look;
  root.dataset.mood = 'hungry';
  root.style.setProperty('--body', style.body);
  root.style.setProperty('--belly', style.belly);
  root.style.setProperty('--shade', style.shade);
  root.style.setProperty('--full', '0');

  const rig = part('m-rig', root);
  const body = part('m-body', rig);
  for (const className of EXTRAS[style.look]) part(className, body);
  part('m-arm m-left', body);
  part('m-arm m-right', body);
  part('m-foot m-left', body);
  part('m-foot m-right', body);

  const eyes = part(`m-eyes m-eyes-${style.eyes}`, body);
  for (let i = 0; i < style.eyes; i++) part('m-pupil', part('m-eye', eyes));

  part('m-cheek m-left', body);
  part('m-cheek m-right', body);

  const mouth = part('m-mouth', body);
  part('m-tooth m-left', mouth);
  part('m-tooth m-right', mouth);
  part('m-tongue', mouth);

  const tummy = part('m-tummy', body);
  part('m-puff', body);

  return {
    root,
    mouth,
    setMood(mood) {
      // Clearing first lets the same mood play again, such as chomp after chomp.
      delete root.dataset.mood;
      void root.offsetWidth;
      root.dataset.mood = mood;
    },
    setFullness(amount) {
      root.style.setProperty('--full', String(amount));
    },
    setTally(total, filled) {
      tummy.replaceChildren();
      for (let i = 0; i < total; i++) {
        part(i < filled ? 'm-dot m-dot-on' : 'm-dot', tummy);
      }
    },
    tickle() {
      root.classList.remove('tickle');
      void root.offsetWidth;
      root.classList.add('tickle');
    },
  };
}
