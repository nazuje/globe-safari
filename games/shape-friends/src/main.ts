import '@playroom/kit/kit.css';
import './style.css';
import { getLanguage, homeButton, languageButton, onLanguageChange, speak, store, stopSpeaking, useClips } from '@playroom/kit';
import { byId } from './dom.ts';
import { text } from './lang/index.ts';
import clips from './lang/sl.clips.json';
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

useClips(clips);

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
const home = homeButton();

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

function drawCorner(): void {
  const { pause, stickerBook } = text();
  corner.hidden = screen === 'book';
  corner.textContent = screen === 'play' ? '⏸' : '📖';
  corner.setAttribute('aria-label', screen === 'play' ? pause : stickerBook);
}

function show(name: ScreenName): void {
  screen = name;
  for (const other of SCREENS) byId(`${other}-screen`).hidden = other !== name;
  dots.hidden = name !== 'play';
  drawCorner();
}

function showLevels(): void {
  drawLevelPicker(selected, (level) => {
    selected = level;
    showLevels();
  });
}

function drawPlayLabel(): void {
  const resuming = progress.friendsHome > 0 && selected === progress.level;
  byId('play-label').textContent = resuming ? text().keepPlaying : text().play;
}

function showTitle(): void {
  show('title');
  showLevels();
  drawPlayLabel();
  if (navigator.userActivation?.hasBeenActive) speak(text().playLine);
}

/** Everything fixed on the page that has words. It reads only the state, so it never touches progress. */
function drawWords(): void {
  const words = text();
  document.documentElement.lang = getLanguage();
  document.title = words.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', words.description);
  byId('game-title').textContent = words.title;
  home.setAttribute('aria-label', words.home);
  byId('friend').setAttribute('aria-label', words.friendLabel);
  byId('say').setAttribute('aria-label', words.sayAgain);
  byId('next').setAttribute('aria-label', words.playAgain);
  byId('book-close').setAttribute('aria-label', words.closeBook);
  drawCorner();
  drawPlayLabel();
  showLevels();
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
  speak(text().introLine);
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

function changeLanguage(): void {
  drawWords();
  if (screen === 'book') drawBook(loadCollection());
  if (screen === 'play') play.retell();
  if (screen === 'title') speak(text().playLine);
}

byId('topbar').prepend(home, languageButton(['en', 'sl']));
onLanguageChange(changeLanguage);
corner.addEventListener('click', tapCorner);
byId('play').addEventListener('click', startPlaying);
byId('next').addEventListener('click', startPlaying);
byId('book-close').addEventListener('click', closeBook);

drawTitleFriends();
drawWords();
showTitle();
