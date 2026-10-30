import { store } from '@playroom/kit';
import { CHARACTERS, type CharacterId } from './characters.ts';
import { LEVELS, type Level } from './tuning.ts';

export interface Pick {
  character: CharacterId;
  level: Level;
}

export interface Save {
  picks: [Pick | null, Pick | null];
  /** Null until someone chooses, so the device's own default applies. */
  opposite: boolean | null;
  /** Wins belong to the character, so a tally survives the children swapping seats. */
  wins: Partial<Record<CharacterId, number>>;
  rounds: number;
}

const KEY = 'balloon-battle';

function validPick(pick: Pick | null | undefined): Pick | null {
  const known =
    pick && CHARACTERS.some(({ id }) => id === pick.character) && LEVELS.some(({ id }) => id === pick.level);
  return known ? pick : null;
}

/** Reads what this device remembers. Anything odd in storage is dropped rather than trusted. */
export function loadSave(): Save {
  const saved = store.get<Partial<Save>>(KEY, {});
  const first = validPick(saved.picks?.[0]);
  const second = validPick(saved.picks?.[1]);
  const clash = first && second && first.character === second.character;
  return {
    picks: clash ? [null, null] : [first, second],
    opposite: typeof saved.opposite === 'boolean' ? saved.opposite : null,
    wins: saved.wins && typeof saved.wins === 'object' ? saved.wins : {},
    rounds: typeof saved.rounds === 'number' ? saved.rounds : 0,
  };
}

export function writeSave(save: Save): void {
  store.set(KEY, save);
}
