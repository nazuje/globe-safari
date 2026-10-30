import '@playroom/kit/kit.css';
import './style.css';
import { burst, homeButton, store, stopSpeaking } from '@playroom/kit';
import { createBeat } from './beat.ts';
import { MOVES, type Move } from './moves.ts';
import { createPlayer, type Player } from './player.ts';
import { retryVoice, say } from './say.ts';
import { gameScript, type Mode } from './script.ts';
import { buildMenu, byId, COUNTS, MODES, renderParty, renderStep, setBeatToggle, setPaused, setProgress, showScreen } from './view.ts';
import { createWakeLock } from './wakeLock.ts';

const PARTY_BURSTS = 5;
const PARTY_BURST_GAP_MS = 500;
const PARTY_BUTTON_DELAY_MS = 2500;

const savedMode = store.get<Mode>('animal-moves:mode', 'follow');
const savedCount = store.get<number>('animal-moves:count', 6);
let mode: Mode = MODES.some((info) => info.id === savedMode) ? savedMode : 'follow';
let count: number = COUNTS.some((option) => option === savedCount) ? savedCount : 6;
let beatOn = store.get('animal-moves:beat', true);

const beat = createBeat(beatOn);
const wakeLock = createWakeLock();

let player: Player | null = null;
let lastMoves: string[] = [];
let barFrame = 0;
let partyTimers: ReturnType<typeof setTimeout>[] = [];
let partyVoice: AbortController | null = null;

function trackBar(): void {
  if (!player) return;
  setProgress(player.progress());
  barFrame = requestAnimationFrame(trackBar);
}

function clearParty(): void {
  partyTimers.forEach(clearTimeout);
  partyTimers = [];
  partyVoice?.abort();
  partyVoice = null;
}

function endPlayer(): void {
  cancelAnimationFrame(barFrame);
  player = null;
  setPaused(false);
  wakeLock.release();
}

function celebrate(moves: Move[]): void {
  lastMoves = moves.map((move) => move.id);
  endPlayer();
  renderParty(moves);
  showScreen('party');
  partyVoice = new AbortController();
  void say('You did it! High five!', partyVoice.signal);
  for (let i = 0; i < PARTY_BURSTS; i++) {
    const fire = () => burst(innerWidth * (0.2 + Math.random() * 0.6), innerHeight * (0.2 + Math.random() * 0.4), 24);
    partyTimers.push(setTimeout(fire, i * PARTY_BURST_GAP_MS));
  }
  // The button waits, so a child still mashing the screen can't start a new game by accident.
  partyTimers.push(
    setTimeout(() => {
      byId('party-actions').hidden = false;
    }, PARTY_BUTTON_DELAY_MS),
  );
}

function startGame(): void {
  if (player) return;
  clearParty();
  retryVoice();
  beat.unlock();
  wakeLock.hold();
  showScreen('stage');
  setProgress(0);
  player = createPlayer(gameScript(mode, MOVES, count, Math.random, lastMoves), {
    say,
    beatOn: () => beat.start(),
    beatOff: () => beat.stop(),
    render: (step) => renderStep(step, (move) => player?.choose(move.id)),
    finished: celebrate,
  });
  player.start();
  trackBar();
}

function stopGame(): void {
  player?.stop();
  endPlayer();
  showScreen('menu');
}

function pause(quiet = false): void {
  player?.pause({ quiet });
  setPaused(player?.isPaused() ?? false);
}

function resume(): void {
  player?.resume();
  setPaused(player?.isPaused() ?? false);
}

const markMenu = buildMenu(
  (chosen) => {
    mode = chosen;
    store.set('animal-moves:mode', chosen);
    markMenu(mode, count);
  },
  (chosen) => {
    count = chosen;
    store.set('animal-moves:count', chosen);
    markMenu(mode, count);
  },
);

markMenu(mode, count);
setBeatToggle(beatOn);
byId('topbar').prepend(homeButton());

byId('go').addEventListener('click', startGame);
byId('again').addEventListener('click', startGame);
byId('pause').addEventListener('click', () => pause());
byId('resume').addEventListener('click', resume);
byId('repeat').addEventListener('click', () => player?.repeat());
byId('stop').addEventListener('click', stopGame);
byId('menu-say').addEventListener('click', () => {
  partyVoice?.abort();
  partyVoice = new AbortController();
  void say('Tap Go!', partyVoice.signal);
});
byId('to-menu').addEventListener('click', () => {
  clearParty();
  showScreen('menu');
});
byId('beat-toggle').addEventListener('click', () => {
  beatOn = !beatOn;
  store.set('animal-moves:beat', beatOn);
  setBeatToggle(beatOn);
  beat.setEnabled(beatOn);
});

// If the tablet locks or the tab changes, hold everything until someone taps play.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(true);
  else if (player) wakeLock.hold();
});

window.addEventListener('pagehide', () => {
  pause(true);
  clearParty();
  stopSpeaking();
});
