import { store } from '@playroom/kit';
import { HOME_COLOR, type ColorName, type Friend, type Rng, type ShapeName } from './rounds.ts';

export type Accessory = 'none' | 'hat' | 'bow' | 'crown' | 'glasses';

export interface Sticker {
  id: string;
  friend: Friend;
  accessory: Accessory;
}

const SHAPES = Object.keys(HOME_COLOR) as ShapeName[];
const WEARABLES: readonly Accessory[] = ['hat', 'bow', 'crown', 'glasses'];
const COSTUME_COLORS: readonly ColorName[] = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

function sticker(shape: ShapeName, color: ColorName, accessory: Accessory): Sticker {
  return { id: `${shape}-${color}-${accessory}`, friend: { shape, color, size: 'middle' }, accessory };
}

/** Three friends per shape: its plain self, then two dressed up. */
export const STICKERS: readonly Sticker[] = SHAPES.flatMap((shape, i) => {
  const dressed = [0, 1].map((step) => {
    const turn = i * 2 + step;
    const colors = COSTUME_COLORS.filter((color) => color !== HOME_COLOR[shape]);
    return sticker(shape, colors[turn % colors.length], WEARABLES[turn % WEARABLES.length]);
  });
  return [sticker(shape, HOME_COLOR[shape], 'none'), ...dressed];
});

/** Saved data can be old or edited, so anything that isn't a real sticker is dropped. */
export function cleanCollection(saved: unknown): string[] {
  if (!Array.isArray(saved)) return [];
  const known = new Set(STICKERS.map((item) => item.id));
  return [...new Set(saved)].filter((id): id is string => typeof id === 'string' && known.has(id));
}

export interface StickerPick {
  sticker: Sticker;
  isNew: boolean;
}

export function pickSticker(collected: readonly string[], rng: Rng = Math.random): StickerPick {
  const missing = STICKERS.filter((item) => !collected.includes(item.id));
  const choices = missing.length > 0 ? missing : STICKERS;
  return { sticker: choices[Math.floor(rng() * choices.length)], isNew: missing.length > 0 };
}

export function addSticker(collected: readonly string[], id: string): string[] {
  return collected.includes(id) ? [...collected] : [...collected, id];
}

const STICKERS_KEY = 'shape-friends-stickers';

export function loadCollection(): string[] {
  return cleanCollection(store.get<unknown>(STICKERS_KEY, []));
}

export function saveCollection(collected: readonly string[]): void {
  store.set(STICKERS_KEY, collected);
}
