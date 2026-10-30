import '@playroom/kit/kit.css';
import './style.css';
import { burst, canSpeak, homeButton, speak, stopSpeaking, store } from '@playroom/kit';
import { planChant, playChant, QUESTIONS } from './chant.ts';
import { furthestAfterTrain, readFurthest, TRAINS_PER_LEVEL } from './journey.ts';
import { makeTrain, MAX_LEVEL, type Blank, type Item, type Train } from './pattern.ts';
import { Scene } from './scene.ts';

const FURTHEST_KEY = 'pattern-train:furthest';
const CHEERS = ['Toot toot!', 'Choo choo!', 'Hooray!'];
const LEVEL_PREVIEWS = ['🔴🔵🔴🔵', '🔴🔴🔵🔴🔴🔵', '🔴🔵🟡🔴🔵🟡', '🔴🔴🔵🔵🔴🔴🔵🔵', '🔴🔵❓🔵🔴🔵', '🔴🔵🔴🔴🔵🔴🔴🔴🔵'];

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const levelBtn = byId('level-btn');
const journeyEl = byId('journey');
const promptEl = byId('prompt');
const sayBtn = byId<HTMLButtonElement>('say');
const hintBtn = byId<HTMLButtonElement>('hint');
const hintNote = byId('hint-note');
const optionsEl = byId('options');
const picker = byId('picker');
const pickerClose = byId('picker-close');
const levelsEl = byId('levels');
const aboardBtn = byId('aboard');
const winPanel = byId('win');
const winTitle = byId('win-title');
const nextBtn = byId('next');

const scene = new Scene(byId('scene'), byId('rows'), byId('toot'));

let furthest = readFurthest(store.get<unknown>(FURTHEST_KEY, 1));
let level = furthest;
let trainsDone = 0;
let train: Train | null = null;
let filled = new Set<number>();
let blank: Blank | null = null;
let hintOn = false;
let stopChant: (() => void) | null = null;
/** Bumped whenever a new train or level takes over, so older animations know to stop. */
let run = 0;

let chantVoice: SpeechSynthesisVoice | undefined;
/** Held here because browsers can forget an utterance mid-word and never report it finished. */
const chantWords = new Set<SpeechSynthesisUtterance>();

/** Like the kit's speak, but one quiet word at a set pitch that reports when it finishes. */
function sayWord(word: string, pitch: number, done: () => void): void {
  if (!canSpeak()) {
    done();
    return;
  }
  chantVoice ??= speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('en') && voice.localService);
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 1;
  utterance.pitch = pitch;
  if (chantVoice) utterance.voice = chantVoice;
  const finish = (): void => {
    chantWords.delete(utterance);
    done();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  chantWords.add(utterance);
  speechSynthesis.speak(utterance);
}

function endChant(): void {
  stopChant?.();
  stopChant = null;
  scene.setBeat(null);
  sayBtn.classList.remove('playing');
}

function toggleChant(): void {
  if (stopChant) {
    endChant();
    stopSpeaking();
    return;
  }
  if (!train || !blank) return;
  stopSpeaking();
  sayBtn.classList.add('playing');
  stopChant = playChant(planChant(train, filled), {
    say: sayWord,
    onBeat: (beat) => scene.setBeat(beat.car),
    onEnd: endChant,
  });
}

function setHint(on: boolean): void {
  hintOn = on && train !== null;
  hintBtn.setAttribute('aria-pressed', String(hintOn));
  hintNote.textContent = hintOn && train ? train.hintNote : '';
  scene.setHint(hintOn && train ? train.hint : []);
}

function drawJourney(): void {
  journeyEl.setAttribute('aria-label', `Level ${level}, train ${Math.min(trainsDone + 1, TRAINS_PER_LEVEL)} of ${TRAINS_PER_LEVEL}`);
  journeyEl.replaceChildren(
    ...Array.from({ length: TRAINS_PER_LEVEL }, (_, i) => {
      const station = document.createElement('li');
      const done = i < trainsDone;
      station.className = `station${done ? ' done' : ''}${i === trainsDone ? ' here' : ''}`;
      station.textContent = done ? '⭐' : '';
      return station;
    }),
  );
  levelBtn.textContent = `Level ${level}`;
}

function drawOptions(current: Blank): void {
  optionsEl.style.setProperty('--count', String(current.options.length));
  optionsEl.replaceChildren(
    ...current.options.map((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn opt';
      button.textContent = item.emoji;
      button.setAttribute('aria-label', item.name);
      button.addEventListener('click', () => void choose(item, button));
      return button;
    }),
  );
}

