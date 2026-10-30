import '@playroom/kit/kit.css';
import './style.css';
import { homeButton, speak, store, stopSpeaking } from '@playroom/kit';
import { byId } from './dom.ts';
import { INTRO_LINE, PLAY_LINE } from './lines.ts';
import { createPlay } from './play.ts';
import { ROUND_LENGTH, isLevelId, makeRound, type LevelId, type Round } from './rounds.ts';
import { drawBook, drawLevelPicker, drawTitleFriends, runParty } from './screens.ts';
import { addSticker, loadCollection, pickSticker, saveCollection } from './stickers.ts';

type ScreenName = 'title' | 'play' | 'party' | 'book';

interface Progress {
  level: LevelId;
  friendsHome: number;
}

const PROGRESS_KEY = 'shape-friends-progress';
const INTRO_PAUSE_MS = 2000;
const SCREENS: readonly ScreenName[] = ['title', 'play', 'party', 'book'];

function loadProgress(): Progress {
  const saved = store.get<Partial<Progress> | null>(PROGRESS_KEY, null);
  const level = isLevelId(saved?.level) ? saved.level : 1;
  const friendsHome = saved?.friendsHome;
  const inRange = Number.isInteger(friendsHome) && Number(friendsHome) >= 0 && Number(friendsHome) < ROUND_LENGTH;
  return { level, friendsHome: inRange ? Number(friendsHome) : 0 };
}

let progress = loadProgress();
let selected = progress.level;
let round: Round | null = null;
let screen: ScreenName = 'title';
let beforeBook: ScreenName = 'title';

const corner = byId<HTMLButtonElement>('corner');
const dots = byId('dots');

function saveProgress(next: Progress): void {
  progress = next;
  store.set(PROGRESS_KEY, next);
}

function drawDots(): void {
  dots.replaceChildren(
    ...Array.from({ length: ROUND_LENGTH }, (_, i) => {
      const dot = document.createElement('span');
      dot.className = i < progress.friendsHome ? 'dot on' : 'dot';
      return dot;
    }),
  );
}

function show(name: ScreenName): void {
  screen = name;
  for (const other of SCREENS) byId(`${other}-screen`).hidden = other !== name;
  dots.hidden = name !== 'play';
  corner.hidden = name === 'book';
  corner.textContent = name === 'play' ? '⏸' : '📖';
  corner.setAttribute('aria-label', name === 'play' ? 'Pause, for grown-ups' : 'Sticker book');
}

function showLevels(): void {
  drawLevelPicker(selected, (level) => {
    selected = level;
    showLevels();
  });
}

function showTitle(): void {
  show('title');
  showLevels();
  byId('play-label').textContent = progress.friendsHome > 0 && selected === progress.level ? 'Keep playing' : 'Play';
  if (navigator.userActivation?.hasBeenActive) speak(PLAY_LINE);
}

const play = createPlay({
  onHome(friendsHome) {
    saveProgress({ ...progress, friendsHome });
    drawDots();
  },
  onRoundDone(finished) {
    round = null;
    saveProgress({ ...progress, friendsHome: 0 });
    const collected = loadCollection();
    const { sticker, isNew } = pickSticker(collected);
    saveCollection(addSticker(collected, sticker.id));
    show('party');
    void runParty(finished, sticker, isNew);
  },
});

function startPlaying(): void {
  if (selected !== progress.level) saveProgress({ level: selected, friendsHome: 0 });
  if (!round || round.level !== selected) round = makeRound(selected);
  const running = round;
  show('play');
  drawDots();
  // This speech runs inside the tap, which is what lets phones speak later without a tap.
  speak(INTRO_LINE);
  window.setTimeout(() => void play.start(running, progress.friendsHome), INTRO_PAUSE_MS);
}

function openBook(): void {
  if (screen !== 'book') beforeBook = screen;
  drawBook(loadCollection());
  show('book');
}

function tapCorner(): void {
  if (screen !== 'play') {
    openBook();
    return;
  }
  if (play.pause()) showTitle();
}

function closeBook(): void {
  stopSpeaking();
  if (beforeBook === 'party') show('party');
  else showTitle();
}

byId('topbar').prepend(homeButton());
corner.addEventListener('click', tapCorner);
byId('play').addEventListener('click', startPlaying);
byId('next').addEventListener('click', startPlaying);
byId('book-close').addEventListener('click', closeBook);

drawTitleFriends();
showTitle();
