import '@playroom/kit/kit.css';
import './style.css';
import { store } from '@playroom/kit';
import type { MonsterStyle } from './monsters.ts';
import { showPicker } from './picker.ts';
import { startPlay } from './play.ts';
import { LEVELS } from './requests.ts';
import type { Level } from './requests.ts';
import { restoreRound } from './round.ts';

const LEVEL_KEY = 'yum-yum-monster:level';
const ROUND_KEY = 'yum-yum-monster:round';

function byId(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found;
}

function savedLevel(): Level {
  const level = store.get<number>(LEVEL_KEY, 1);
  return LEVELS.find((known) => known === level) ?? 1;
}

const app = byId('app');
let level = savedLevel();
let stopScreen: () => void = () => {};

function play(style: MonsterStyle): void {
  stopScreen();
  // A palm on the home or settings button must not lose a game in progress.
  const resume = restoreRound(store.get<unknown>(ROUND_KEY, null), level);
  stopScreen = startPlay(app, {
    style,
    level,
    resume,
    onProgress: (round) => store.set(ROUND_KEY, round),
    onLeave: pickMonster,
  });
}

function pickMonster(): void {
  stopScreen();
  stopScreen = showPicker(app, {
    level,
    onLevel: (picked) => {
      level = picked;
      store.set(LEVEL_KEY, picked);
    },
    onPick: play,
  });
}

pickMonster();
