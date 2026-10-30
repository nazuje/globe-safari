import { store } from '@playroom/kit';
import { boneId, DINOS, itemById, itemsIn, PIECES, type DinoId, type Item } from './catalog.ts';
import { PLACES } from './places.ts';

export type Size = 'small' | 'big';

/** Everything that survives closing the game. */
export interface Save {
  found: string[];
  size: Size;
  /** Index into PLACES of the next patch. */
  place: number;
  patches: number;
  sinceChest: number;
  sinceEgg: number;
}

export function freshSave(): Save {
  return { found: [], size: 'small', place: 0, patches: 0, sinceChest: 0, sinceEgg: 0 };
}

function count(value: unknown, below = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < below ? value : 0;
}

/** Turns whatever was in storage into a good save, keeping what can be kept. */
export function readSave(saved: unknown): Save {
  if (typeof saved !== 'object' || saved === null) return freshSave();
  const raw = saved as Partial<Record<keyof Save, unknown>>;
  const found = Array.isArray(raw.found) ? raw.found.filter((id) => typeof id === 'string' && itemById(id)) : [];
  return {
    found: [...new Set(found as string[])],
    size: raw.size === 'big' ? 'big' : 'small',
    place: count(raw.place, PLACES.length),
    patches: count(raw.patches),
    sinceChest: count(raw.sinceChest),
    sinceEgg: count(raw.sinceEgg),
  };
}

const SAVE_KEY = 'treasure-dig:save';

export function loadSave(): Save {
  return readSave(store.get<unknown>(SAVE_KEY, null));
}

export function saveGame(save: Save): void {
  store.set(SAVE_KEY, save);
}

export function has(save: Save, id: string): boolean {
  return save.found.includes(id);
}

export function addFound(save: Save, id: string): void {
  if (!has(save, id)) save.found.push(id);
}

export function missingBones(save: Save, dino: DinoId): string[] {
  return PIECES.map((piece) => boneId(dino, piece)).filter((id) => !has(save, id));
}

/** The dinosaur being dug up now. Undefined once all of them stand in the museum. */
export function currentDino(save: Save): DinoId | undefined {
  return DINOS.find((dino) => missingBones(save, dino).length > 0);
}

export function collectedCount(save: Save): number {
  return save.found.length;
}

/** Picks n from the list, things not yet found first, so every patch tends to bring something new. */
export function pickFresh(save: Save, items: Item[], n: number, rng: () => number): Item[] {
  const shuffled = shuffle(items, rng);
  const fresh = shuffled.filter((item) => !has(save, item.id));
  const seen = shuffled.filter((item) => has(save, item.id));
  return [...fresh, ...seen].slice(0, n);
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function dragonToHatch(save: Save, rng: () => number): Item {
  return pickFresh(save, itemsIn('dragon'), 1, rng)[0] as Item;
}