function ask(current: Blank): void {
  if (!train) return;
  blank = current;
  scene.setActive(current.index);
  drawOptions(current);
  promptEl.textContent = QUESTIONS[train.question];
  speak(QUESTIONS[train.question]);
}

function wrongAnswer(button: HTMLButtonElement): void {
  endChant();
  button.disabled = true;
  button.classList.add('wiggle');
  promptEl.textContent = 'Try again!';
  speak('Try again!');
}

async function choose(item: Item, button: HTMLButtonElement): Promise<void> {
  if (!train || !blank) return;
  if (item.name !== blank.answer.name) {
    wrongAnswer(button);
    return;
  }

  const token = run;
  const solved = blank;
  blank = null;
  endChant();
  // The hop measures the button straight away, so the buttons can go right after it starts.
  const landing = scene.hop(solved.index, item, button);
  optionsEl.replaceChildren();
  promptEl.textContent = '';
  await landing;
  if (token !== run) return;
  filled.add(solved.index);
  const { x, y } = scene.carCenter(solved.index);
  burst(x, y);
  speak(item.name);
  promptEl.textContent = item.name[0].toUpperCase() + item.name.slice(1) + '!';

  await pause(1000);
  if (token !== run) return;
  const nextBlank = train.blanks.find((candidate) => !filled.has(candidate.index));
  if (nextBlank) ask(nextBlank);
  else await trainFull(token);
}

async function trainFull(token: number): Promise<void> {
  trainsDone += 1;
  furthest = furthestAfterTrain(furthest, level, trainsDone);
  store.set(FURTHEST_KEY, furthest);
  drawJourney();
  setHint(false);

  const cheer = CHEERS[trainsDone % CHEERS.length];
  promptEl.textContent = cheer;
  speak(cheer);
  scene.whistle(cheer);
  await pause(1100);
  if (token !== run) return;
  await scene.depart();
  if (token !== run) return;
  if (trainsDone >= TRAINS_PER_LEVEL) levelDone();
  else void nextTrain();
}

function levelDone(): void {
  const last = level === MAX_LEVEL;
  winTitle.textContent = last ? 'You rode the whole line!' : `Level ${level} done!`;
  nextBtn.textContent = last ? 'Ride again ▶' : 'Next level ▶';
  winPanel.hidden = false;
  nextBtn.focus();
  burst(window.innerWidth / 2, window.innerHeight / 3, 28);
  speak(last ? 'Wow! You rode the whole line!' : `You did it! Level ${level} is done!`);
}

async function nextTrain(): Promise<void> {
  const token = ++run;
  endChant();
  train = makeTrain(level, Math.random, train?.themeId);
  filled = new Set();
  blank = null;
  setHint(false);
  optionsEl.replaceChildren();
  promptEl.textContent = '';
  scene.show(train);
  await scene.arrive();
  if (token !== run) return;
  ask(train.blanks[0]);
}

function startLevel(chosen: number): void {
  level = chosen;
  trainsDone = 0;
  picker.hidden = true;
  winPanel.hidden = true;
  drawJourney();
  speak('All aboard!');
  void nextTrain();
}

function drawLevels(): void {
  levelsEl.replaceChildren(
    ...LEVEL_PREVIEWS.map((preview, i) => {
      const number = i + 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn level-tile${number === furthest ? ' furthest' : ''}`;
      button.setAttribute('aria-label', `Level ${number}`);
      button.innerHTML = `<span class="level-name">Level ${number}</span><span class="level-sample" aria-hidden="true">${preview}</span>`;
      button.addEventListener('click', () => startLevel(number));
      return button;
    }),
  );
}

function openPicker(): void {
  endChant();
  stopSpeaking();
  drawLevels();
  aboardBtn.textContent = `All aboard! Level ${furthest}`;
  pickerClose.hidden = train === null || winPanel.hidden === false;
  winPanel.hidden = true;
  picker.hidden = false;
  aboardBtn.focus();
}

byId('topbar').prepend(homeButton());
levelBtn.addEventListener('click', openPicker);
sayBtn.addEventListener('click', toggleChant);
hintBtn.addEventListener('click', () => setHint(!hintOn));
aboardBtn.addEventListener('click', () => startLevel(furthest));
pickerClose.addEventListener('click', () => {
  picker.hidden = true;
});
byId('win-levels').addEventListener('click', openPicker);
nextBtn.addEventListener('click', () => startLevel(level === MAX_LEVEL ? 1 : level + 1));

// Leaving the page or the tab shouldn't leave a voice chanting in an empty room.
window.addEventListener('pagehide', stopSpeaking);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    endChant();
    stopSpeaking();
  }
});

drawJourney();
openPicker();
